'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const legalLinks = [
  { label: 'Política de Privacidad', href: '/privacidad' },
  { label: 'Términos y Condiciones', href: '/terminos' },
  { label: 'Política de Cookies', href: '/cookies' },
  { label: 'Política de Envíos', href: '/envios' },
  { label: 'Política de Reembolsos', href: '/reembolsos' },
  { label: 'Verificación de Edad', href: '/edad-legal' },
];

const sidebarPages = [
  { label: 'Privacidad', href: '/privacidad' },
  { label: 'Términos y Condiciones', href: '/terminos' },
  { label: 'Política de Cookies', href: '/cookies' },
  { label: 'Política de Envíos', href: '/envios' },
  { label: 'Política de Reembolsos', href: '/reembolsos' },
  { label: 'Contacto', href: '/contacto' },
  { label: 'Verificación de Edad', href: '/edad-legal' },
];

interface FormState {
  nombre: string;
  email: string;
  asunto: string;
  mensaje: string;
}

export default function ContactoPage() {
  const [cartCount] = useState(0);
  const [form, setForm] = useState<FormState>({ nombre: '', email: '', asunto: '', mensaje: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <>
      <Navigation cartCount={cartCount} onCartOpen={() => {}} />

      <main className="min-h-screen bg-sc-cream">
        {/* Header */}
        <div className="bg-sc-darkforest text-sc-cream py-10 md:py-14">
          <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
            <nav aria-label="Ruta de navegación" className="flex items-center gap-1.5 text-sm text-sc-cream/50 flex-wrap mb-4">
              <Link href="/" className="hover:text-sc-cream transition-colors">Inicio</Link>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="flex-shrink-0">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <Link href="/privacidad" className="hover:text-sc-cream transition-colors">Legal</Link>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="flex-shrink-0">
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sc-cream font-medium" aria-current="page">Contacto</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-black tracking-tightest">Contacto</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-10 md:py-14">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <nav aria-label="Navegación legal" className="bg-white border border-sc-border rounded-card overflow-hidden">
                <div className="p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-sc-muted px-3 py-2">Información Legal</p>
                  <ul className="space-y-0.5">
                    {sidebarPages.map((page) => {
                      const isActive = page.href === '/contacto';
                      return (
                        <li key={page.href}>
                          <Link
                            href={page.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-sm2 text-sm font-medium transition-all duration-150 ${
                              isActive ? 'bg-sc-forest text-sc-cream' : 'text-sc-forest hover:bg-sc-beige'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {page.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </nav>
            </aside>

            {/* Main */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Contact info cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="16" height="12" rx="2"/>
                        <path d="M2 7l8 5 8-5"/>
                      </svg>
                    ),
                    title: 'Correo Electrónico',
                    value: 'hola@streetcandys.com',
                    sub: 'Respuesta en 24–48 horas hábiles',
                  },
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4c0-1.1.9-2 2-2h1.5l2 4.5-1.5 1.5a11 11 0 004 4l1.5-1.5L18 12.5V14c0 1.1-.9 2-2 2A14 14 0 014 4z"/>
                      </svg>
                    ),
                    title: 'WhatsApp',
                    value: '+57 300 000 0000',
                    sub: 'Lunes a viernes, 9am–6pm',
                  },
                  {
                    icon: (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="10" cy="10" r="8"/>
                        <path d="M10 6v4l3 3"/>
                      </svg>
                    ),
                    title: 'Horario de Atención',
                    value: 'Lun–Vie: 9am–6pm',
                    sub: 'Hora Colombia (UTC-5)',
                  },
                ].map((card) => (
                  <div key={card.title} className="bg-white border border-sc-border rounded-card p-5">
                    <div className="w-10 h-10 bg-sc-tan rounded-sm2 flex items-center justify-center text-sc-forest mb-3">
                      {card.icon}
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-sc-muted mb-1">{card.title}</p>
                    <p className="text-sm font-semibold text-sc-forest">{card.value}</p>
                    <p className="text-xs text-sc-muted mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* Contact form */}
              <div className="bg-white border border-sc-border rounded-card p-6 md:p-10">
                {submitted ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-sc-tan rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-sc-forest">
                        <path d="M5 14l6 6L23 8"/>
                      </svg>
                    </div>
                    <h2 className="text-xl font-black tracking-tightest text-sc-forest mb-2">¡Mensaje enviado!</h2>
                    <p className="text-sc-muted text-sm mb-6">Gracias por contactarnos. Te responderemos en un plazo de 24 a 48 horas hábiles.</p>
                    <button
                      onClick={() => { setSubmitted(false); setForm({ nombre: '', email: '', asunto: '', mensaje: '' }); }}
                      className="px-6 py-2.5 bg-sc-forest text-sc-cream rounded-pill text-sm font-semibold hover:opacity-80 transition-opacity"
                    >
                      Enviar otro mensaje
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-black tracking-tightest text-sc-forest mb-1">Envíanos un mensaje</h2>
                    <p className="text-sm text-sc-muted mb-6">Completa el formulario y te responderemos a la brevedad.</p>

                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="nombre" className="block text-xs font-bold uppercase tracking-widest text-sc-muted mb-1.5">
                            Nombre completo <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="nombre"
                            name="nombre"
                            type="text"
                            required
                            value={form.nombre}
                            onChange={handleChange}
                            placeholder="Tu nombre"
                            className="w-full px-4 py-2.5 border border-sc-border rounded-sm2 text-sm text-sc-forest placeholder-sc-muted/50 bg-sc-cream focus:outline-none focus:border-sc-forest transition-colors"
                          />
                        </div>
                        <div>
                          <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-sc-muted mb-1.5">
                            Correo electrónico <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={form.email}
                            onChange={handleChange}
                            placeholder="tu@correo.com"
                            className="w-full px-4 py-2.5 border border-sc-border rounded-sm2 text-sm text-sc-forest placeholder-sc-muted/50 bg-sc-cream focus:outline-none focus:border-sc-forest transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="asunto" className="block text-xs font-bold uppercase tracking-widest text-sc-muted mb-1.5">
                          Asunto <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="asunto"
                          name="asunto"
                          required
                          value={form.asunto}
                          onChange={handleChange}
                          className="w-full px-4 py-2.5 border border-sc-border rounded-sm2 text-sm text-sc-forest bg-sc-cream focus:outline-none focus:border-sc-forest transition-colors"
                        >
                          <option value="">Selecciona un asunto</option>
                          <option value="pedido">Consulta sobre mi pedido</option>
                          <option value="envio">Información de envío</option>
                          <option value="reembolso">Solicitud de reembolso</option>
                          <option value="producto">Consulta sobre productos</option>
                          <option value="recompensas">Programa de recompensas</option>
                          <option value="cuenta">Problema con mi cuenta</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="mensaje" className="block text-xs font-bold uppercase tracking-widest text-sc-muted mb-1.5">
                          Mensaje <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="mensaje"
                          name="mensaje"
                          required
                          rows={5}
                          value={form.mensaje}
                          onChange={handleChange}
                          placeholder="Describe tu consulta con el mayor detalle posible..."
                          className="w-full px-4 py-2.5 border border-sc-border rounded-sm2 text-sm text-sc-forest placeholder-sc-muted/50 bg-sc-cream focus:outline-none focus:border-sc-forest transition-colors resize-none"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
                        <p className="text-xs text-sc-muted">
                          Al enviar este formulario aceptas nuestra{' '}
                          <Link href="/privacidad" className="text-sc-forest font-semibold hover:opacity-70 transition-opacity">
                            Política de Privacidad
                          </Link>.
                        </p>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex items-center gap-2 px-6 py-2.5 bg-sc-forest text-sc-cream rounded-pill text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {submitting ? (
                            <>
                              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                              </svg>
                              Enviando...
                            </>
                          ) : (
                            <>
                              Enviar mensaje
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 7h10M8 3l4 4-4 4"/>
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>

              {/* Legal links */}
              <div className="flex flex-wrap gap-3">
                {legalLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center px-4 py-2 bg-white border border-sc-border rounded-pill text-sm font-medium text-sc-forest hover:bg-sc-beige transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
