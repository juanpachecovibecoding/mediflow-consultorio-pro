import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  MapPin, 
  Clock, 
  Phone, 
  ShieldCheck, 
  Award, 
  Sparkles, 
  CalendarCheck, 
  CheckCircle2, 
  ArrowRight,
  Stethoscope
} from 'lucide-react';

export default function LandingPage() {
  const [clinic, setClinic] = useState<any>({
    clinicName: 'Consultorio Odontológico Dr. Juan Pérez',
    doctorName: 'Dr. Juan Pérez',
    specialty: 'Odontología Integral & Estética Dental',
    address: 'Av. Corrientes 1234, Piso 2',
    city: 'Buenos Aires',
    workingHours: 'Lunes a Viernes de 09:00 a 19:00 hs',
    whatsappNumber: '+54 9 11 5566-7788',
    insurances: 'OSDE, Swiss Medical, Galeno, Particular'
  });

  const [services, setServices] = useState<any[]>([
    { id: '1', name: 'Consulta y Diagnóstico', durationMin: 30, description: 'Evaluación odontológica completa con cámara intraoral.' },
    { id: '2', name: 'Limpieza y Profilaxis', durationMin: 45, description: 'Eliminación de sarro, manchas y pulido coronario con ultrasonido.' },
    { id: '3', name: 'Blanqueamiento Dental', durationMin: 45, description: 'Tecnología de última generación para una sonrisa radiante.' },
    { id: '4', name: 'Urgencia / Alivio del Dolor', durationMin: 30, description: 'Atención prioritaria para dolores agudos y traumatismos.' }
  ]);

  useEffect(() => {
    fetch('/api/public/clinic')
      .then(res => res.json())
      .then(data => {
        if (data.clinic) setClinic(data.clinic);
        if (data.services && data.services.length > 0) setServices(data.services);
      })
      .catch(() => {});
  }, []);

  const cleanWaNumber = (clinic.whatsappNumber || '').replace(/\D/g, '');
  const waUrl = `https://wa.me/${cleanWaNumber}?text=Hola!%20Quería%20consultar%20para%20agendar%20un%20turno.`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-teal-500 selection:text-white">
      
      {/* 1. TOP BAR */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2.5 px-4 sm:px-8 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-400" /> {clinic.address}, {clinic.city}
            </span>
            <span className="hidden md:flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-400" /> {clinic.workingHours}
            </span>
          </div>
          <div className="flex items-center gap-4 font-medium text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-teal-400" /> {clinic.phone}
            </span>
          </div>
        </div>
      </div>

      {/* 2. NAVBAR */}
      <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">{clinic.clinicName}</h1>
              <p className="text-xs font-semibold text-teal-700">{clinic.specialty}</p>
            </div>
          </div>

          <a 
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Pedir Turno por WhatsApp</span>
          </a>
        </div>
      </nav>

      {/* 3. HERO SECTION */}
      <section className="py-16 md:py-24 px-4 sm:px-8 relative overflow-hidden bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold tracking-wide">
              <Sparkles className="w-4 h-4 text-teal-600" />
              Atención personalizada con Asistente Virtual 24/7
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Tu sonrisa en las mejores manos con el <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">{clinic.doctorName}</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Cuidado odontológico moderno, cercano y sin esperas. Consultá con nuestro asistente por WhatsApp y recibí tu enlace exclusivo para reservar el horario que mejor te convenga.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
              <a 
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/25 transition-all hover:scale-105 text-base"
              >
                <MessageCircle className="w-5 h-5" />
                Agendar Turno por WhatsApp
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="pt-4 flex items-center justify-center lg:justify-start gap-8 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Confirmación Inmediata
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Recordatorio 24h
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-6 relative">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 font-bold">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Reserva Simple por WhatsApp</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Evitá llamadas telefónicas y esperas innecesarias. Nuestro asistente virtual de WhatsApp te solicitará tu DNI y te entregará tu acceso exclusivo a la agenda al instante.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">1</div>
                  <span>Envías un mensaje por WhatsApp</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">2</div>
                  <span>La IA verifica tu DNI y te da un enlace</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">3</div>
                  <span>Eliges tu turno y queda confirmado</span>
                </div>
              </div>

              <a 
                href={waUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block text-center w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition"
              >
                Comenzar Consulta
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* 4. TRATAMIENTOS / SERVICIOS */}
      <section className="py-20 px-4 sm:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">Tratamientos y Servicios</h3>
          <p className="text-sm text-slate-500 mt-2">Tecnología de avanzada y atención profesional enfocada en tu bienestar</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((s, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-100/50 hover:border-teal-300 transition-all">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-lg mb-1">{s.name}</h4>
              <p className="text-xs text-teal-700 font-semibold mb-3">Duración aprox: {s.durationMin} min</p>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">{s.description || 'Atención integral odontológica.'}</p>
              <a 
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-emerald-700 flex items-center gap-1 hover:underline"
              >
                Consultar por este servicio <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 5. OBRAS SOCIALES */}
      <section className="py-12 bg-white border-y border-slate-100 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Obras Sociales y Prepagas Aceptadas</p>
          <div className="flex flex-wrap justify-center items-center gap-3">
            {clinic.insurances.split(',').map((ins: string, i: number) => (
              <span key={i} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                {ins.trim()}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 6. UBICACIÓN Y CONTACTO */}
      <section className="py-20 px-4 sm:px-8 max-w-6xl mx-auto">
        <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-14 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider">
              Encontranos
            </span>
            <h3 className="text-3xl font-black">Atención en el corazón de la ciudad</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Instalaciones confortables pensadas para que tu visita sea tranquila, puntual y agradable.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-5 h-5 text-teal-400" />
                <span>{clinic.address}, {clinic.city}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-5 h-5 text-teal-400" />
                <span>{clinic.workingHours}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-5 h-5 text-teal-400" />
                <span>{clinic.phone}</span>
              </div>
            </div>
          </div>

          <div className="text-center md:text-right">
            <a 
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl shadow-xl transition-all hover:scale-105 text-base"
            >
              <MessageCircle className="w-5 h-5 fill-current" />
              Escribir a WhatsApp Ahora
            </a>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-8 text-center text-xs text-slate-400 border-t border-slate-100">
        <p>© {new Date().getFullYear()} {clinic.clinicName}. Todos los derechos reservados.</p>
      </footer>

      {/* FLOATING WHATSAPP BUTTON */}
      <a 
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40 transition-all hover:scale-110"
      >
        <MessageCircle className="w-8 h-8 fill-current" />
      </a>

    </div>
  );
}
