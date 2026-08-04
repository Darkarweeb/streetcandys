import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Términos y Condiciones | Street Candy's",
  description: "Lee los términos y condiciones de uso de Street Candy's. Conoce tus derechos y obligaciones al usar nuestra plataforma.",
  openGraph: {
    title: "Términos y Condiciones | Street Candy's",
    description: "Lee los términos y condiciones de uso de Street Candy's.",
    type: 'website',
    locale: 'es_CO',
    siteName: "Street Candy's",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/terminos`,
  },
  twitter: {
    card: 'summary',
    title: "Términos y Condiciones | Street Candy's",
    description: "Lee los términos y condiciones de uso de Street Candy's.",
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/terminos`,
  },
};

export default function TerminosPage() {
  return (
    <LegalLayout currentHref="/terminos" breadcrumbLabel="Términos y Condiciones">
      <p className="text-sc-muted text-sm">Última actualización: 1 de agosto de 2025</p>

      <p>
        Bienvenido a <strong>Street Candy's</strong>. Al acceder y utilizar nuestro sitio web y servicios, aceptas quedar vinculado por estos Términos y Condiciones. Si no estás de acuerdo con alguna parte de estos términos, te pedimos que no uses nuestros servicios.
      </p>

      <h2>1. Aceptación de los Términos</h2>
      <p>
        Al crear una cuenta, realizar una compra o simplemente navegar por nuestro sitio, confirmas que has leído, entendido y aceptado estos Términos y Condiciones, así como nuestra <a href="/privacidad">Política de Privacidad</a>. Estos términos constituyen un acuerdo legalmente vinculante entre tú y Street Candy's.
      </p>

      <h2>2. Requisitos de Edad</h2>
      <p>
        Nuestros productos están destinados exclusivamente a personas mayores de 18 años. Al usar nuestro sitio y realizar compras, declaras y garantizas que tienes la edad legal requerida en tu país de residencia. Nos reservamos el derecho de solicitar verificación de edad en cualquier momento. Consulta nuestra <a href="/edad-legal">Política de Verificación de Edad</a> para más detalles.
      </p>

      <h2>3. Descripción del Servicio</h2>
      <p>
        Street Candy's es una tienda en línea que comercializa productos derivados del cáñamo industrial legalmente cultivado, incluyendo gomitas, flores, comestibles, bebidas, pre-rolls, concentrados y paquetes. Operamos en Colombia y Costa Rica, cumpliendo con la normativa vigente en cada país.
      </p>

      <h2>4. Registro de Cuenta</h2>
      <p>Para realizar compras debes crear una cuenta. Al hacerlo, te comprometes a:</p>
      <ul>
        <li>Proporcionar información veraz, precisa y completa.</li>
        <li>Mantener actualizada tu información de cuenta.</li>
        <li>Mantener la confidencialidad de tu contraseña.</li>
        <li>Notificarnos de inmediato ante cualquier uso no autorizado de tu cuenta.</li>
        <li>Ser responsable de todas las actividades realizadas desde tu cuenta.</li>
      </ul>

      <h2>5. Productos y Precios</h2>
      <p>
        Nos esforzamos por mostrar información precisa sobre nuestros productos y precios. Sin embargo:
      </p>
      <ul>
        <li>Los precios están expresados en la moneda local de tu país (COP para Colombia, CRC para Costa Rica).</li>
        <li>Los precios pueden cambiar sin previo aviso.</li>
        <li>En caso de error de precio, nos reservamos el derecho de cancelar pedidos afectados y notificarte.</li>
        <li>Las imágenes de productos son ilustrativas; el producto real puede variar ligeramente.</li>
        <li>La disponibilidad de productos está sujeta a existencias en inventario.</li>
      </ul>

      <h2>6. Proceso de Compra</h2>
      <p>Al realizar un pedido:</p>
      <ul>
        <li>Recibirás una confirmación por correo electrónico con los detalles de tu pedido.</li>
        <li>La confirmación no constituye aceptación definitiva; nos reservamos el derecho de rechazar pedidos por razones válidas.</li>
        <li>El contrato de compraventa se perfecciona cuando el pedido es procesado y enviado.</li>
        <li>Los impuestos aplicables se calcularán según tu país de residencia.</li>
      </ul>

      <h2>7. Pagos</h2>
      <p>
        Aceptamos los métodos de pago disponibles en tu país. Todos los pagos son procesados de forma segura por proveedores de pago certificados. No almacenamos información completa de tarjetas de crédito o débito. Al proporcionar información de pago, garantizas que estás autorizado a usar dicho método.
      </p>

      <h2>8. Envíos y Entregas</h2>
      <p>
        Los tiempos y costos de envío varían según tu ubicación. Consulta nuestra <a href="/envios">Política de Envíos</a> para información detallada sobre plazos, costos y restricciones de entrega.
      </p>

      <h2>9. Devoluciones y Reembolsos</h2>
      <p>
        Nuestra política de devoluciones y reembolsos está detallada en la <a href="/reembolsos">Política de Reembolsos</a>. Te recomendamos leerla antes de realizar una compra.
      </p>

      <h2>10. Programa de Recompensas</h2>
      <p>
        El programa de recompensas de Street Candy's está sujeto a términos específicos que pueden cambiar. Los puntos acumulados no tienen valor monetario y no son transferibles. Nos reservamos el derecho de modificar o cancelar el programa con previo aviso.
      </p>

      <h2>11. Cupones y Descuentos</h2>
      <p>
        Los cupones y códigos de descuento están sujetos a condiciones específicas indicadas en cada promoción. No son acumulables salvo indicación expresa. Nos reservamos el derecho de invalidar cupones obtenidos de forma fraudulenta.
      </p>

      <h2>12. Propiedad Intelectual</h2>
      <p>
        Todo el contenido de este sitio, incluyendo textos, imágenes, logotipos, diseños y software, es propiedad de Street Candy's o de sus licenciantes y está protegido por leyes de propiedad intelectual. Queda prohibida su reproducción, distribución o uso sin autorización expresa.
      </p>

      <h2>13. Limitación de Responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley, Street Candy's no será responsable por daños indirectos, incidentales, especiales o consecuentes derivados del uso de nuestros productos o servicios. Nuestra responsabilidad total no excederá el valor del pedido en cuestión.
      </p>

      <h2>14. Ley Aplicable</h2>
      <p>
        Estos términos se rigen por las leyes del país donde realizas la compra (Colombia o Costa Rica). Cualquier disputa será resuelta ante los tribunales competentes de dicho país.
      </p>

      <h2>15. Modificaciones</h2>
      <p>
        Podemos modificar estos Términos y Condiciones en cualquier momento. Los cambios entrarán en vigor al publicarse en el sitio. El uso continuado de nuestros servicios después de la publicación de cambios constituye tu aceptación de los nuevos términos.
      </p>

      <h2>16. Contacto</h2>
      <p>
        Para cualquier consulta sobre estos términos, contáctanos a través de nuestra página de <a href="/contacto">Contacto</a>.
      </p>

      <hr />
      <p className="text-xs text-sc-muted">
        Estos términos aplican a todos los usuarios de Street Candy's en Colombia y Costa Rica.
      </p>
    </LegalLayout>
  );
}
