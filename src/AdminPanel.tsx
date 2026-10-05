import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Settings, 
  Lock, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Bot,
  Building2,
  Phone,
  MapPin,
  Briefcase,
  KeyRound,
  Sparkles,
  Sliders
} from 'lucide-react';

export default function AdminPanel() {
  type Role = 'superadmin' | 'admin' | 'asistente';
  const [role, setRole] = useState<Role>('admin');
  const [activeTab, setActiveTab] = useState<'agenda' | 'pacientes' | 'whatsapp' | 'configuracion' | 'perfil_clinica'>('agenda');

  // Datos de la clínica y agenda
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [clinic, setClinic] = useState<any>({});
  const [waStatus, setWaStatus] = useState<string>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);

  // SuperAdmin Config & Seguridad
  const [superAdminPin, setSuperAdminPin] = useState('superadmin123');
  const [pinInput, setPinInput] = useState('');
  const [isSuperAdminUnlocked, setIsSuperAdminUnlocked] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [newSuperAdminPin, setNewSuperAdminPin] = useState('');
  const [superAdminSubTab, setSuperAdminSubTab] = useState<'clinica' | 'recordatorios' | 'ia'>('clinica');

  const [feedback, setFeedback] = useState('');

  const loadAgenda = async () => {
    try {
      const res = await fetch('/api/admin/agenda');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
        setPatients(data.patients || []);
        if (data.clinic) setClinic(data.clinic);
      }
    } catch (e) {}
  };

  const loadWaStatus = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/status');
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data.status);
        setQrCode(data.qr);
      }
    } catch (e) {}
  };

  const startWhatsApp = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/start', { method: 'POST' });
      const data = await res.json();
      setWaStatus(data.status);
      setQrCode(data.qr);
    } catch (e) {}
  };

  const loadSuperAdminConfig = async (pinToUse: string = superAdminPin) => {
    try {
      const res = await fetch('/api/admin/system-config', {
        headers: { 'x-admin-pin': pinToUse }
      });
      if (res.ok) {
        const data = await res.json();
        setGeminiApiKey(data.geminiApiKey || '');
        setGeminiModel(data.geminiModel || 'gemini-3.8-flash');
        setSystemPrompt(data.systemPrompt || '');
        setNewSuperAdminPin(data.superAdminPin || 'superadmin123');
        setIsSuperAdminUnlocked(true);
        return true;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    loadAgenda();
    loadWaStatus();
    const interval = setInterval(loadWaStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleChange = async (newRole: Role) => {
    if (newRole === 'superadmin') {
      if (!isSuperAdminUnlocked) {
        const success = await loadSuperAdminConfig(superAdminPin);
        if (!success) {
          // Si el PIN por defecto no coincide, pedimos PIN al usuario
          const entered = prompt('🔐 Ingrese el PIN de SuperAdmin:');
          if (entered) {
            const ok = await loadSuperAdminConfig(entered);
            if (ok) {
              setSuperAdminPin(entered);
              setRole('superadmin');
              setActiveTab('configuracion');
              return;
            } else {
              alert('PIN de SuperAdmin incorrecto.');
              return;
            }
          } else {
            return;
          }
        }
      }
      setRole('superadmin');
      setActiveTab('configuracion');
    } else {
      setRole(newRole);
      if (activeTab === 'configuracion') {
        setActiveTab('agenda');
      }
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      loadAgenda();
    } catch (e) {}
  };

  // Guardar datos de la clínica (Exclusivo SuperAdmin)
  const saveClinicDataAsSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/clinic-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': superAdminPin
        },
        body: JSON.stringify(clinic)
      });
      if (res.ok) {
        setFeedback('¡Datos de la clínica y marca actualizados con éxito!');
        setTimeout(() => setFeedback(''), 3500);
      } else {
        alert('Error: PIN de SuperAdmin no autorizado.');
      }
    } catch (e) {
      alert('Error al guardar datos de la clínica.');
    }
  };

  // Guardar configuración técnica de IA (Exclusivo SuperAdmin)
  const saveSuperAdminConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': superAdminPin
        },
        body: JSON.stringify({
          geminiApiKey,
          geminiModel,
          systemPrompt,
          superAdminPin: newSuperAdminPin || superAdminPin
        })
      });
      if (res.ok) {
        if (newSuperAdminPin) setSuperAdminPin(newSuperAdminPin);
        setFeedback('¡Parámetros de IA y seguridad guardados!');
        setTimeout(() => setFeedback(''), 3500);
      } else {
        alert('PIN de SuperAdmin no autorizado.');
      }
    } catch (e) {
      alert('Error al guardar configuración técnica.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Sistema Activo</span>
          </div>
          <h1 className="text-lg font-black tracking-tight text-white line-clamp-1">{clinic.clinicName || 'Consultorio Pro'}</h1>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{clinic.doctorName || 'Dr. Juan Pérez'}</p>
        </div>

        {/* SELECTOR DE ROL */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
            <span>Rol Activo</span>
            {role === 'superadmin' && <span className="text-amber-400 font-mono text-[9px] bg-amber-500/20 px-1.5 py-0.5 rounded">MASTER</span>}
          </label>
          <select 
            value={role}
            onChange={e => handleRoleChange(e.target.value as Role)}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold py-2 px-2.5 rounded-xl outline-none focus:border-teal-500"
          >
            <option value="superadmin">👑 SuperAdmin (Gestión & Venta)</option>
            <option value="admin">👨‍⚕️ Doctor / Cliente (Operativo)</option>
            <option value="asistente">📋 Asistente (Secretaría)</option>
          </select>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="p-4 space-y-1.5 flex-1">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'agenda' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Calendar className="w-5 h-5" /> Agenda de Turnos
          </button>

          <button
            onClick={() => setActiveTab('pacientes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
              activeTab === 'pacientes' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" /> Pacientes
          </button>

          {role !== 'asistente' && (
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'whatsapp' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <QrCode className="w-5 h-5" /> Conexión WhatsApp
            </button>
          )}

          {/* ROL DOCTOR (CLIENTE): PERFIL EN MODO SOLO LECTURA */}
          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('perfil_clinica')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'perfil_clinica' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Building2 className="w-5 h-5" /> Mi Consultorio
            </button>
          )}

          {/* ROL SUPERADMIN: CONTROL TOTAL DE DATOS, MARCA E IA */}
          {role === 'superadmin' && (
            <button
              onClick={() => setActiveTab('configuracion')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'configuracion' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Sliders className="w-5 h-5" /> Panel SuperAdmin
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 text-center">
          <a href="/" className="text-xs text-slate-400 hover:text-white font-semibold transition flex items-center justify-center gap-1.5">
            ← Ver Landing Pública
          </a>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {activeTab === 'agenda' && 'Gestión de Turnos y Agenda'}
              {activeTab === 'pacientes' && 'Base de Pacientes Registrados'}
              {activeTab === 'whatsapp' && 'Conexión y Estado de WhatsApp'}
              {activeTab === 'perfil_clinica' && 'Información de Mi Consultorio'}
              {activeTab === 'configuracion' && 'Panel de Control SuperAdmin (Gestión de Cliente & IA)'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Acceso en modo: <strong className="text-slate-800 uppercase">{role === 'superadmin' ? 'SuperAdmin (Dueño / Desarrollador)' : role === 'admin' ? 'Doctor / Cliente' : 'Secretaría'}</strong>
            </p>
          </div>

          {feedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm animate-fade-in">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {feedback}
            </div>
          )}
        </header>

        {/* 1. TAB: AGENDA */}
        {activeTab === 'agenda' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Próximos Turnos</h3>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Total: {appointments.length}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-6">Fecha / Hora</th>
                    <th className="py-3.5 px-6">Paciente</th>
                    <th className="py-3.5 px-6">DNI</th>
                    <th className="py-3.5 px-6">Teléfono</th>
                    <th className="py-3.5 px-6">Estado</th>
                    <th className="py-3.5 px-6 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                        No hay turnos registrados en la agenda.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6 font-semibold text-slate-900 whitespace-nowrap">
                          {appt.date} <span className="text-teal-600 ml-1">{appt.time} hs</span>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-900">{appt.patient?.name || '—'}</td>
                        <td className="py-4 px-6 font-mono text-xs">{appt.patient?.dni || '—'}</td>
                        <td className="py-4 px-6 text-xs text-slate-500">{appt.patient?.phone || '—'}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            appt.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            appt.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            appt.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {appt.status === 'CONFIRMED' ? 'Confirmado' :
                             appt.status === 'SCHEDULED' ? 'Pendiente' :
                             appt.status === 'CANCELLED' ? 'Cancelado' : appt.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                          {appt.status !== 'CONFIRMED' && (
                            <button
                              onClick={() => updateAppointmentStatus(appt.id, 'CONFIRMED')}
                              className="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg transition"
                            >
                              Confirmar
                            </button>
                          )}
                          {appt.status !== 'CANCELLED' && (
                            <button
                              onClick={() => updateAppointmentStatus(appt.id, 'CANCELLED')}
                              className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition"
                            >
                              Cancelar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. TAB: PACIENTES */}
        {activeTab === 'pacientes' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Directorio de Pacientes</h3>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Total: {patients.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-6">DNI</th>
                    <th className="py-3.5 px-6">Nombre Completo</th>
                    <th className="py-3.5 px-6">WhatsApp / Teléfono</th>
                    <th className="py-3.5 px-6">Obra Social</th>
                    <th className="py-3.5 px-6">Turnos Registrados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                        No hay pacientes registrados aún en la base de datos.
                      </td>
                    </tr>
                  ) : (
                    patients.map((pat) => (
                      <tr key={pat.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6 font-mono text-xs font-bold text-slate-900">{pat.dni}</td>
                        <td className="py-4 px-6 font-medium text-slate-900">{pat.name}</td>
                        <td className="py-4 px-6 text-xs text-slate-600">{pat.phone}</td>
                        <td className="py-4 px-6 text-xs">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md uppercase text-[10px]">
                            {pat.healthInsurance || 'Particular'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs font-bold text-teal-600">
                          {pat.appointments?.length || 0} turnos
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. TAB: CONEXIÓN WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="max-w-2xl bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Estado de WhatsApp (Baileys Engine)</h3>
              <p className="text-xs text-slate-500 mt-1">Conecta el número de WhatsApp oficial del consultorio.</p>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className={`w-3.5 h-3.5 rounded-full ${
                waStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' :
                waStatus === 'QR_READY' ? 'bg-amber-500 animate-bounce' : 'bg-rose-500'
              }`} />
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Estado: {
                    waStatus === 'CONNECTED' ? 'Conectado y Atendiendo Pacientes' :
                    waStatus === 'QR_READY' ? 'Esperando Escaneo de Código QR' :
                    waStatus === 'INITIALIZING' ? 'Iniciando conexión...' : 'Desconectado'
                  }
                </p>
                <p className="text-[11px] text-slate-400">
                  {waStatus === 'CONNECTED' ? 'El bot responde mensajes y confirma citas 24/7 en Render.' : 'Presiona el botón para iniciar o generar el código QR.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              {waStatus === 'CONNECTED' ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-900">¡WhatsApp Vinculado con Éxito!</p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    La sesión está guardada de forma segura y encriptada en la base de datos de Supabase. Sobrevive a los reinicios de Render.
                  </p>
                </div>
              ) : qrCode && waStatus === 'QR_READY' ? (
                <div className="text-center">
                  <img src={qrCode} alt="WhatsApp QR" className="w-64 h-64 mx-auto rounded-2xl shadow-lg border border-slate-200" />
                  <p className="text-xs font-bold text-slate-700 mt-4">Escanea este código desde WhatsApp</p>
                  <p className="text-[11px] text-slate-400">Dispositivos vinculados &gt; Vincular un dispositivo</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <button
                    onClick={startWhatsApp}
                    className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                  >
                    Iniciar Conexión / Generar QR
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. TAB: MI CONSULTORIO (VISTA SOLO LECTURA PARA EL CLIENTE / DOCTOR) */}
        {activeTab === 'perfil_clinica' && role === 'admin' && (
          <div className="max-w-3xl space-y-6">
            {/* AVISO DE PERSONALIZACIÓN GESTIONADA */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 p-5 rounded-3xl flex items-start gap-4">
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl shrink-0 shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-900">Perfil y Marca Gestionados</h4>
                <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
                  Los datos institucionales y de marca de este consultorio son administrados centralmente por tu proveedor de <strong>Mediflow</strong>. 
                  Si requieres modificar el nombre del consultorio, profesional a cargo, dirección o agregar nuevas especialidades, por favor ponte en contacto con tu soporte asignado.
                </p>
              </div>
            </div>

            {/* TARJETA DE DATOS ACTUALES (SOLO LECTURA) */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{clinic.clinicName}</h3>
                  <p className="text-xs text-teal-600 font-bold">{clinic.specialty}</p>
                </div>
                <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-full">
                  Licencia Activa
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Profesional a Cargo</span>
                    <span className="font-semibold text-slate-800">{clinic.doctorName}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ubicación</span>
                    <span className="font-semibold text-slate-800">{clinic.address}, {clinic.city}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teléfono de Contacto</span>
                    <span className="font-semibold text-slate-800">{clinic.phone}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Horarios de Atención</span>
                    <span className="font-semibold text-slate-800">{clinic.workingHours}</span>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Obras Sociales & Prepagas Aceptadas</span>
                  <div className="flex flex-wrap gap-1.5">
                    {clinic.insurances?.split(',').map((ins: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-700 font-medium text-xs rounded-lg">
                        {ins.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. TAB: CONFIGURACIÓN SUPERADMIN (DATOS DE CLÍNICA + IA + SEGURIDAD) */}
        {activeTab === 'configuracion' && role === 'superadmin' && (
          <div className="max-w-4xl space-y-6">
            
            {/* SUB-NAVEGACIÓN SUPERADMIN */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">
              <button
                onClick={() => setSuperAdminSubTab('clinica')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  superAdminSubTab === 'clinica' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-4 h-4" /> Datos de la Clínica & Marca
              </button>

              <button
                onClick={() => setSuperAdminSubTab('recordatorios')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  superAdminSubTab === 'recordatorios' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-4 h-4" /> Recordatorios & Anti-Ban
              </button>

              <button
                onClick={() => setSuperAdminSubTab('ia')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  superAdminSubTab === 'ia' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="w-4 h-4" /> Motor de IA & Seguridad
              </button>
            </div>

            {/* SECCIÓN 1: DATOS DE LA CLÍNICA & MARCA */}
            {superAdminSubTab === 'clinica' && (
              <form onSubmit={saveClinicDataAsSuperAdmin} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 text-xs font-black uppercase tracking-wider mb-1">
                    <Sparkles className="w-4 h-4" /> Personalización Exclusiva del Cliente
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Datos Institucionales del Consultorio</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Estos datos son los que verá el paciente en la Landing, en el Portal de Reservas y los que utiliza la IA para responder en WhatsApp.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Consultorio / Clínica</label>
                    <input 
                      type="text"
                      value={clinic.clinicName || ''}
                      onChange={e => setClinic({ ...clinic, clinicName: e.target.value })}
                      placeholder="Ej: Clínica Dental San Lucas"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Profesional a Cargo (Doctor/a)</label>
                    <input 
                      type="text"
                      value={clinic.doctorName || ''}
                      onChange={e => setClinic({ ...clinic, doctorName: e.target.value })}
                      placeholder="Ej: Dr. Roberto Gómez"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Especialidad</label>
                    <input 
                      type="text"
                      value={clinic.specialty || ''}
                      onChange={e => setClinic({ ...clinic, specialty: e.target.value })}
                      placeholder="Ej: Odontología Integral e Implantes"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teléfono Fijo / Contacto</label>
                    <input 
                      type="text"
                      value={clinic.phone || ''}
                      onChange={e => setClinic({ ...clinic, phone: e.target.value })}
                      placeholder="Ej: +54 11 4455-6677"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección del Consultorio</label>
                    <input 
                      type="text"
                      value={clinic.address || ''}
                      onChange={e => setClinic({ ...clinic, address: e.target.value })}
                      placeholder="Ej: Av. Corrientes 1234, Piso 2"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ciudad</label>
                    <input 
                      type="text"
                      value={clinic.city || ''}
                      onChange={e => setClinic({ ...clinic, city: e.target.value })}
                      placeholder="Ej: Buenos Aires"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Horarios de Atención</label>
                    <input 
                      type="text"
                      value={clinic.workingHours || ''}
                      onChange={e => setClinic({ ...clinic, workingHours: e.target.value })}
                      placeholder="Ej: Lunes a Viernes de 09:00 a 19:00 hs"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obras Sociales y Prepagas Aceptadas (Separadas por coma)</label>
                    <textarea 
                      rows={2}
                      value={clinic.insurances || ''}
                      onChange={e => setClinic({ ...clinic, insurances: e.target.value })}
                      placeholder="Ej: OSDE, Swiss Medical, Galeno, Particular"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" /> Guardar Datos de la Clínica
                  </button>
                </div>
              </form>
            )}

            {/* SECCIÓN 2: RECORDATORIOS & ANTI-BAN */}
            {superAdminSubTab === 'recordatorios' && (
              <form onSubmit={saveClinicDataAsSuperAdmin} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" /> Configuración de Recordatorios Inteligentes
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Controla los horarios de disparo y el lapso aleatorio para evitar detección y bloqueos de Meta.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hora Inicio Envíos</label>
                    <input 
                      type="time"
                      value={clinic.remindersStartHour || '09:00'}
                      onChange={e => setClinic({ ...clinic, remindersStartHour: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delay Mínimo (Minutos)</label>
                    <input 
                      type="number"
                      min={1}
                      value={clinic.minRandomDelayMin || 10}
                      onChange={e => setClinic({ ...clinic, minRandomDelayMin: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delay Máximo (Minutos)</label>
                    <input 
                      type="number"
                      min={1}
                      value={clinic.maxRandomDelayMin || 18}
                      onChange={e => setClinic({ ...clinic, maxRandomDelayMin: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    💡 <strong>Protección Anti-Ban:</strong> Los mensajes no se envían a un minuto exacto predecible. El sistema calcula un lapso aleatorio entre {clinic.minRandomDelayMin || 10} y {clinic.maxRandomDelayMin || 18} minutos entre cada recordatorio para simular comportamiento humano natural.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                  >
                    Guardar Configuración de Recordatorios
                  </button>
                </div>
              </form>
            )}

            {/* SECCIÓN 3: IA & SEGURIDAD */}
            {superAdminSubTab === 'ia' && (
              <form onSubmit={saveSuperAdminConfig} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Bot className="w-5 h-5 text-indigo-600" /> Parámetros del Asistente Gemini & Seguridad
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Configuración técnica de bajo nivel y PIN de protección.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Google Gemini API Key</label>
                    <input 
                      type="password"
                      value={geminiApiKey}
                      onChange={e => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Modelo de IA Preferido</label>
                    <select
                      value={geminiModel}
                      onChange={e => setGeminiModel(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="gemini-3.8-flash">gemini-3.8-flash (Recomendado)</option>
                      <option value="gemini-flash-latest">gemini-flash-latest</option>
                      <option value="gemini-3.5-flash">gemini-3.5-flash</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prompt Maestro de WhatsApp</label>
                    <textarea
                      rows={5}
                      value={systemPrompt}
                      onChange={e => setSystemPrompt(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-normal"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-amber-600" /> PIN de Acceso SuperAdmin
                    </label>
                    <input 
                      type="text"
                      value={newSuperAdminPin}
                      onChange={e => setNewSuperAdminPin(e.target.value)}
                      placeholder="superadmin123"
                      className="w-full sm:w-64 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Este PIN protege esta sección para que los clientes o asistentes nunca puedan alterar la marca o la configuración técnica.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md"
                  >
                    Guardar Configuración Técnica & PIN
                  </button>
                </div>
              </form>
            )}

          </div>
        )}

      </main>

    </div>
  );
}
