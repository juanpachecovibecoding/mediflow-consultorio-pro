# Consultorio-Pro | Sistema Médico & Odontológico Single-Tenant

Plataforma médica y odontológica integral diseñada para consultorios individuales, con embudo de reservas exclusivo por WhatsApp potenciado por Google Gemini AI, enlaces de reserva de un solo uso (*Magic Links*), persistencia en Supabase (PostgreSQL) y compatible con la capa gratis de Render.

---

## 🌟 Características Principales

1. **Embudo Exclusivo por WhatsApp:**
   - La landing page médica presenta los servicios y al profesional con llamada a la acción hacia WhatsApp (sin agenda pública abierta).
   - El asistente Google Gemini (`gemini-2.0-flash`) atiende con empatía, responde consultas sobre tratamientos y solicita el DNI para verificar al paciente.
   - Si no está registrado o no tiene turno, genera un **enlace de reserva de un solo uso** (*Magic Link*) válido por 30 minutos.
   - En la pantalla de reserva, el paciente selecciona día, horario y confirma el número de WhatsApp para notificaciones. Una vez reservado, el enlace se invalida automáticamente (*quemado*).

2. **Módulo de Recordatorios Inteligentes Antispam:**
   - Envío de recordatorios automáticos 24 horas antes del turno.
   - **Hora de inicio configurable:** Puedes definir a qué hora arranca el envío diario (ej. `09:00 AM`).
   - **Intervalo aleatorio humanizado (Anti-Ban):** Rango de espera aleatorio entre cada mensaje (ej. entre 10 y 18 minutos) para emular el comportamiento humano y evitar detecciones de spam por parte de Meta.
   - **Interacción directa:** El paciente puede responder `1️⃣` para confirmar su asistencia o `2️⃣` para cancelar y recibir un nuevo enlace para reprogramar.

3. **Arquitectura $0 (Render Free + Supabase):**
   - **Base de Datos:** PostgreSQL en Supabase (Capa gratuita para siempre).
   - **Persistencia de WhatsApp:** Las credenciales de sesión de Baileys se guardan en la tabla `WhatsAppSession` de Supabase. Si Render reinicia el contenedor, **WhatsApp se reconecta solo al instante sin pedir escanear el QR otra vez**.
   - **Keep-Alive:** Mecanismo interno de auto-ping cada 10 minutos al endpoint `/api/health` para evitar que Render suspenda la instancia por inactividad.

4. **Panel de Control con 3 Roles:**
   - 👑 **SuperAdmin:** Gestión de la API Key de Google Gemini, modelo de IA, prompt maestro del bot e interruptor de emergencia.
   - 👨‍⚕️ **Administrador (Doctor):** Agenda del consultorio, bloqueo de fechas u horarios por vacaciones, listado de pacientes, configuración de la clínica y vinculación del QR de WhatsApp.
   - 📋 **Asistente (Secretaría):** Vista simplificada de la agenda del día, control de asistencia y pacientes.

---

## 🚀 Despliegue en Render (Paso a Paso)

### 1. Crear la Base de Datos en Supabase (Gratis)
1. Ve a [Supabase.com](https://supabase.com) y crea un nuevo proyecto gratuito.
2. Copia la cadena de conexión de PostgreSQL desde **Settings > Database > Connection String (URI)**.
   - Asegúrate de seleccionar el modo `Transaction` o `Session` (generalmente puerto `5432` o `6543` con pooler).

### 2. Crear el Web Service en Render
1. Conecta tu repositorio de GitHub en [Render.com](https://render.com).
2. Selecciona **New Web Service**.
3. Configuración:
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npx prisma db push && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** `Free`

### 3. Variables de Entorno en Render
En la pestaña **Environment** de tu servicio en Render, agrega:
- `DATABASE_URL`: Cadena de conexión de tu base de datos Supabase.
- `SUPERADMIN_SECRET`: Tu clave secreta para el panel SuperAdmin (ej. `superadmin123`).
- `GEMINI_API_KEY`: Tu clave de Google AI Studio (puedes cargarla aquí o desde el panel SuperAdmin).
- `APP_URL`: La URL pública que te asigne Render (ej. `https://mi-consultorio.onrender.com`).
- `PORT`: `3000`
- `NODE_ENV`: `production`

¡Listo! El servicio se compilará, aplicará las tablas en Supabase y comenzará a atender pacientes.
