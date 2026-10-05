import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
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
  Sliders,
  LogOut,
  UserPlus,
  UserCheck,
  UserX,
  Trash2,
  Edit3,
  Stethoscope,
  Eye,
  EyeOff,
  ListOrdered,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Ban,
  Plus,
  Unlock,
  AlertCircle
} from 'lucide-react';

export default function AdminPanel() {
  type Role = 'superadmin' | 'admin' | 'asistente';
  
  // Estado de Autenticación
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('consultorio_auth');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Campos de formulario Login
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Navegación
  const [activeTab, setActiveTab] = useState<'agenda' | 'pacientes' | 'whatsapp' | 'configuracion' | 'perfil_clinica'>('agenda');

  // Sub-vista de la Agenda: 'proximos' | 'calendario'
  const [agendaView, setAgendaView] = useState<'proximos' | 'calendario'>('proximos');

  // Datos de la clínica, agenda y bloqueos
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<any[]>([]);
  const [clinic, setClinic] = useState<any>({});
  const [waStatus, setWaStatus] = useState<string>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);

  // Estado del Calendario Interactivo
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  // Estado de Formulario de Bloqueo
  const [blockType, setBlockType] = useState<'dia' | 'horario'>('dia');
  const [blockTime, setBlockTime] = useState('14:00');
  const [blockReason, setBlockReason] = useState('Feriado / Sin atención');
  const [blockLoading, setBlockLoading] = useState(false);

  // SuperAdmin: Gestión de Usuarios
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [newUserModal, setNewUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ name: '', username: '', password: '', role: 'asistente' });
  const [pwdChangeModal, setPwdChangeModal] = useState<{ open: boolean; userId: string; username: string }>({ open: false, userId: '', username: '' });
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // SuperAdmin Config & Seguridad
  const [superAdminPin, setSuperAdminPin] = useState('superadmin123');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [newSuperAdminPin, setNewSuperAdminPin] = useState('');
  const [superAdminSubTab, setSuperAdminSubTab] = useState<'usuarios' | 'clinica' | 'recordatorios' | 'ia'>('usuarios');

  const [feedback, setFeedback] = useState('');

  // Cargar datos al estar autenticado
  const loadAgenda = async () => {
    try {
      const res = await fetch('/api/admin/agenda');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
        setPatients(data.patients || []);
        if (data.scheduleBlocks) setScheduleBlocks(data.scheduleBlocks || []);
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

  const loadUsersList = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'x-admin-pin': superAdminPin }
      });
      if (res.ok) {
        const data = await res.json();
        setSystemUsers(data.users || []);
      }
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
        setGeminiModel(data.geminiModel || 'gemini-3.8-flash');
        setSystemPrompt(data.systemPrompt || '');
        setNewSuperAdminPin(data.superAdminPin || 'superadmin123');
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (currentUser) {
      loadAgenda();
      loadWaStatus();
      if (currentUser.role === 'superadmin') {
        loadUsersList();
        loadSuperAdminConfig();
      }
      const interval = setInterval(loadWaStatus, 4000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Manejo de Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('consultorio_auth', JSON.stringify(data.user));
        if (data.user.role === 'superadmin') {
          setSuperAdminPin(loginPassword);
          setActiveTab('configuracion');
        } else {
          setActiveTab('agenda');
        }
      } else {
        setLoginError(data.error || 'Credenciales no válidas.');
      }
    } catch (e) {
      setLoginError('Error de conexión con el servidor.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('consultorio_auth');
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setActiveTab('agenda');
  };

  const startWhatsApp = async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/start', { method: 'POST' });
      const data = await res.json();
      setWaStatus(data.status);
      setQrCode(data.qr);
    } catch (e) {}
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

  // Crear Bloqueo de Horario / Día
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBlockLoading(true);
    try {
      const res = await fetch('/api/admin/schedule-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDateStr,
          time: blockType === 'horario' ? blockTime : null,
          reason: blockReason.trim() || 'Bloqueado por el consultorio'
        })
      });
      if (res.ok) {
        await loadAgenda();
        setFeedback(`¡Bloqueo registrado para el día ${selectedDateStr}!`);
        setTimeout(() => setFeedback(''), 3500);
      } else {
        alert('Error al crear bloqueo.');
      }
    } catch (e) {
      alert('Error de conexión.');
    } finally {
      setBlockLoading(false);
    }
  };

  // Eliminar Bloqueo (Liberar horario)
  const handleDeleteBlock = async (blockId: string) => {
    try {
      const res = await fetch(`/api/admin/schedule-blocks/${blockId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await loadAgenda();
        setFeedback('Bloqueo eliminado. Horario liberado en la agenda.');
        setTimeout(() => setFeedback(''), 3500);
      }
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
        setFeedback('¡Parámetros de IA y PIN de seguridad guardados!');
        setTimeout(() => setFeedback(''), 3500);
      } else {
        alert('PIN de SuperAdmin no autorizado.');
      }
    } catch (e) {
      alert('Error al guardar configuración técnica.');
    }
  };

  // Crear Usuario (SuperAdmin)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': superAdminPin
        },
        body: JSON.stringify(newUserData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewUserModal(false);
        setNewUserData({ name: '', username: '', password: '', role: 'asistente' });
        loadUsersList();
        setFeedback('¡Nuevo usuario creado exitosamente!');
        setTimeout(() => setFeedback(''), 3500);
      } else {
        alert(data.error || 'Error al crear usuario.');
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

  // Cambiar Rol de Usuario (SuperAdmin)
  const handleToggleUserRole = async (user: any) => {
    const nextRole = user.role === 'admin' ? 'asistente' : 'admin';
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': superAdminPin
        },
        body: JSON.stringify({ role: nextRole })
      });
      if (res.ok) {
        loadUsersList();
        setFeedback(`Rol de ${user.name} cambiado a ${nextRole === 'admin' ? 'Doctor / Admin' : 'Secretaría'}.`);
        setTimeout(() => setFeedback(''), 3500);
      }
    } catch (e) {}
  };

  // Alternar Activo/Inactivo (SuperAdmin)
  const handleToggleUserActive = async (user: any) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': superAdminPin
        },
        body: JSON.stringify({ active: !user.active })
      });
      if (res.ok) {
        loadUsersList();
        setFeedback(`Usuario ${user.username} ${!user.active ? 'activado' : 'desactivado'}.`);
        setTimeout(() => setFeedback(''), 3500);
      }
    } catch (e) {}
  };

  // Cambiar Contraseña de Usuario (SuperAdmin)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordVal.trim()) return;

    try {
      const res = await fetch(`/api/admin/users/${pwdChangeModal.userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': superAdminPin
        },
        body: JSON.stringify({ password: newPasswordVal.trim() })
      });
      if (res.ok) {
        setPwdChangeModal({ open: false, userId: '', username: '' });
        setNewPasswordVal('');
        setFeedback('¡Contraseña actualizada exitosamente!');
        setTimeout(() => setFeedback(''), 3500);
      } else {
        alert('Error al actualizar contraseña.');
      }
    } catch (e) {
      alert('Error de conexión.');
    }
  };

  // Eliminar Usuario (SuperAdmin)
  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el acceso de "${name}"? Esta acción no se puede deshacer.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-pin': superAdminPin }
      });
      if (res.ok) {
        loadUsersList();
        setFeedback('Usuario eliminado de la base de datos.');
        setTimeout(() => setFeedback(''), 3500);
      }
    } catch (e) {}
  };

  // Helpers del Calendario
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  
  let firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
  // Ajuste para que Lunes sea el primer día (0) y Domingo el último (6)
  firstDayOfWeek = (firstDayOfWeek + 6) % 7;

  const calendarGrid = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarGrid.push(d);
  }

  const prevMonth = () => {
    setCalendarDate(new Date(calYear, calMonth - 1, 1));
  };
  const nextMonth = () => {
    setCalendarDate(new Date(calYear, calMonth + 1, 1));
  };
  const goToday = () => {
    const now = new Date();
    setCalendarDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setSelectedDateStr(`${y}-${m}-${d}`);
  };

  // Turnos y bloqueos del día seleccionado
  const selectedDayAppointments = appointments.filter(a => a.date === selectedDateStr);
  const selectedDayBlocks = scheduleBlocks.filter(b => b.date === selectedDateStr);

  // ---------------------------------------------------------------------------
  // 1. PANTALLA DE LOGIN (SI NO ESTÁ AUTENTICADO)
  // ---------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-teal-950 flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-white/20">
          
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-teal-500/25">
              <Stethoscope className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Acceso al Panel</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Consultorio Médico & Asistente Inteligente
            </p>
          </div>

          {loginError && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2 animate-shake">
              <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario
              </label>
              <input 
                type="text"
                required
                autoFocus
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                placeholder="admin / secretaria / superadmin"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/25 text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loginLoading ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <a href="/" className="text-xs text-slate-400 hover:text-teal-600 font-semibold transition">
              ← Volver a la página principal
            </a>
          </div>

        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. PANEL ADMINISTRATIVO AUTENTICADO
  // ---------------------------------------------------------------------------
  const role: Role = currentUser.role;

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

        {/* PERFIL DEL USUARIO AUTENTICADO */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
              role === 'superadmin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              role === 'admin' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block truncate">
                {role === 'superadmin' ? '👑 SuperAdmin' : role === 'admin' ? '👨‍⚕️ Doctor' : '📋 Secretaría'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* NAVEGACIÓN SEGÚN EL ROL */}
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

          {/* ROL SUPERADMIN: CONTROL TOTAL DE USUARIOS, MARCA E IA */}
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
              {activeTab === 'configuracion' && 'Panel de Control SuperAdmin (Gestión & Venta)'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sesión iniciada como: <strong className="text-slate-800 uppercase">{currentUser.name} ({role})</strong>
            </p>
          </div>

          {feedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm animate-fade-in">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              {feedback}
            </div>
          )}
        </header>

        {/* 1. TAB: AGENDA (CON LAS 2 TARJETAS SOLICITADAS: PRÓXIMOS TURNOS Y CALENDARIO) */}
        {activeTab === 'agenda' && (
          <div className="space-y-6">
            
            {/* LAS 2 TARJETAS PRINCIPALES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* TARJETA 1: PRÓXIMOS TURNOS */}
              <div 
                onClick={() => setAgendaView('proximos')}
                className={`p-6 rounded-3xl border transition-all cursor-pointer flex items-start gap-4 ${
                  agendaView === 'proximos'
                    ? 'bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-xl shadow-teal-600/20 border-teal-500 scale-[1.01]'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-teal-300 hover:shadow-md'
                }`}
              >
                <div className={`p-3.5 rounded-2xl shrink-0 ${
                  agendaView === 'proximos' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'
                }`}>
                  <ListOrdered className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black tracking-tight">Próximos Turnos</h3>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                      agendaView === 'proximos' ? 'bg-white/25 text-white' : 'bg-teal-50 text-teal-700 border border-teal-200'
                    }`}>
                      {appointments.filter(a => a.status !== 'CANCELLED').length} Activos
                    </span>
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${
                    agendaView === 'proximos' ? 'text-teal-100' : 'text-slate-500'
                  }`}>
                    Entra aquí para ver el listado de citas programadas, datos de los pacientes y acciones para confirmar o cancelar.
                  </p>
                </div>
              </div>

              {/* TARJETA 2: CALENDARIO & BLOQUEOS */}
              <div 
                onClick={() => setAgendaView('calendario')}
                className={`p-6 rounded-3xl border transition-all cursor-pointer flex items-start gap-4 ${
                  agendaView === 'calendario'
                    ? 'bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-xl shadow-teal-600/20 border-teal-500 scale-[1.01]'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-teal-300 hover:shadow-md'
                }`}
              >
                <div className={`p-3.5 rounded-2xl shrink-0 ${
                  agendaView === 'calendario' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'
                }`}>
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black tracking-tight">Calendario & Bloqueos</h3>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                      agendaView === 'calendario' ? 'bg-white/25 text-white' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {scheduleBlocks.length} Bloqueos
                    </span>
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${
                    agendaView === 'calendario' ? 'text-teal-100' : 'text-slate-500'
                  }`}>
                    Vista de calendario mensual con los turnos ocupados y herramientas para bloquear días u horarios a tu antojo.
                  </p>
                </div>
              </div>

            </div>

            {/* VISTA 1: TABLA DE PRÓXIMOS TURNOS */}
            {agendaView === 'proximos' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-900">Listado Cronológico de Turnos</h3>
                    <p className="text-xs text-slate-500">Pacientes agendados vía WhatsApp y Portal de Reserva.</p>
                  </div>
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
                        <th className="py-3.5 px-6">Teléfono WhatsApp</th>
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

            {/* VISTA 2: CALENDARIO MENSUAL & GESTIÓN DE BLOQUEOS */}
            {agendaView === 'calendario' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                
                {/* CALENDARIO MENSUAL INTERACTIVO (COL 1 Y 2) */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                  
                  {/* CABECERA DEL CALENDARIO */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 capitalize">
                        {monthNames[calMonth]} {calYear}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Selecciona un día para ver turnos agendados y aplicar bloqueos.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={goToday}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                      >
                        Hoy
                      </button>
                      <button
                        onClick={prevMonth}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                        title="Mes Anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                        title="Mes Siguiente"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* GRID DE DÍAS DE LA SEMANA */}
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider">
                    {dayLabels.map((lbl, idx) => (
                      <div key={idx} className="py-1">{lbl}</div>
                    ))}
                  </div>

                  {/* GRID DE CELDAS DEL MES */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarGrid.map((dayNum, idx) => {
                      if (!dayNum) {
                        return <div key={`empty-${idx}`} className="h-20 bg-slate-50/50 rounded-2xl" />;
                      }

                      const mStr = String(calMonth + 1).padStart(2, '0');
                      const dStr = String(dayNum).padStart(2, '0');
                      const dateIso = `${calYear}-${mStr}-${dStr}`;

                      const isSelected = selectedDateStr === dateIso;
                      const todayIso = new Date().toISOString().split('T')[0];
                      const isToday = todayIso === dateIso;

                      // Turnos y bloqueos para este día
                      const dayAppts = appointments.filter(a => a.date === dateIso && a.status !== 'CANCELLED');
                      const dayBlocks = scheduleBlocks.filter(b => b.date === dateIso);
                      const fullDayBlock = dayBlocks.find(b => !b.time);

                      return (
                        <div
                          key={`day-${dayNum}`}
                          onClick={() => setSelectedDateStr(dateIso)}
                          className={`h-20 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected 
                              ? 'bg-teal-50 border-teal-500 shadow-sm ring-2 ring-teal-500/20' 
                              : isToday 
                              ? 'bg-emerald-50/40 border-emerald-300 hover:border-teal-400'
                              : 'bg-white border-slate-100 hover:border-teal-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-black ${
                              isSelected ? 'text-teal-700' : isToday ? 'text-emerald-700' : 'text-slate-800'
                            }`}>
                              {dayNum}
                            </span>
                            {isToday && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            )}
                          </div>

                          <div className="space-y-1">
                            {fullDayBlock ? (
                              <div className="px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold text-[9px] rounded-md truncate" title={fullDayBlock.reason || 'Día Bloqueado'}>
                                ⛔ Bloqueado
                              </div>
                            ) : dayBlocks.length > 0 ? (
                              <div className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-[9px] rounded-md truncate">
                                ⏳ {dayBlocks.length} {dayBlocks.length === 1 ? 'bloqueo' : 'bloqueos'}
                              </div>
                            ) : null}

                            {dayAppts.length > 0 && (
                              <div className="px-1.5 py-0.5 bg-teal-100 text-teal-800 font-bold text-[9px] rounded-md truncate">
                                📅 {dayAppts.length} {dayAppts.length === 1 ? 'turno' : 'turnos'}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-teal-100 border border-teal-300"></span> Con turnos ocupados
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-300"></span> Día bloqueado completo
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300"></span> Horarios específicos bloqueados
                    </span>
                  </div>

                </div>

                {/* PANEL LATERAL: GESTIÓN DEL DÍA SELECCIONADO (COL 3) */}
                <div className="space-y-6">
                  
                  {/* DETALLE Y ACCIONES DEL DÍA */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
                    <div className="border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 block">
                        Día Seleccionado
                      </span>
                      <h4 className="text-base font-black text-slate-900">
                        {selectedDateStr}
                      </h4>
                    </div>

                    {/* TURNOS DE ESTE DÍA */}
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-600" /> Turnos Agendados ({selectedDayAppointments.length})
                      </h5>
                      {selectedDayAppointments.length === 0 ? (
                        <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">
                          No hay citas programadas para este día.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {selectedDayAppointments.map(a => (
                            <div key={a.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex justify-between items-center">
                              <div>
                                <span className="font-bold text-slate-800">{a.time} hs</span> - <span className="text-slate-700">{a.patient?.name}</span>
                                <span className="block text-[10px] text-slate-400">DNI: {a.patient?.dni}</span>
                              </div>
                              <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                                a.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                                a.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {a.status === 'CONFIRMED' ? 'Conf.' : a.status === 'CANCELLED' ? 'Canc.' : 'Pend.'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* BLOQUEOS ACTIVOS DE ESTE DÍA */}
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
                        <Ban className="w-3.5 h-3.5 text-rose-500" /> Bloqueos Activos ({selectedDayBlocks.length})
                      </h5>
                      {selectedDayBlocks.length === 0 ? (
                        <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">
                          El día no tiene ningún bloqueo activo.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedDayBlocks.map(b => (
                            <div key={b.id} className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 text-xs flex items-center justify-between">
                              <div>
                                <span className="font-bold text-rose-900">
                                  {b.time ? `Horario: ${b.time} hs` : '⛔ Todo el Día'}
                                </span>
                                <span className="block text-[10px] text-rose-700/80">{b.reason || 'Sin motivo'}</span>
                              </div>
                              <button
                                onClick={() => handleDeleteBlock(b.id)}
                                title="Desbloquear / Liberar"
                                className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* FORMULARIO: BLOQUEAR DÍA U HORARIO A SU ANTOJO */}
                  <form onSubmit={handleCreateBlock} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-teal-600" /> Bloquear Horario o Día
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Inhabilita la reserva para que ningún paciente pueda sacar turno en esa franja.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setBlockType('dia')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                          blockType === 'dia'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Día Completo
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockType('horario')}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                          blockType === 'horario'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Horario Específico
                      </button>
                    </div>

                    {blockType === 'horario' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                          Horario a Bloquear (HH:MM)
                        </label>
                        <input 
                          type="time"
                          required
                          value={blockTime}
                          onChange={e => setBlockTime(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Motivo del Bloqueo
                      </label>
                      <input 
                        type="text"
                        value={blockReason}
                        onChange={e => setBlockReason(e.target.value)}
                        placeholder="Ej: Feriado, Vacaciones, Almuerzo, Urgencia"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={blockLoading}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {blockLoading ? 'Guardando...' : blockType === 'dia' ? 'Bloquear Todo el Día' : `Bloquear a las ${blockTime} hs`}
                    </button>
                  </form>

                </div>

              </div>
            )}

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

        {/* 5. TAB: CONFIGURACIÓN SUPERADMIN */}
        {activeTab === 'configuracion' && role === 'superadmin' && (
          <div className="max-w-4xl space-y-6">
            
            {/* SUB-NAVEGACIÓN SUPERADMIN */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">
              <button
                onClick={() => setSuperAdminSubTab('usuarios')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  superAdminSubTab === 'usuarios' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" /> Gestión de Usuarios (Clientes & Secretaría)
              </button>

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

            {/* SECCIÓN 1: GESTIÓN DE USUARIOS POR ROLES (ADMIN & SECRETARIA) */}
            {superAdminSubTab === 'usuarios' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" /> Control de Accesos y Usuarios
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Crea y administra las cuentas de tus clientes (Doctores / Administradores) y su personal (Secretarias).
                    </p>
                  </div>

                  <button
                    onClick={() => setNewUserModal(true)}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-2 shrink-0"
                  >
                    <UserPlus className="w-4 h-4" /> Crear Nuevo Usuario
                  </button>
                </div>

                {/* TABLA DE USUARIOS */}
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 font-bold text-[11px] uppercase tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Nombre / Persona</th>
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Rol Asignado</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {systemUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                          <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-600">{u.username}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              u.role === 'admin' 
                                ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {u.role === 'admin' ? '👨‍⚕️ Administrador (Doctor)' : '📋 Secretaría (Asistente)'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {u.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleUserRole(u)}
                              title="Cambiar Rol (Doctor ⇄ Secretaría)"
                              className="px-2 py-1 text-xs bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold rounded-lg transition"
                            >
                              Cambiar Rol
                            </button>
                            <button
                              onClick={() => {
                                setPwdChangeModal({ open: true, userId: u.id, username: u.username });
                                setNewPasswordVal('');
                              }}
                              title="Cambiar Contraseña"
                              className="px-2 py-1 text-xs bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-bold rounded-lg transition"
                            >
                              Cambiar Clave
                            </button>
                            <button
                              onClick={() => handleToggleUserActive(u)}
                              title={u.active ? 'Desactivar Usuario' : 'Activar Usuario'}
                              className={`p-1 rounded-lg transition ${
                                u.active ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id, u.name)}
                              title="Eliminar Usuario"
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    💡 <strong>Roles del Sistema:</strong>
                    <br />
                    • <strong>Administrador (Doctor):</strong> Acceso a la agenda, calendario de bloqueos, pacientes, vinculación de WhatsApp y perfil del consultorio (solo lectura).
                    <br />
                    • <strong>Secretaría (Asistente):</strong> Acceso exclusivo a ver la agenda de turnos y directorio de pacientes.
                  </p>
                </div>
              </div>
            )}

            {/* SECCIÓN 2: DATOS DE LA CLÍNICA & MARCA */}
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

            {/* SECCIÓN 3: RECORDATORIOS & ANTI-BAN */}
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

            {/* SECCIÓN 4: IA & SEGURIDAD */}
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
                      Este PIN protege esta sección y sirve como contraseña para el usuario "superadmin".
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

      {/* MODAL: CREAR NUEVO USUARIO (SUPERADMIN) */}
      {newUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 animate-fade-in">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" /> Crear Usuario de Consultorio
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Asigna las credenciales y rol para tu cliente o su personal.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Dr. Roberto Gómez / Ana López"
                  value={newUserData.name}
                  onChange={e => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de Usuario (Login)</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: drgomez / recepcion"
                  value={newUserData.username}
                  onChange={e => setNewUserData({ ...newUserData, username: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Contraseña Inicial</label>
                <input 
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newUserData.password}
                  onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rol en el Sistema</label>
                <select
                  value={newUserData.role}
                  onChange={e => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  <option value="admin">👨‍⚕️ Administrador (Doctor / Cliente)</option>
                  <option value="asistente">📋 Secretaría (Asistente de Consultorio)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewUserModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR CONTRASEÑA DE USUARIO (SUPERADMIN) */}
      {pwdChangeModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-100 animate-fade-in">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-indigo-600" /> Cambiar Contraseña
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Asignar una nueva clave para el usuario <strong className="text-slate-800 font-mono">@{pwdChangeModal.username}</strong>.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nueva Contraseña</label>
                <input 
                  type="text"
                  required
                  autoFocus
                  placeholder="Nueva contraseña..."
                  value={newPasswordVal}
                  onChange={e => setNewPasswordVal(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPwdChangeModal({ open: false, userId: '', username: '' })}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Actualizar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
