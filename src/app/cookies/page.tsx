import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Política de Cookies | Street Candy's",
  description: "Información sobre el uso de cookies en el sitio web de Street Candy's. Conoce qué cookies usamos y cómo gestionarlas.",
  openGraph: {
    title: "Política de Cookies | Street Candy's",
    description: "Información sobre el uso de cookies en el sitio web de Street Candy's.",
    type: 'website',
    locale: 'es_CO',
    siteName: "Street Candy's",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/cookies`,
  },
  twitter: {
    card: 'summary',
    title: "Política de Cookies | Street Candy's",
    description: "Información sobre el uso de cookies en el sitio web de Street Candy's.",
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/cookies`,
  },
};

export default function CookiesPage() {
  return (
    <LegalLayout currentHref="/cookies" breadcrumbLabel="Política de Cookies">
      <p className="text-sc-muted text-sm">Última actualización: 1 de agosto de 2025</p>

      <p>
        Esta Política de Cookies explica qué son las cookies, cómo las utilizamos en el sitio web de <strong>Street Candy's</strong> y cómo puedes controlar su uso. Al continuar navegando en nuestro sitio, aceptas el uso de cookies según lo descrito en esta política.
      </p>

      <h2>1. ¿Qué son las Cookies?</h2>
      <p>
        Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (computadora, teléfono o tablet) cuando visitas un sitio web. Permiten que el sitio recuerde tus acciones y preferencias durante un período de tiempo, para que no tengas que volver a configurarlas cada vez que regreses.
      </p>

      <h2>2. Tipos de Cookies que Usamos</h2>

      <h3>2.1 Cookies Estrictamente Necesarias</h3>
      <p>
        Estas cookies son esenciales para el funcionamiento del sitio y no pueden desactivarse. Incluyen:
      </p>
      <ul>
        <li><strong>Sesión de usuario:</strong> mantienen tu sesión activa mientras navegas.</li>
        <li><strong>Carrito de compras:</strong> recuerdan los productos que has añadido al carrito.</li>
        <li><strong>Seguridad:</strong> protegen contra ataques CSRF y otras amenazas.</li>
        <li><strong>Preferencias de país:</strong> recuerdan tu país seleccionado para mostrar precios correctos.</li>
      </ul>

      <h3>2.2 Cookies de Rendimiento y Análisis</h3>
      <p>
        Nos ayudan a entender cómo los visitantes interactúan con el sitio, lo que nos permite mejorar su funcionamiento:
      </p>
      <ul>
        <li><strong>Análisis de tráfico:</strong> recopilan información sobre páginas visitadas, tiempo de permanencia y fuentes de tráfico.</li>
        <li><strong>Detección de errores:</strong> identifican problemas técnicos para que podamos corregirlos.</li>
      </ul>

      <h3>2.3 Cookies de Funcionalidad</h3>
      <p>
        Permiten que el sitio recuerde tus preferencias para ofrecerte una experiencia más personalizada:
      </p>
      <ul>
        <li><strong>Preferencias de idioma:</strong> recuerdan el idioma seleccionado.</li>
        <li><strong>Historial de navegación:</strong> muestran productos vistos recientemente.</li>
        <li><strong>Listas de favoritos:</strong> guardan tus productos favoritos entre sesiones.</li>
      </ul>

      <h3>2.4 Cookies de Marketing</h3>
      <p>
        Se utilizan para mostrarte publicidad relevante y medir la efectividad de nuestras campañas. Solo se activan con tu consentimiento:
      </p>
      <ul>
        <li><strong>Retargeting:</strong> permiten mostrar anuncios personalizados en otras plataformas.</li>
        <li><strong>Redes sociales:</strong> facilitan compartir contenido en redes sociales.</li>
      </ul>

      <h2>3. Cookies de Terceros</h2>
      <p>
        Algunos de nuestros socios y proveedores de servicios también pueden establecer cookies en tu dispositivo:
      </p>
      <ul>
        <li><strong>Stripe:</strong> para el procesamiento seguro de pagos.</li>
        <li><strong>Supabase:</strong> para la gestión de autenticación y base de datos.</li>
        <li><strong>Google Analytics:</strong> para análisis de tráfico (si está habilitado).</li>
      </ul>
      <p>
        Estos terceros tienen sus propias políticas de privacidad y cookies, sobre las cuales no tenemos control directo.
      </p>

      <h2>4. Duración de las Cookies</h2>
      <p>Las cookies pueden ser:</p>
      <ul>
        <li><strong>De sesión:</strong> se eliminan automáticamente cuando cierras el navegador.</li>
        <li><strong>Persistentes:</strong> permanecen en tu dispositivo por un período determinado (generalmente entre 30 días y 2 años) o hasta que las elimines manualmente.</li>
      </ul>

      <h2>5. Cómo Gestionar las Cookies</h2>
      <p>
        Puedes controlar y gestionar las cookies de varias formas:
      </p>

      <h3>5.1 Configuración del Navegador</h3>
      <p>
        La mayoría de los navegadores te permiten ver, eliminar y bloquear cookies. Consulta la ayuda de tu navegador para instrucciones específicas:
      </p>
      <ul>
        <li><strong>Google Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
        <li><strong>Mozilla Firefox:</strong> Opciones → Privacidad y seguridad → Cookies</li>
        <li><strong>Safari:</strong> Preferencias → Privacidad → Cookies</li>
        <li><strong>Microsoft Edge:</strong> Configuración → Privacidad → Cookies</li>
      </ul>

      <h3>5.2 Consecuencias de Desactivar Cookies</h3>
      <p>
        Si desactivas las cookies necesarias, algunas funciones del sitio pueden no funcionar correctamente, incluyendo el inicio de sesión, el carrito de compras y el proceso de pago.
      </p>

      <h2>6. Actualizaciones de esta Política</h2>
      <p>
        Podemos actualizar esta Política de Cookies para reflejar cambios en nuestras prácticas o en la normativa aplicable. Te notificaremos sobre cambios significativos mediante un aviso en el sitio.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Si tienes preguntas sobre el uso de cookies, contáctanos a través de nuestra página de <a href="/contacto">Contacto</a>.
      </p>

      <hr />
      <p className="text-xs text-sc-muted">
        Esta política aplica a todos los usuarios de Street Candy's en Colombia y Costa Rica.
      </p>
    </LegalLayout>
  );
}
