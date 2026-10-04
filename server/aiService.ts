import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './db.js';
import crypto from 'crypto';

/**
 * Servicio de Inteligencia Artificial para el Asistente de WhatsApp
 * Motor híbrido inteligente:
 * 1. Base de datos Supabase determinista (100% confiable e inmune a caídas o cuotas de IA).
 * 2. Asistente Gemini para lenguaje natural.
 * 3. Fallbacks automáticos contextuales si la IA se queda sin cuota (429) o sufre caídas (503).
 */

export async function processPatientMessage(
  incomingText: string,
  whatsappJid: string,
  appUrl: string
): Promise<string> {
  // 1. Obtener configuración del sistema y de la clínica
  const [sysConfig, clinic] = await Promise.all([
    prisma.systemConfig.findFirst() || prisma.systemConfig.create({ data: {} }),
    prisma.clinicConfig.findFirst() || prisma.clinicConfig.create({ data: {} })
  ]);

  // Variables de contexto
  let dniFound: string | null = null;
  let foundPatient: any = null;
  let generatedBookingUrl = '';
  let patientContext = '';

  try {
    // 2. Detectar si el mensaje contiene un DNI numérico (de 6 a 10 dígitos)
    const dniMatch = incomingText.replace(/\./g, '').match(/\b(\d{6,10})\b/);
    dniFound = dniMatch ? dniMatch[1] : null;

    if (dniFound) {
      // Consultar paciente directamente en la base de datos por DNI
      foundPatient = await prisma.patient.findUnique({
        where: { dni: dniFound },
        include: {
          appointments: {
            where: { status: { in: ['SCHEDULED', 'CONFIRMED'] } },
            orderBy: { date: 'asc' },
            take: 1
          }
        }
      });

      // Si existe y cambió de teléfono o no tenía whatsappJid, lo actualizamos
      if (foundPatient && foundPatient.whatsappJid !== whatsappJid) {
        await prisma.patient.update({
          where: { id: foundPatient.id },
          data: { whatsappJid }
        }).catch(() => {});
      }

      // Crear token de reserva de un solo uso válido por 30 minutos
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await prisma.bookingToken.create({
        data: {
          id: token,
          dni: dniFound,
          whatsappJid,
          isNewPatient: !foundPatient,
          expiresAt
        }
      });

      generatedBookingUrl = `${appUrl}/reservar?token=${token}`;

      if (!foundPatient) {
        patientContext = `[ESTADO DEL PACIENTE]: DNI ${dniFound} es un PACIENTE NUEVO (no registrado). Dale una cordial bienvenida, infórmale que le dejas el siguiente enlace exclusivo válido por 30 minutos para registrarse y seleccionar el día y horario que prefiera: ${generatedBookingUrl}`;
      } else {
        const nextAppt = foundPatient.appointments[0];
        if (nextAppt) {
          patientContext = `[ESTADO DEL PACIENTE]: DNI ${dniFound} corresponde a "${foundPatient.name}". YA TIENE UN TURNO AGENDADO para el día ${nextAppt.date} a las ${nextAppt.time} hs con ${clinic.doctorName}. Salúdalo por su nombre, recuérdale su turno existente y pregúntale si desea confirmarlo (respondiendo 1) o cancelarlo/reprogramarlo (respondiendo 2).`;
        } else {
          patientContext = `[ESTADO DEL PACIENTE]: DNI ${dniFound} corresponde a "${foundPatient.name}" (paciente registrado sin turnos pendientes). Salúdalo por su nombre y proporciónale el enlace exclusivo para que elija día y horario: ${generatedBookingUrl}`;
        }
      }
    } else {
      // Si no envió DNI, verificar si ya conocemos a este paciente por su JID de WhatsApp
      foundPatient = await prisma.patient.findFirst({
        where: { whatsappJid },
        include: {
          appointments: {
            where: { status: { in: ['SCHEDULED', 'CONFIRMED'] } },
            orderBy: { date: 'asc' },
            take: 1
          }
        }
      });

      if (foundPatient) {
        const nextAppt = foundPatient.appointments[0];
        if (nextAppt) {
          patientContext = `[ESTADO DEL PACIENTE CONOCIDO]: El paciente que escribe es "${foundPatient.name}" (DNI ${foundPatient.dni}). Tiene un turno agendado para el día ${nextAppt.date} a las ${nextAppt.time} hs. Si saluda o consulta, salúdalo por su nombre y pregúntale si desea confirmarlo o cancelarlo.`;
        }
      }
    }

    // 3. System Prompt Médico
    const systemInstruction = `
Eres el asistente virtual oficial de "${clinic.clinicName}".
${sysConfig.systemPrompt}

DATOS DEL CONSULTORIO:
- Nombre: ${clinic.clinicName}
- Profesional a cargo: ${clinic.doctorName}
- Especialidad: ${clinic.specialty}
- Dirección: ${clinic.address}, ${clinic.city}
- Horarios de atención: ${clinic.workingHours}
- Obras Sociales y Prepagas aceptadas: ${clinic.insurances}
- Teléfono de contacto: ${clinic.phone}

REGLAS DE ATENCIÓN:
1. Sé cálido, conciso y profesional.
2. Si el usuario saluda o pregunta información general (horarios, ubicación, obras sociales), responde con amabilidad.
3. Si el usuario solicita un turno y aún no ha facilitado su DNI, pídele amablemente su número de DNI.
4. Si abajo se incluye el [ESTADO DEL PACIENTE], responde exactamente con esa información confirmada de la clínica.
5. Muestra los enlaces web como URL limpias (ejemplo: https://...). No uses corchetes markdown [texto](url).
`;

    // 4. Intento con Google Gemini AI
    if (sysConfig.geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(sysConfig.geminiApiKey);
        // Intentar con gemini-flash-latest o gemini-3.5-flash
        const modelNames = ['gemini-flash-latest', 'gemini-3.5-flash'];
        for (const mName of modelNames) {
          try {
            const model = genAI.getGenerativeModel({
              model: mName,
              systemInstruction: `${systemInstruction}\n\n${patientContext}`
            });
            const res = await model.generateContent(`Mensaje del paciente: "${incomingText}"`);
            const text = res.response.text();
            if (text && text.trim().length > 0) {
              return text.trim();
            }
          } catch (modelErr: any) {
            console.warn(`[AI Service] Modelo ${mName} no disponible: ${modelErr?.message || modelErr}`);
            // Continuar al siguiente modelo o fallback
          }
        }
      } catch (aiErr) {
        console.warn('[AI Service] Error al invocar API de Gemini:', aiErr);
      }
    }

    // 5. MOTOR DETERMINISTA DE RESPALDO (Garantía de respuesta perfecta 24/7)
    return getDeterministicResponse(dniFound, foundPatient, generatedBookingUrl, clinic);

  } catch (error) {
    console.error('[AI Service Error Fatal]:', error);
    return getDeterministicResponse(dniFound, foundPatient, generatedBookingUrl, clinic);
  }
}

/**
 * Generador de respuestas deterministas basadas en el estado real de la base de datos.
 * Funciona de manera instantánea, sin depender de servicios externos ni cuotas de API.
 */
function getDeterministicResponse(
  dniFound: string | null,
  foundPatient: any,
  generatedBookingUrl: string,
  clinic: any
): string {
  // Caso 1: Se detectó un DNI y el paciente tiene un turno agendado
  if (dniFound && foundPatient && foundPatient.appointments && foundPatient.appointments[0]) {
    const appt = foundPatient.appointments[0];
    return `¡Hola, ${foundPatient.name}! 👋\n\nVerificamos tu DNI ${dniFound} en el sistema y confirmamos que ya tienes un turno agendado:\n\n📅 *Fecha:* ${appt.date}\n⏰ *Hora:* ${appt.time} hs\n👨‍⚕️ *Profesional:* ${clinic.doctorName}\n📍 *Dirección:* ${clinic.address}, ${clinic.city}\n\n¿Deseas confirmar tu asistencia o necesitas cancelarlo / reprogramarlo?\n👉 Responde *1* para Confirmar\n👉 Responde *2* para Cancelar y elegir nueva fecha`;
  }

  // Caso 2: Se detectó un DNI, el paciente existe pero NO tiene turnos pendientes
  if (dniFound && foundPatient && generatedBookingUrl) {
    return `¡Hola, ${foundPatient.name}! 👋\n\nEncontramos tu ficha médica registrada en ${clinic.clinicName} (DNI ${dniFound}). Actualmente no tienes ningún turno pendiente.\n\nPuedes elegir el día y horario que prefieras ingresando a este enlace exclusivo (válido por 30 minutos):\n\n🔗 ${generatedBookingUrl}`;
  }

  // Caso 3: Se detectó un DNI y es un PACIENTE NUEVO (no registrado)
  if (dniFound && !foundPatient && generatedBookingUrl) {
    return `¡Hola! Bienvenido/a a ${clinic.clinicName}. 👋\n\nVerificamos el DNI ${dniFound} y aún no estás registrado/a en nuestra base de datos.\n\nPara completar tu registro y reservar tu turno en el día y horario que prefieras, ingresa al siguiente enlace (válido por 30 minutos):\n\n🔗 ${generatedBookingUrl}`;
  }

  // Caso 4: Paciente conocido que escribió sin poner DNI pero ya tiene turno
  if (!dniFound && foundPatient && foundPatient.appointments && foundPatient.appointments[0]) {
    const appt = foundPatient.appointments[0];
    return `¡Hola, ${foundPatient.name}! 👋 Qué gusto saludarte.\n\nTe recordamos que tienes un turno agendado para el ${appt.date} a las ${appt.time} hs con ${clinic.doctorName}.\n\n¿En qué podemos ayudarte hoy? (Responde *1* para confirmar o *2* para cancelar).`;
  }

  // Caso 5: Mensaje general (saludo o consulta)
  return `¡Hola! Gracias por comunicarte con ${clinic.clinicName}. 👋\n\n¿En qué podemos ayudarte hoy?\n\nSi deseas solicitar un turno o consultar tus reservas, por favor facilítanos tu número de *DNI* y te brindaremos tu enlace de reserva de inmediato.`;
}
