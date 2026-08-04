'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/admin/AdminLayout';

interface AnnouncementForm {
  title: string;
  message: string;
  action_url: string;
  target: 'all' | 'co' | 'cr';
}

const INITIAL_FORM: AnnouncementForm = {
  title: '',
  message: '',
  action_url: '',
  target: 'all',
};

const TARGET_OPTIONS = [
  { value: 'all', label: 'Todos los clientes', flag: '🌎' },
  { value: 'co',  label: 'Colombia',           flag: '🇨🇴' },
  { value: 'cr',  label: 'Costa Rica',         flag: '🇨🇷' },
];

const ANNOUNCEMENT_TEMPLATES = [
  {
    title: 'Nuevos productos disponibles',
    message: 'Tenemos nuevos productos en nuestra tienda. ¡Visítanos y descubre las novedades!',
    action_url: '/productos',
  },
  {
    title: 'Promoción especial este fin de semana',
    message: 'Aprovecha nuestras ofertas exclusivas este fin de semana. Descuentos en productos seleccionados.',
    action_url: '/productos',
  },
  {
    title: 'Mantenimiento programado',
    message: 'Realizaremos mantenimiento en nuestra plataforma. Es posible que el servicio presente interrupciones breves.',
    action_url: '',
  },
];

export default function AnunciosAdminPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<AnnouncementForm>(INITIAL_FORM);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; recipients?: number; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/anuncios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          message: form.message.trim(),
          action_url: form.action_url.trim() || null,
          target: form.target,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ success: false, error: data.error || 'Error al enviar el anuncio' });
      } else {
        setResult({ success: true, recipients: data.recipients });
        setForm(INITIAL_FORM);
      }
    } catch {
      setResult({ success: false, error: 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (tpl: typeof ANNOUNCEMENT_TEMPLATES[0]) => {
    setForm((prev) => ({
      ...prev,
      title: tpl.title,
      message: tpl.message,
      action_url: tpl.action_url,
    }));
    setResult(null);
  };

  return (
    <AdminLayout title="Anuncios" subtitle="Envía notificaciones a tus clientes">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Result banner */}
        {result && (
          <div
            className={`rounded-xl px-5 py-4 flex items-start gap-3 ${
              result.success
                ? 'bg-green-50 border border-green-200' :'bg-red-50 border border-red-200'
            }`}
          >
            <span className="text-xl flex-shrink-0">{result.success ? '✅' : '❌'}</span>
            <div>
              {result.success ? (
                <>
                  <p className="text-green-800 font-semibold text-sm">Anuncio enviado exitosamente</p>
                  <p className="text-green-700 text-xs mt-0.5">
                    Notificación enviada a {result.recipients ?? 0} cliente{result.recipients !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-red-800 font-semibold text-sm">Error al enviar</p>
                  <p className="text-red-700 text-xs mt-0.5">{result.error}</p>
                </>
              )}
            </div>
            <button
              onClick={() => setResult(null)}
              className="ml-auto text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )}

        {/* Templates */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Plantillas rápidas</h2>
          <div className="space-y-2">
            {ANNOUNCEMENT_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => applyTemplate(tpl)}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-sc-forest hover:bg-sc-forest/5 transition-colors group"
              >
                <p className="text-sm font-medium text-gray-800 group-hover:text-sc-forest">{tpl.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{tpl.message}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-gray-700">Nuevo anuncio</h2>

          {/* Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destinatarios
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TARGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, target: opt.value as AnnouncementForm['target'] }))}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border text-sm font-medium transition-colors ${
                    form.target === opt.value
                      ? 'border-sc-forest bg-sc-forest text-sc-cream'
                      : 'border-gray-200 text-gray-700 hover:border-sc-forest hover:bg-sc-forest/5'
                  }`}
                >
                  <span className="text-xl">{opt.flag}</span>
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="ann-title" className="block text-sm font-medium text-gray-700 mb-1.5">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              id="ann-title"
              type="text"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ej: Nuevos productos disponibles"
              maxLength={120}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 focus:border-sc-forest"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.title.length}/120</p>
          </div>

          {/* Message */}
          <div>
            <label htmlFor="ann-message" className="block text-sm font-medium text-gray-700 mb-1.5">
              Mensaje <span className="text-red-500">*</span>
            </label>
            <textarea
              id="ann-message"
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Escribe el mensaje que verán los clientes..."
              rows={4}
              maxLength={500}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 focus:border-sc-forest resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.message.length}/500</p>
          </div>

          {/* Action URL */}
          <div>
            <label htmlFor="ann-url" className="block text-sm font-medium text-gray-700 mb-1.5">
              Enlace de acción <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              id="ann-url"
              type="text"
              value={form.action_url}
              onChange={(e) => setForm((p) => ({ ...p, action_url: e.target.value }))}
              placeholder="Ej: /productos o /cuenta/loyalty"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sc-forest/30 focus:border-sc-forest"
            />
            <p className="text-xs text-gray-400 mt-1">
              Ruta interna (ej: /productos) o URL completa. Los clientes verán un botón "Ver detalle".
            </p>
          </div>

          {/* Preview */}
          {(form.title || form.message) && (
            <div className="rounded-lg border border-dashed border-gray-300 p-4 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Vista previa</p>
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-sc-forest/10 flex items-center justify-center text-base flex-shrink-0">
                  📢
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{form.title || 'Título del anuncio'}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {form.message || 'Mensaje del anuncio...'}
                  </p>
                  {form.action_url && (
                    <p className="text-xs text-sc-periwinkle font-medium mt-1">Ver detalle →</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={sending || !form.title.trim() || !form.message.trim()}
            className="w-full py-3 bg-sc-forest text-sc-cream font-semibold rounded-lg hover:bg-sc-forest/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <span className="w-4 h-4 border-2 border-sc-cream border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 2L2 7l5 2 2 5 5-12z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                Enviar anuncio
              </>
            )}
          </button>
        </form>

        {/* Info card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <span className="text-lg flex-shrink-0">ℹ️</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Sobre los anuncios</p>
              <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
                <li>Los anuncios aparecen en el Centro de Notificaciones de cada cliente</li>
                <li>Los clientes reciben la notificación en tiempo real si están conectados</li>
                <li>Puedes segmentar por país: Colombia, Costa Rica o todos</li>
                <li>Solo se envían a clientes con cuenta activa</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
