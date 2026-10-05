import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageCircle, 
  User, 
  Phone, 
  ShieldCheck, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function BookingPortal() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Formulario de reserva
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [healthInsurance, setHealthInsurance] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<any>(null);

  // 1. Validar el Token al cargar la página
  useEffect(() => {
    if (!token) {
      setErrorMessage('No se ha proporcionado un enlace de reserva válido. Por favor, solicita uno a través de nuestro WhatsApp.');
      setLoading(false);
      return;
    }

    fetch(`/api/booking/validate-token/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.valid) {
          setTokenData(data);
          if (data.patient) {
            setName(data.patient.name || '');
            setPhone(data.patient.phone || '');
            setHealthInsurance(data.patient.healthInsurance || '');
          }
          if (data.services && data.services.length > 0) {
            setServiceId(data.services[0].id);
          }
          // Fecha sugerida: mañana
          const tmr = new Date();
          tmr.setDate(tmr.getDate() + 1);
          const defaultDate = tmr.toISOString().split('T')[0];
          setSelectedDate(defaultDate);
        } else {
          setErrorMessage(data.message || 'El enlace de reserva ha expirado o ya ha sido utilizado.');
        }
      })
      .catch(() => {
        setErrorMessage('Error de conexión al validar el enlace de reserva.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  // 2. Cargar slots disponibles cuando cambia la fecha
  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    fetch(`/api/booking/available-slots?date=${selectedDate}`)
      .then(res => res.json())
      .then(data => {
        setAvailableSlots(data.availableSlots || []);
        setSelectedTime('');
      })
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  // 3. Confirmar reserva
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTime) {
      alert('Por favor selecciona un horario para tu turno.');
      return;
    }
    if (!name.trim()) {
      alert('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!phone.trim()) {
      alert('Por favor ingresa tu número de WhatsApp para los recordatorios.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/booking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          dni: tokenData.dni,
          name,
          phone,
          healthInsurance,
          serviceId,
          date: selectedDate,
          time: selectedTime
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setConfirmedAppointment(result.appointment);
      } else {
        alert(result.error || 'No se pudo confirmar la reserva. Intenta nuevamente.');
      }
    } catch (e) {
      alert('Error de conexión al confirmar la reserva.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-bold text-slate-600">Verificando enlace exclusivo de reserva...</p>
        </div>
      </div>
    );
  }

  // Pantalla de Error (Token expirado o usado)
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Enlace No Disponible</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{errorMessage}</p>
          <div className="pt-2">
            <a 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm transition hover:bg-slate-800"
            >
              Volver a la Página Principal
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de Confirmación Exitosa
  if (confirmedAppointment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">¡Turno Confirmado!</h2>
            <p className="text-sm text-slate-500 mt-1">Tu reserva ha sido registrada correctamente en el consultorio.</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Paciente:</span>
              <span className="font-bold text-slate-900">{name} (DNI: {tokenData.dni})</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Fecha y Hora:</span>
              <span className="font-bold text-emerald-700">{selectedDate} a las {selectedTime} hs</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2">
              <span className="text-slate-500">Profesional:</span>
              <span className="font-bold text-slate-900">{tokenData.clinic?.doctorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lugar:</span>
              <span className="font-bold text-slate-900">{tokenData.clinic?.address}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Te hemos enviado un mensaje de confirmación por WhatsApp. Además, te enviaremos un recordatorio 24 horas antes de tu turno.
          </p>

          <a 
            href="/"
            className="block w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-sm shadow-md shadow-emerald-600/20"
          >
            Finalizar y Volver al Inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Cabecera */}
        <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {tokenData.clinic?.logoUrl && (
              <img 
                src={tokenData.clinic.logoUrl} 
                alt={tokenData.clinic.clinicName} 
                className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100 shrink-0 bg-white" 
              />
            )}
            <div>
              <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider">
                Enlace de Reserva Exclusivo
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                {tokenData.clinic?.clinicName || 'Reserva de Turno'}
              </h2>
              <p className="text-xs text-slate-500">DNI Verificado: <strong className="text-slate-800 font-mono">{tokenData.dni}</strong></p>
            </div>
          </div>
          <div className="text-xs text-amber-800 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 font-medium shrink-0">
            ⏳ Este enlace expira en 30 minutos
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-8">
          
          {/* 1. Datos Personales */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" /> 1. Datos del Paciente
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre y Apellido *</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obra Social / Prepaga</label>
                <input 
                  type="text"
                  value={healthInsurance}
                  onChange={e => setHealthInsurance(e.target.value)}
                  placeholder="Ej: OSDE / Particular"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Número de WhatsApp para Recordatorios *
                </label>
                <input 
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ej: +54 9 11 1234-5678"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none font-mono"
                />
                <p className="text-[11px] text-teal-800 bg-teal-50 p-2.5 rounded-lg border border-teal-100 mt-1.5 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  Aquí te enviaremos la confirmación inmediata y el recordatorio automático 24hs antes del turno.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Servicio */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" /> 2. Motivo o Servicio
            </h3>
            <select
              value={serviceId}
              onChange={e => setServiceId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium"
            >
              {tokenData.services?.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMin} min)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Selección de Fecha y Hora */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" /> 3. Elegí Día y Horario
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha</label>
              <input 
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full sm:w-64 px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Horarios Disponibles</label>
              {loadingSlots ? (
                <p className="text-xs text-slate-400 py-4">Buscando horarios libres...</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200 font-medium">
                  No hay horarios disponibles para esta fecha. Por favor seleccioná otro día.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {availableSlots.map(time => (
                    <button
                      type="button"
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold transition border ${
                        selectedTime === time
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {time} hs
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botón Confirmar */}
          <button
            type="submit"
            disabled={submitting || !selectedTime}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/25 transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? 'Confirmando Reserva...' : 'Confirmar Reserva de Turno'}
            <ArrowRight className="w-5 h-5" />
          </button>

        </form>

      </div>
    </div>
  );
}
