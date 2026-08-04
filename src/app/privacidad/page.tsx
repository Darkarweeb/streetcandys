import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Política de Privacidad | Street Candy's",
  description: "Conoce cómo Street Candy's recopila, usa y protege tu información personal. Política de privacidad completa y transparente.",
  openGraph: {
    title: "Política de Privacidad | Street Candy's",
    description: "Conoce cómo Street Candy's recopila, usa y protege tu información personal.",
    type: 'website',
    locale: 'es_CO',
    siteName: "Street Candy's",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/privacidad`,
  },
  twitter: {
    card: 'summary',
    title: "Política de Privacidad | Street Candy's",
    description: "Conoce cómo Street Candy's recopila, usa y protege tu información personal.",
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/privacidad`,
  },
};

export default function PrivacidadPage() {
  return (
    <LegalLayout currentHref="/privacidad" breadcrumbLabel="Política de Privacidad">
      <p className="text-sc-muted text-sm">Última actualización: 1 de agosto de 2025</p>

      <p>
        En <strong>Street Candy's</strong> nos comprometemos a proteger tu privacidad y a tratar tus datos personales con total transparencia. Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y protegemos la información que nos proporcionas al usar nuestro sitio web y servicios.
      </p>

      <h2>1. Responsable del Tratamiento</h2>
      <p>
        El responsable del tratamiento de tus datos personales es <strong>Street Candy's</strong>, empresa dedicada a la comercialización de productos derivados del cáñamo industrial legalmente cultivado. Puedes contactarnos a través de nuestra página de <a href="/contacto">Contacto</a>.
      </p>

      <h2>2. Información que Recopilamos</h2>
      <p>Recopilamos los siguientes tipos de información:</p>
      <ul>
        <li><strong>Información de registro:</strong> nombre completo, dirección de correo electrónico y contraseña cuando creas una cuenta.</li>
        <li><strong>Información de perfil:</strong> país de residencia, número de teléfono y preferencias de comunicación.</li>
        <li><strong>Información de compra:</strong> dirección de envío, historial de pedidos y métodos de pago (procesados de forma segura por terceros).</li>
        <li><strong>Información de navegación:</strong> dirección IP, tipo de navegador, páginas visitadas y tiempo de permanencia, recopilados mediante cookies y tecnologías similares.</li>
        <li><strong>Comunicaciones:</strong> mensajes que nos envíes a través del formulario de contacto o correo electrónico.</li>
      </ul>

      <h2>3. Finalidad del Tratamiento</h2>
      <p>Utilizamos tu información para:</p>
      <ul>
        <li>Gestionar tu cuenta y procesar tus pedidos.</li>
        <li>Enviarte confirmaciones de compra y actualizaciones de envío.</li>
        <li>Administrar el programa de recompensas y puntos acumulados.</li>
        <li>Enviarte comunicaciones de marketing si has dado tu consentimiento.</li>
        <li>Mejorar nuestros productos, servicios y experiencia de usuario.</li>
        <li>Cumplir con obligaciones legales y regulatorias.</li>
        <li>Verificar que cumples con los requisitos de edad legal para adquirir nuestros productos.</li>
      </ul>

      <h2>4. Base Legal del Tratamiento</h2>
      <p>El tratamiento de tus datos se basa en:</p>
      <ul>
        <li><strong>Ejecución de contrato:</strong> para procesar pedidos y gestionar tu cuenta.</li>
        <li><strong>Consentimiento:</strong> para el envío de comunicaciones de marketing y el uso de cookies no esenciales.</li>
        <li><strong>Interés legítimo:</strong> para mejorar nuestros servicios y prevenir fraudes.</li>
        <li><strong>Obligación legal:</strong> para cumplir con normativas aplicables.</li>
      </ul>

      <h2>5. Compartición de Datos</h2>
      <p>
        No vendemos ni alquilamos tu información personal a terceros. Podemos compartir tus datos con:
      </p>
      <ul>
        <li><strong>Proveedores de servicios:</strong> empresas de logística y envío, procesadores de pago y proveedores de tecnología que nos ayudan a operar el sitio.</li>
        <li><strong>Autoridades competentes:</strong> cuando sea requerido por ley o para proteger nuestros derechos legales.</li>
      </ul>
      <p>Todos nuestros proveedores están sujetos a acuerdos de confidencialidad y solo pueden usar tus datos para los fines que les indicamos.</p>

      <h2>6. Transferencias Internacionales</h2>
      <p>
        Algunos de nuestros proveedores de servicios pueden estar ubicados fuera de tu país de residencia. En estos casos, nos aseguramos de que existan garantías adecuadas para proteger tu información, como cláusulas contractuales estándar o marcos de privacidad reconocidos.
      </p>

      <h2>7. Retención de Datos</h2>
      <p>
        Conservamos tus datos personales durante el tiempo necesario para cumplir con los fines descritos en esta política, o según lo requiera la ley. Los datos de cuenta se mantienen mientras tu cuenta esté activa. Los datos de transacciones se conservan por el período exigido por la normativa fiscal aplicable.
      </p>

      <h2>8. Tus Derechos</h2>
      <p>Dependiendo de tu país de residencia, puedes tener los siguientes derechos:</p>
      <ul>
        <li><strong>Acceso:</strong> solicitar una copia de los datos que tenemos sobre ti.</li>
        <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
        <li><strong>Eliminación:</strong> solicitar la eliminación de tus datos personales.</li>
        <li><strong>Portabilidad:</strong> recibir tus datos en un formato estructurado y legible.</li>
        <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos para fines de marketing.</li>
        <li><strong>Limitación:</strong> solicitar la restricción del tratamiento en determinadas circunstancias.</li>
      </ul>
      <p>Para ejercer cualquiera de estos derechos, contáctanos a través de nuestra página de <a href="/contacto">Contacto</a>.</p>

      <h2>9. Seguridad</h2>
      <p>
        Implementamos medidas técnicas y organizativas apropiadas para proteger tu información contra acceso no autorizado, pérdida o divulgación. Esto incluye cifrado SSL/TLS, acceso restringido a datos personales y revisiones periódicas de seguridad.
      </p>

      <h2>10. Cookies</h2>
      <p>
        Utilizamos cookies y tecnologías similares para mejorar tu experiencia. Consulta nuestra <a href="/cookies">Política de Cookies</a> para más información.
      </p>

      <h2>11. Menores de Edad</h2>
      <p>
        Nuestros productos están destinados exclusivamente a personas mayores de 18 años (o la edad legal aplicable en tu país). No recopilamos intencionalmente información de menores de edad. Si crees que hemos recopilado datos de un menor, contáctanos de inmediato.
      </p>

      <h2>12. Cambios a esta Política</h2>
      <p>
        Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos sobre cambios significativos por correo electrónico o mediante un aviso destacado en nuestro sitio web. La fecha de la última actualización siempre estará indicada al inicio de este documento.
      </p>

      <h2>13. Contacto</h2>
      <p>
        Si tienes preguntas sobre esta política o sobre el tratamiento de tus datos, puedes contactarnos a través de nuestra página de <a href="/contacto">Contacto</a>.
      </p>

      <hr />
      <p className="text-xs text-sc-muted">
        Esta política aplica a todos los usuarios de Street Candy's en Colombia y Costa Rica.
      </p>
    </LegalLayout>
  );
}
