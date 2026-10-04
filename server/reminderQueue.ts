import { prisma } from './db.js';

/**
 * Gestor de Recordatorios Inteligentes Antispam
 * - Lee la agenda del día siguiente a la hora configurada (ej. 09:00 hs).
 * - Envía mensajes con delay aleatorio configurable (ej: 10 a 18 minutos) entre cada envío.
 * - Evita baneos de Meta al simular cadencia humana natural.
 */

let isQueueRunning = false;

export async function checkAndProcessReminders(activeSock: any) {
  if (isQueueRunning) return;

  try {
    const clinic = await prisma.clinicConfig.findFirst();
    if (!clinic || !clinic.remindersActive) return;

    if (!activeSock) return;

    // Verificar si la hora actual coincide con la hora configurada de inicio
    const now = new Date();
    const currentHourStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // Comparar hora (solo horas y minutos HH:mm)
    if (currentHourStr !== clinic.remindersStartHour) {
      return;
    }

    // Calcular fecha de mañana (YYYY-MM-DD)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Buscar turnos pendientes de recordatorio para mañana
    const pendingAppointments = await prisma.appointment.findMany({
      where: {
        date: tomorrowStr,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        reminderStatus: 'PENDING'
      },
      include: {
        patient: true,
        service: true
      }
    });

    if (pendingAppointments.length === 0) return;

    console.log(`[Reminders] Iniciando cola de envíos: ${pendingAppointments.length} turnos para mañana (${tomorrowStr})`);
    isQueueRunning = true;

    // Procesar cola en segundo plano
    (async () => {
      try {
        for (const appt of pendingAppointments) {
          const patientPhone = appt.patient.phone.replace(/\D/g, '');
          if (!patientPhone) continue;

          // Verificar si el número existe en WhatsApp
          const waCheck = await activeSock.onWhatsApp(patientPhone);
          if (waCheck && waCheck.length > 0 && waCheck[0].exists) {
            const jid = waCheck[0].jid;
            const serviceName = appt.service?.name ? ` para ${appt.service.name}` : '';
            const msg = `Hola ${appt.patient.name}! 👋 Te recordamos que mañana ${appt.date} tienes un turno a las ${appt.time} hs${serviceName} con el ${clinic.doctorName} en ${clinic.clinicName}.\n\nPor favor confirma tu asistencia respondiendo a este mensaje:\n1️⃣ para CONFIRMAR tu turno.\n2️⃣ para CANCELAR o reprogramar.\n\n¡Muchas gracias!`;

            await activeSock.sendMessage(jid, { text: msg });

            await prisma.appointment.update({
              where: { id: appt.id },
              data: {
                reminderStatus: 'SENT',
                reminderSentAt: new Date()
              }
            });

            console.log(`[Reminders] Recordatorio enviado a ${appt.patient.name} (${patientPhone})`);

            // Calcular delay aleatorio humano (ej. entre 10 y 18 minutos)
            const min = clinic.minRandomDelayMin || 10;
            const max = clinic.maxRandomDelayMin || 18;
            const randomMinutes = Math.floor(Math.random() * (max - min + 1) + min);
            const delayMs = randomMinutes * 60 * 1000;

            console.log(`[Reminders Anti-Ban] Esperando ${randomMinutes} minutos antes del siguiente mensaje...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      } catch (err) {
        console.error('[Reminders Queue Error]:', err);
      } finally {
        isQueueRunning = false;
      }
    })();

  } catch (error) {
    console.error('[Reminders Check Error]:', error);
    isQueueRunning = false;
  }
}
