import express from 'express';
import cors from 'cors';
import path from 'path';
import crypto from 'crypto';
import pino from 'pino';
import QRCode from 'qrcode';
import { Boom } from '@hapi/boom';
import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys';
import { prisma } from './db.js';
import { usePrismaAuthState } from './baileysAuth.js';
import { processPatientMessage } from './aiService.js';
import { checkAndProcessReminders } from './reminderQueue.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// 1. Keep-Alive / Health Check para Render Free ($0)
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auto-Ping cada 10 minutos para evitar que Render ponga a dormir el servicio
setInterval(async () => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.APP_URL) {
      await fetch(`${process.env.APP_URL}/api/health`).catch(() => {});
    }
  } catch (e) {}
}, 10 * 60 * 1000);

// -------------------------------------------------------------
// 2. WhatsApp Bot Engine (Baileys con Persistencia en Supabase)
// -------------------------------------------------------------
interface BotState {
  status: 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'CONNECTED';
  qr: string | null;
  botActive: boolean;
  messagesSent: number;
}

const botState: BotState = {
  status: 'DISCONNECTED',
  qr: null,
  botActive: true,
  messagesSent: 0
};

let activeSock: any = null;
let isExplicitLogout = false;

async function startWhatsApp() {
  if (botState.status === 'CONNECTED' || botState.status === 'INITIALIZING') return;

  isExplicitLogout = false;
  botState.status = 'INITIALIZING';
  const logger = pino({ level: 'silent' });
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await usePrismaAuthState('clinic_main');

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false
  });

  activeSock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      botState.status = 'QR_READY';
      try {
        botState.qr = await QRCode.toDataURL(qr);
      } catch (err) {
        console.error('[WhatsApp QR Error]:', err);
      }
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !isExplicitLogout;
      botState.status = 'DISCONNECTED';

      if (shouldReconnect) {
        console.log('[WhatsApp] Desconectado temporalmente. Reconectando en 5 segundos...');
        setTimeout(startWhatsApp, 5000);
      } else {
        console.log('[WhatsApp] Sesión cerrada permanentemente.');
        botState.qr = null;
        activeSock = null;
      }
    } else if (connection === 'open') {
      botState.status = 'CONNECTED';
      botState.qr = null;
      console.log('[WhatsApp] ¡Conectado exitosamente y listo para atender pacientes!');
    }
  });

  // Escuchar mensajes entrantes de pacientes
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.includes('@g.us') || remoteJid.includes('@broadcast')) continue;

      const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;
      if (!textMessage) continue;

      // 1. Detección interactiva de respuestas a recordatorios y confirmación/cancelación de turnos
      const trimmed = textMessage.trim().toLowerCase();
      const isConfirming = trimmed === '1' || trimmed.startsWith('1 ') || trimmed === '1️⃣' || 
                           trimmed.includes('si asisto') || trimmed.includes('confirmo') || 
                           trimmed.includes('confirmar') || trimmed === 'si';
      const isCancelling = trimmed === '2' || trimmed.startsWith('2 ') || trimmed === '2️⃣' || 
                           trimmed.includes('no puedo') || trimmed.includes('reagendar') || 
                           trimmed.includes('cancelo') || trimmed.includes('cancelar') || 
                           trimmed.includes('cancela') || trimmed.includes('cancelá');

      if (isConfirming || isCancelling) {
        const phoneDigits = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
        // Buscar paciente por teléfono o JID
        const patient = await prisma.patient.findFirst({
          where: {
            OR: [
              { phone: { contains: phoneDigits } },
              { whatsappJid: remoteJid }
            ]
          },
          include: {
            appointments: {
              where: { status: { in: ['SCHEDULED', 'CONFIRMED'] } },
              orderBy: { date: 'asc' },
              take: 1
            }
          }
        });

        if (patient && patient.appointments[0]) {
          const appt = patient.appointments[0];
          const clinic = await prisma.clinicConfig.findFirst();

          if (isConfirming) {
            await prisma.appointment.update({
              where: { id: appt.id },
              data: { status: 'CONFIRMED', reminderResponse: 'CONFIRMED' }
            });
            await sock.sendMessage(remoteJid, {
              text: `✅ ¡Excelente ${patient.name}! Tu turno del ${appt.date} a las ${appt.time} hs con el ${clinic?.doctorName} ha sido RECONFIRMADO. Te esperamos en ${clinic?.address}.`
            });
            botState.messagesSent += 1;
            continue;
          } else if (isCancelling) {
            await prisma.appointment.update({
              where: { id: appt.id },
              data: { status: 'CANCELLED', reminderResponse: 'CANCELLED' }
            });

            // Generar nuevo enlace de reserva para que el paciente pueda reagendar si lo desea
            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
            await prisma.bookingToken.create({
              data: {
                id: token,
                dni: patient.dni,
                whatsappJid: remoteJid,
                isNewPatient: false,
                expiresAt
              }
            });
            const newLink = `${APP_URL}/reservar?token=${token}`;

            await sock.sendMessage(remoteJid, {
              text: `Comprendido ${patient.name}. Hemos cancelado tu turno del ${appt.date} a las ${appt.time} hs y liberado el horario en la agenda médica.\n\nSi deseas elegir un nuevo día y horario disponible, puedes hacerlo desde este enlace (válido por 30 minutos):\n${newLink}`
            });
            botState.messagesSent += 1;
            continue;
          }
        }
      }

      // 2. Procesamiento con Asistente Gemini AI
      try {
        await sock.presenceSubscribe(remoteJid);
        await sock.sendPresenceUpdate('composing', remoteJid);

        const reply = await processPatientMessage(textMessage, remoteJid, APP_URL);

        await sock.sendPresenceUpdate('paused', remoteJid);
        if (reply && reply.trim()) {
          console.log(`[WhatsApp] Enviando respuesta a ${remoteJid}: "${reply.substring(0, 60)}..."`);
          await sock.sendMessage(remoteJid, { text: reply.trim() });
          botState.messagesSent += 1;
        } else {
          console.warn('[WhatsApp] Se omitió respuesta vacía para:', remoteJid);
        }
      } catch (err) {
        console.error('[Message Processing Error]:', err);
      }
    }
  });
}

// -------------------------------------------------------------
// 3. Endpoints Públicos de la Clínica & Reserva
// -------------------------------------------------------------

// Obtener datos de la clínica y servicios para la Landing Page
app.get('/api/public/clinic', async (req, res) => {
  try {
    let clinic = await prisma.clinicConfig.findFirst();
    if (!clinic) {
      clinic = await prisma.clinicConfig.create({ data: {} });
    }
    const services = await prisma.service.findMany({ where: { active: true } });
    res.json({ clinic, services });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Validar Token de Reserva de un solo uso
app.get('/api/booking/validate-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const bookingToken = await prisma.bookingToken.findUnique({
      where: { id: token }
    });

    if (!bookingToken) {
      return res.status(404).json({ valid: false, reason: 'NOT_FOUND', message: 'El enlace de reserva no existe.' });
    }

    if (bookingToken.used) {
      return res.status(400).json({ valid: false, reason: 'ALREADY_USED', message: 'Este enlace de reserva ya ha sido utilizado.' });
    }

    if (new Date() > bookingToken.expiresAt) {
      return res.status(400).json({ valid: false, reason: 'EXPIRED', message: 'El enlace de reserva ha expirado (validez de 30 minutos). Por favor solicita uno nuevo por WhatsApp.' });
    }

    // Buscar si el paciente ya existe para precargar datos
    const patient = await prisma.patient.findUnique({
      where: { dni: bookingToken.dni }
    });

    const services = await prisma.service.findMany({ where: { active: true } });
    const clinic = await prisma.clinicConfig.findFirst();

    res.json({
      valid: true,
      token: bookingToken.id,
      dni: bookingToken.dni,
      isNewPatient: bookingToken.isNewPatient,
      patient: patient ? { name: patient.name, phone: patient.phone, healthInsurance: patient.healthInsurance } : null,
      services,
      clinic
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener Slots / Horarios disponibles para una fecha específica
app.get('/api/booking/available-slots', async (req, res) => {
  try {
    const { date } = req.query as { date: string };
    if (!date) return res.status(400).json({ error: 'Fecha requerida (YYYY-MM-DD)' });

    // Verificar si el día completo está bloqueado
    const fullDayBlock = await prisma.scheduleBlock.findFirst({
      where: { date, time: null }
    });
    if (fullDayBlock) {
      return res.json({ availableSlots: [], reason: fullDayBlock.reason || 'Día no laboral' });
    }

    // Horarios estándar de consultorio (30 min)
    const allSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
    ];

    // Citas existentes para ese día
    const booked = await prisma.appointment.findMany({
      where: {
        date,
        status: { in: ['SCHEDULED', 'CONFIRMED'] }
      },
      select: { time: true }
    });
    const bookedTimes = new Set(booked.map(b => b.time));

    // Slots individuales bloqueados
    const blockedSlots = await prisma.scheduleBlock.findMany({
      where: { date, time: { not: null } },
      select: { time: true }
    });
    const blockedTimes = new Set(blockedSlots.map(b => b.time));

    const availableSlots = allSlots.filter(s => !bookedTimes.has(s) && !blockedTimes.has(s));

    res.json({ availableSlots });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Confirmar Reserva y Quemas el Token (Un solo uso)
app.post('/api/booking/confirm', async (req, res) => {
  try {
    const { token, dni, name, phone, healthInsurance, serviceId, date, time } = req.body;

    // 1. Validar Token de un solo uso
    const bookingToken = await prisma.bookingToken.findUnique({
      where: { id: token }
    });

    if (!bookingToken || bookingToken.used || new Date() > bookingToken.expiresAt) {
      return res.status(400).json({ error: 'El enlace de reserva es inválido o ha caducado.' });
    }

    // 2. Dar de alta o actualizar ficha de paciente
    const patient = await prisma.patient.upsert({
      where: { dni },
      create: {
        dni,
        name,
        phone,
        whatsappJid: bookingToken.whatsappJid,
        healthInsurance: healthInsurance || null
      },
      update: {
        name,
        phone,
        whatsappJid: bookingToken.whatsappJid,
        healthInsurance: healthInsurance || null
      }
    });

    // 3. Crear el turno
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        serviceId: serviceId || null,
        date,
        time,
        status: 'CONFIRMED'
      },
      include: {
        service: true
      }
    });

    // 4. Invalidad el token (quemado)
    await prisma.bookingToken.update({
      where: { id: token },
      data: {
        used: true,
        usedAt: new Date()
      }
    });

    const clinic = await prisma.clinicConfig.findFirst();

    // 5. Enviar mensaje inmediato de confirmación por WhatsApp si está conectado
    if (activeSock && bookingToken.whatsappJid) {
      const serviceText = appointment.service?.name ? ` para ${appointment.service.name}` : '';
      activeSock.sendMessage(bookingToken.whatsappJid, {
        text: `🎉 ¡Turno Confirmado con éxito!\n\nEstimado/a ${patient.name}, tu turno${serviceText} ha quedado reservado para el ${date} a las ${time} hs con el ${clinic?.doctorName}.\n📍 Dirección: ${clinic?.address}, ${clinic?.city}.\n\nTe enviaremos un recordatorio 24 horas antes. ¡Te esperamos!`
      }).catch(console.error);
    }

    res.json({
      success: true,
      appointment,
      patient
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 4. Autenticación y Gestión de Usuarios (Login & SuperAdmin)
// -------------------------------------------------------------

// Login universal para el /panel (SuperAdmin, Doctor/Admin y Asistente)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Por favor ingresa usuario y contraseña.' });
    }

    const cleanUser = username.trim().toLowerCase();

    // 1. Acceso SuperAdmin Maestro
    if (cleanUser === 'superadmin') {
      const config = await prisma.systemConfig.findFirst();
      const validPin = config?.superAdminPin || 'superadmin123';
      if (password === validPin) {
        return res.json({
          success: true,
          user: {
            id: 'superadmin',
            username: 'superadmin',
            name: 'SuperAdmin Master',
            role: 'superadmin'
          }
        });
      } else {
        return res.status(401).json({ error: 'PIN o contraseña de SuperAdmin incorrecta.' });
      }
    }

    // 2. Acceso Usuarios de la Clínica (Doctor y Asistente)
    const user = await prisma.user.findUnique({
      where: { username: cleanUser }
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Este usuario ha sido desactivado. Consulta con soporte.' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Listar Usuarios (Exclusivo SuperAdmin)
app.get('/api/admin/users', async (req, res) => {
  try {
    const pin = req.headers['x-admin-pin'];
    const config = await prisma.systemConfig.findFirst();
    if (config && pin !== config.superAdminPin) {
      return res.status(401).json({ error: 'PIN de SuperAdmin no autorizado.' });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear Usuario (Exclusivo SuperAdmin)
app.post('/api/admin/users', async (req, res) => {
  try {
    const pin = req.headers['x-admin-pin'];
    const config = await prisma.systemConfig.findFirst();
    if (config && pin !== config.superAdminPin) {
      return res.status(401).json({ error: 'PIN de SuperAdmin no autorizado.' });
    }

    const { username, password, name, role } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Nombre, usuario y contraseña son requeridos.' });
    }

    const cleanUser = username.trim().toLowerCase();
    if (cleanUser === 'superadmin') {
      return res.status(400).json({ error: 'El nombre "superadmin" está reservado para el SuperAdmin.' });
    }

    const existing = await prisma.user.findUnique({ where: { username: cleanUser } });
    if (existing) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
    }

    const newUser = await prisma.user.create({
      data: {
        username: cleanUser,
        password,
        name,
        role: role === 'admin' ? 'admin' : 'asistente'
      }
    });

    res.json({ success: true, user: newUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar Usuario (Exclusivo SuperAdmin: Cambiar rol, contraseña, nombre, activo)
app.patch('/api/admin/users/:id', async (req, res) => {
  try {
    const pin = req.headers['x-admin-pin'];
    const config = await prisma.systemConfig.findFirst();
    if (config && pin !== config.superAdminPin) {
      return res.status(401).json({ error: 'PIN de SuperAdmin no autorizado.' });
    }

    const { id } = req.params;
    const { name, username, password, role, active } = req.body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (username !== undefined) data.username = username.trim().toLowerCase();
    if (password) data.password = password;
    if (role !== undefined) data.role = role === 'admin' ? 'admin' : 'asistente';
    if (active !== undefined) data.active = Boolean(active);

    const updated = await prisma.user.update({
      where: { id },
      data
    });

    res.json({ success: true, user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar Usuario (Exclusivo SuperAdmin)
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const pin = req.headers['x-admin-pin'];
    const config = await prisma.systemConfig.findFirst();
    if (config && pin !== config.superAdminPin) {
      return res.status(401).json({ error: 'PIN de SuperAdmin no autorizado.' });
    }

    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar WhatsApp
app.post('/api/admin/whatsapp/start', async (req, res) => {
  await startWhatsApp();
  res.json({ status: botState.status, qr: botState.qr });
});

// Cerrar Sesión de WhatsApp y Eliminar Credenciales (Permite regenerar QR y solucionar fallos)
app.post('/api/admin/whatsapp/logout', async (req, res) => {
  try {
    isExplicitLogout = true;
    if (activeSock) {
      try {
        await activeSock.logout().catch(() => {});
        activeSock.end(undefined);
      } catch (e) {}
      activeSock = null;
    }

    // Borrar credenciales de la base de datos Supabase
    await prisma.whatsAppSession.deleteMany({
      where: { id: { startsWith: 'clinic_main' } }
    });

    botState.status = 'DISCONNECTED';
    botState.qr = null;
    console.log('[WhatsApp] Sesión cerrada y credenciales eliminadas de Supabase.');

    // Si se solicitó reiniciar de inmediato (regenerar QR)
    if (req.body.restart) {
      isExplicitLogout = false;
      setTimeout(async () => {
        try {
          await startWhatsApp();
        } catch (err) {
          console.error('[WhatsApp Restart Error]:', err);
        }
      }, 1000);
    }

    res.json({ success: true, status: botState.status, qr: botState.qr });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Estado de WhatsApp
app.get('/api/admin/whatsapp/status', (req, res) => {
  res.json({
    status: botState.status,
    qr: botState.qr,
    botActive: botState.botActive,
    messagesSent: botState.messagesSent
  });
});

// Pausar / Reactivar Bot
app.post('/api/admin/whatsapp/toggle', (req, res) => {
  botState.botActive = !!req.body.active;
  res.json({ botActive: botState.botActive });
});

// Obtener Configuración Técnica (SuperAdmin)
app.get('/api/admin/system-config', async (req, res) => {
  const pin = req.headers['x-admin-pin'];
  const config = await prisma.systemConfig.findFirst();
  if (!config || pin !== config.superAdminPin) {
    return res.status(401).json({ error: 'PIN de SuperAdmin no autorizado.' });
  }
  res.json(config);
});

// Guardar Configuración Técnica (SuperAdmin)
app.post('/api/admin/system-config', async (req, res) => {
  const pin = req.headers['x-admin-pin'];
  let config = await prisma.systemConfig.findFirst();
  if (!config) config = await prisma.systemConfig.create({ data: {} });

  if (pin !== config.superAdminPin) {
    return res.status(401).json({ error: 'PIN de SuperAdmin no autorizado.' });
  }

  const { geminiApiKey, geminiModel, systemPrompt, superAdminPin } = req.body;
  const updated = await prisma.systemConfig.update({
    where: { id: config.id },
    data: {
      geminiApiKey: geminiApiKey ?? config.geminiApiKey,
      geminiModel: geminiModel ?? config.geminiModel,
      systemPrompt: systemPrompt ?? config.systemPrompt,
      superAdminPin: superAdminPin ?? config.superAdminPin
    }
  });

  res.json({ success: true, config: updated });
});

// Obtener Agenda Completa y Pacientes (Doctor & Asistente)
app.get('/api/admin/agenda', async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { patient: true, service: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }]
    });
    const patients = await prisma.patient.findMany({
      orderBy: { name: 'asc' }
    });
    const scheduleBlocks = await prisma.scheduleBlock.findMany();
    const clinic = await prisma.clinicConfig.findFirst();

    res.json({ appointments, patients, scheduleBlocks, clinic });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar Estado de Turno (Confirmar, Cancelar, Atendido)
app.patch('/api/admin/appointments/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar Turno de la Base de Datos (SuperAdmin, Admin, Asistente)
app.delete('/api/admin/appointments/:id', async (req, res) => {
  try {
    await prisma.appointment.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true, message: 'Turno eliminado correctamente.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bloquear / Desbloquear Horario o Día
app.post('/api/admin/schedule-blocks', async (req, res) => {
  try {
    const { date, time, reason } = req.body;
    const block = await prisma.scheduleBlock.create({
      data: { date, time: time || null, reason }
    });
    res.json(block);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/schedule-blocks/:id', async (req, res) => {
  try {
    await prisma.scheduleBlock.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// Endpoints de Gestión Manual de Pacientes (Todos los Roles)
// -------------------------------------------------------------

// Crear Paciente Manualmente
app.post('/api/admin/patients', async (req, res) => {
  try {
    const { dni, name, phone, healthInsurance, email } = req.body;
    if (!dni || !name || !phone) {
      return res.status(400).json({ error: 'DNI, Nombre y Número de WhatsApp son obligatorios.' });
    }

    const cleanDni = dni.trim();
    const existing = await prisma.patient.findUnique({ where: { dni: cleanDni } });
    if (existing) {
      return res.status(400).json({ error: `Ya existe un paciente registrado con el DNI ${cleanDni}.` });
    }

    const patient = await prisma.patient.create({
      data: {
        dni: cleanDni,
        name: name.trim(),
        phone: phone.trim(),
        healthInsurance: healthInsurance?.trim() || 'Particular',
        email: email?.trim() || null
      }
    });

    res.json({ success: true, patient });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Editar Paciente
app.patch('/api/admin/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dni, name, phone, healthInsurance, email } = req.body;

    const current = await prisma.patient.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ error: 'Paciente no encontrado.' });
    }

    const data: any = {};
    if (name) data.name = name.trim();
    if (phone) data.phone = phone.trim();
    if (healthInsurance !== undefined) data.healthInsurance = healthInsurance.trim() || 'Particular';
    if (email !== undefined) data.email = email ? email.trim() : null;

    if (dni && dni.trim() !== current.dni) {
      const cleanDni = dni.trim();
      const existing = await prisma.patient.findUnique({ where: { dni: cleanDni } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: `El DNI ${cleanDni} ya pertenece a otro paciente.` });
      }
      data.dni = cleanDni;
    }

    const updated = await prisma.patient.update({
      where: { id },
      data
    });

    res.json({ success: true, patient: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar Paciente
app.delete('/api/admin/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.patient.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Guardar Configuración de la Clínica & Recordatorios (Exclusivo SuperAdmin)
app.post('/api/admin/clinic-config', async (req, res) => {
  try {
    const pin = req.headers['x-admin-pin'];
    const config = await prisma.systemConfig.findFirst();
    if (config && pin !== config.superAdminPin) {
      return res.status(401).json({ error: 'PIN de SuperAdmin no autorizado para modificar datos de la clínica.' });
    }

    let clinic = await prisma.clinicConfig.findFirst();
    if (!clinic) clinic = await prisma.clinicConfig.create({ data: {} });

    const updated = await prisma.clinicConfig.update({
      where: { id: clinic.id },
      data: req.body
    });
    res.json({ success: true, clinic: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------------------------------------------------
// 5. Cron Job de Recordatorios (Evaluación cada minuto)
// -------------------------------------------------------------
setInterval(() => {
  if (activeSock && botState.status === 'CONNECTED') {
    checkAndProcessReminders(activeSock);
  }
}, 60 * 1000);

// -------------------------------------------------------------
// 6. Servir Frontend (Archivos estáticos compilados)
// -------------------------------------------------------------
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

async function seedInitialUsers() {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      await prisma.user.createMany({
        data: [
          { username: 'admin', password: 'admin123', name: 'Dr. Juan Pérez', role: 'admin' },
          { username: 'secretaria', password: 'secretaria123', name: 'Secretaría de Consultorio', role: 'asistente' }
        ]
      });
      console.log('[Auth] Usuarios iniciales sembrados exitosamente (admin / secretaria).');
    }
  } catch (e) {
    console.error('[Auth Seed Error]:', e);
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`🏥 Consultorio-Pro | Sistema Médico & WhatsApp IA`);
  console.log(`🚀 Servidor en ejecución: ${APP_URL}`);
  console.log(`===================================================`);
  // Sembrar usuarios iniciales si no existen
  seedInitialUsers().catch(console.error);
  // Auto-iniciar conexión de WhatsApp (restaura sesión persistida en Supabase)
  startWhatsApp().catch((err) => console.error('[WhatsApp AutoStart Error]:', err));
});
