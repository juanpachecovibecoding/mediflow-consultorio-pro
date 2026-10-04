import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Settings, 
  Lock, 
  QrCode, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Bot,
  AlertTriangle,
  LogOut
} from 'lucide-react';

export default function AdminPanel() {
  type Role = 'superadmin' | 'admin' | 'asistente';
  const [role, setRole] = useState<Role>('admin');
  const [activeTab, setActiveTab] = useState<'agenda' | 'pacientes' | 'whatsapp' | 'configuracion'>('agenda');

  // Datos de la clínica y agenda
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [clinic, setClinic] = useState<any>({});
  const [waStatus, setWaStatus] = useState<string>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);

  // SuperAdmin Config
  const [superAdminPin, setSuperAdminPin] = useState('superadmin123');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
  const [systemPrompt, setSystemPrompt] = useState('');
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

  const loadSuperAdminConfig = async () => {
    try {
      const res = await fetch('/api/admin/system-config', {
        headers: { 'x-admin-pin': superAdminPin }
      });
      if (res.ok) {
        const data = await res.json();
        setGeminiApiKey(data.geminiApiKey || '');
        setGeminiModel(data.geminiModel || 'gemini-2.0-flash');
        setSystemPrompt(data.systemPrompt || '');
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadAgenda();
    loadWaStatus();
    const interval = setInterval(loadWaStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (role === 'superadmin') {
      loadSuperAdminConfig();
    }
  }, [role]);

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
          superAdminPin
        })
      });
      if (res.ok) {
        setFeedback('¡Configuración técnica de IA guardada!');
        setTimeout(() => setFeedback(''), 3000);
      } else {
        alert('PIN de SuperAdmin no autorizado.');
      }
    } catch (e) {
      alert('Error al guardar configuración.');
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

  const saveClinicConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/clinic-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinic)
      });
      setFeedback('¡Datos de la clínica y recordatorios actualizados!');
      setTimeout(() => setFeedback(''), 3000);
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-black tracking-tight">{clinic.clinicName || 'Panel Médico'}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{clinic.doctorName || 'Dr. Juan Pérez'}</p>
        </div>

        {/* SELECTOR DE ROL */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Rol de Acceso
          </label>
          <select 
            value={role}
            onChange={e => {
              const newRole = e.target.value as Role;
              setRole(newRole);
              if (newRole === 'asistente' && ['whatsapp', 'configuracion'].includes(activeTab)) {
                setActiveTab('agenda');
              }
            }}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold py-1.5 px-2.5 rounded-lg outline-none"
          >
            <option value="superadmin">👑 SuperAdmin (Técnico)</option>
            <option value="admin">👨‍⚕️ Administrador (Doctor)</option>
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
            <Calendar className="w-5 h-5" /> Agenda del Consultorio
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

          {role !== 'asistente' && (
            <button
              onClick={() => setActiveTab('configuracion')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === 'configuracion' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
              {role === 'superadmin' ? 'Configuración Técnica (IA)' : 'Datos de Clínica'}
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 text-center">
          <a href="/" className="text-xs text-slate-400 hover:text-white font-semibold transition">
            ← Volver a la Landing
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
              {activeTab === 'configuracion' && (role === 'superadmin' ? 'Panel Técnico SuperAdmin' : 'Configuración de la Clínica')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Acceso en modo: <strong className="text-slate-800 uppercase">{role}</strong>
            </p>
          </div>

          {feedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
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
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Fecha y Hora</th>
                    <th className="p-4">Paciente</th>
                    <th className="p-4">DNI</th>
                    <th className="p-4">WhatsApp Contacto</th>
                    <th className="p-4">Servicio</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-medium">
                        No hay turnos registrados aún.
                      </td>
                    </tr>
                  ) : (
                    appointments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold text-slate-900">
                          {a.date} <span className="text-teal-700">({a.time} hs)</span>
                        </td>
                        <td className="p-4 font-medium text-slate-800">{a.patient?.name}</td>
                        <td className="p-4 font-mono text-xs text-slate-600">{a.patient?.dni}</td>
                        <td className="p-4 font-mono text-xs text-slate-600">{a.patient?.phone}</td>
                        <td className="p-4 text-slate-600 text-xs">{a.service?.name || 'Consulta General'}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            a.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                            a.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                            a.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {a.status !== 'CONFIRMED' && a.status !== 'CANCELLED' && (
                            <button
                              onClick={() => updateAppointmentStatus(a.id, 'CONFIRMED')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition"
                            >
                              Confirmar
                            </button>
                          )}
                          {a.status !== 'CANCELLED' && (
                            <button
                              onClick={() => updateAppointmentStatus(a.id, 'CANCELLED')}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition"
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
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4">DNI</th>
                    <th className="p-4">Nombre y Apellido</th>
                    <th className="p-4">WhatsApp Notificaciones</th>
                    <th className="p-4">Obra Social</th>
                    <th className="p-4">Fecha de Alta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs font-medium">
                        No hay pacientes registrados aún.
                      </td>
                    </tr>
                  ) : (
                    patients.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-mono font-bold text-slate-900">{p.dni}</td>
                        <td className="p-4 font-semibold text-slate-800">{p.name}</td>
                        <td className="p-4 font-mono text-xs text-slate-600">{p.phone}</td>
                        <td className="p-4 text-xs text-slate-600">{p.healthInsurance || 'Particular'}</td>
                        <td className="p-4 text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. TAB: WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="max-w-2xl bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Línea de WhatsApp de la Clínica</h3>
                <p className="text-xs text-slate-500 mt-1">Conecta el número del consultorio para que Gemini atienda y envíe avisos.</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                waStatus === 'CONNECTED' ? 'bg-emerald-100 text-emerald-800' :
                waStatus === 'QR_READY' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {waStatus}
              </span>
            </div>

            <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center min-h-[260px] text-center">
              {waStatus === 'DISCONNECTED' && (
                <div className="space-y-4">
                  <QrCode className="w-16 h-16 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 max-w-xs">
                    Haz clic en el botón para generar el código QR y vincular tu celular de WhatsApp.
                  </p>
                  <button
                    onClick={startWhatsApp}
                    className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition shadow-md"
                  >
                    Generar Código QR
                  </button>
                </div>
              )}

              {waStatus === 'INITIALIZING' && (
                <div className="space-y-3">
                  <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-slate-600">Iniciando motor de WhatsApp...</p>
                </div>
              )}

              {waStatus === 'QR_READY' && qrCode && (
                <div className="space-y-3">
                  <div className="p-3 bg-white border-2 border-slate-200 rounded-xl inline-block shadow-sm">
                    <img src={qrCode} alt="WhatsApp QR" className="w-56 h-56" />
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    1. Abre WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo.
                  </p>
                </div>
              )}

              {waStatus === 'CONNECTED' && (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h4 className="font-black text-slate-900 text-base">WhatsApp Vinculado y Activo</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    La sesión está guardada de forma segura en la base de datos de Supabase. Sobrevivirá automáticamente a los reinicios de Render.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. TAB: CONFIGURACIÓN TÉCNICA (SUPERADMIN) O DATOS CLÍNICA (ADMIN) */}
        {activeTab === 'configuracion' && role === 'superadmin' && (
          <form onSubmit={saveSuperAdminConfig} className="max-w-3xl bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600" /> Parámetros de Google Gemini (SuperAdmin)
              </h3>
              <p className="text-xs text-slate-500 mt-1">Configuración técnica reservada para ti.</p>
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
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Modelo de IA</label>
                <select
                  value={geminiModel}
                  onChange={e => setGeminiModel(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Recomendado - Activo y Oficial)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prompt Maestro de WhatsApp</label>
                <textarea
                  rows={6}
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-normal"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md"
            >
              Guardar Configuración Técnica
            </button>
          </form>
        )}

        {activeTab === 'configuracion' && role === 'admin' && (
          <form onSubmit={saveClinicConfig} className="max-w-3xl bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Datos de la Clínica & Recordatorios</h3>
              <p className="text-xs text-slate-500 mt-1">Información visible para los pacientes y configuración de envíos.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Consultorio</label>
                <input 
                  type="text"
                  value={clinic.clinicName || ''}
                  onChange={e => setClinic({ ...clinic, clinicName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Profesional a Cargo</label>
                <input 
                  type="text"
                  value={clinic.doctorName || ''}
                  onChange={e => setClinic({ ...clinic, doctorName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección</label>
                <input 
                  type="text"
                  value={clinic.address || ''}
                  onChange={e => setClinic({ ...clinic, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ciudad</label>
                <input 
                  type="text"
                  value={clinic.city || ''}
                  onChange={e => setClinic({ ...clinic, city: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none"
                />
              </div>

              <div className="sm:col-span-2 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-black text-slate-900 mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" /> Configuración de Recordatorios Antispam
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hora Inicio Envíos</label>
                    <input 
                      type="time"
                      value={clinic.remindersStartHour || '09:00'}
                      onChange={e => setClinic({ ...clinic, remindersStartHour: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delay Mínimo (Minutos)</label>
                    <input 
                      type="number"
                      min={1}
                      value={clinic.minRandomDelayMin || 10}
                      onChange={e => setClinic({ ...clinic, minRandomDelayMin: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Delay Máximo (Minutos)</label>
                    <input 
                      type="number"
                      min={1}
                      value={clinic.maxRandomDelayMin || 18}
                      onChange={e => setClinic({ ...clinic, maxRandomDelayMin: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  El sistema enviará los mensajes con un intervalo aleatorio entre el mínimo y el máximo para simular comportamiento humano y proteger la cuenta.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-md"
            >
              Guardar Cambios de la Clínica
            </button>
          </form>
        )}

      </main>

    </div>
  );
}
