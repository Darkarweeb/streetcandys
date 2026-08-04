import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Política de Reembolsos | Street Candy's",
  description: "Conoce la política de devoluciones y reembolsos de Street Candy's. Condiciones, plazos y proceso para solicitar un reembolso.",
  openGraph: {
    title: "Política de Reembolsos | Street Candy's",
    description: "Conoce la política de devoluciones y reembolsos de Street Candy's.",
    type: 'website',
    locale: 'es_CO',
    siteName: "Street Candy's",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reembolsos`,
  },
  twitter: {
    card: 'summary',
    title: "Política de Reembolsos | Street Candy's",
    description: "Conoce la política de devoluciones y reembolsos de Street Candy's.",
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reembolsos`,
  },
};

export default function ReembolsosPage() {
  return (
    <LegalLayout currentHref="/reembolsos" breadcrumbLabel="Política de Reembolsos">
      <p className="text-sc-muted text-sm">Última actualización: 3 de agosto de 2025</p>

      <p>
        En <strong>Street Candy's</strong> comercializamos productos de consumo personal sellados (dulces, snacks y confitería). Por la naturaleza de estos productos, nuestra política de devoluciones está sujeta a las excepciones previstas en la ley colombiana. Te pedimos leer esta política con atención antes de realizar tu compra.
      </p>

      <h2>1. No se aceptan devoluciones ni cambios por retracto o cambio de opinión</h2>
      <p>
        Conforme al artículo 47 de la Ley 1480 de 2011 (Estatuto del Consumidor), el derecho de retracto <strong>no aplica</strong> a los productos que comercializamos, dado que se trata de bienes de consumo personal sellados cuya devolución no es procedente por razones de higiene y salud pública. Por lo tanto, <strong>no se aceptan devoluciones ni cambios motivados por retracto, arrepentimiento o cambio de opinión</strong> una vez realizada la compra.
      </p>
      <p>
        Al completar tu pedido, confirmas haber leído y aceptado esta política.
      </p>

      <h2>2. Garantía legal por defectos de fabricación o daño en el envío</h2>
      <p>
        La garantía legal establecida en la Ley 1480 de 2011 <strong>sí aplica</strong> en los siguientes casos:
      </p>
      <ul>
        <li><strong>Defecto de fabricación:</strong> el producto presenta una falla o deterioro originado en el proceso de producción, no atribuible al cliente.</li>
        <li><strong>Daño en el envío:</strong> el producto llegó dañado como consecuencia del transporte, siempre que el empaque y los sellos estén intactos al momento de la recepción (ver sección 3).</li>
      </ul>
      <p>
        Para hacer válida la garantía, el cliente debe <strong>reportar el inconveniente dentro de los 5 días calendario siguientes a la fecha de entrega</strong>, contactándonos por WhatsApp al número{' '}
        <a href="https://wa.me/573115397983" target="_blank" rel="noopener noreferrer">
          +57 311 539 7983
        </a>{' '}
        con las siguientes evidencias:
      </p>
      <ul>
        <li>Número de pedido.</li>
        <li>Fotografías claras del producto y del empaque, mostrando el defecto o daño reportado.</li>
        <li>Descripción breve del problema.</li>
      </ul>
      <p>
        Los reportes realizados fuera de este plazo o sin las evidencias requeridas no podrán ser atendidos.
      </p>

      <h2>3. Requisito para reclamos por daño en el envío: producto sin abrir y sellos intactos</h2>
      <p>
        Para que un reclamo por daño en el envío sea procedente, el producto debe encontrarse <strong>sin abrir y con todos sus sellos de fábrica intactos</strong> al momento de la recepción. Si el empaque exterior presenta daños visibles al recibir el pedido, te recomendamos documentarlo fotográficamente antes de abrirlo y contactarnos de inmediato.
      </p>
      <p>
        No se aceptarán reclamos por daño en el envío sobre productos que hayan sido abiertos o cuyos sellos hayan sido retirados.
      </p>

      <h2>4. Remedios aplicables en casos de garantía</h2>
      <p>
        Una vez verificado y aprobado el reclamo por garantía, procederá, a elección de Street Candy's según disponibilidad:
      </p>
      <ul>
        <li><strong>Reposición del producto:</strong> envío de un producto nuevo en reemplazo del defectuoso o dañado, sin costo adicional para el cliente.</li>
        <li><strong>Reembolso:</strong> devolución del valor pagado por el producto afectado al mismo método de pago utilizado en la compra.</li>
      </ul>
      <p>
        Los costos de logística derivados de la garantía corren por cuenta de Street Candy's cuando el reclamo sea procedente.
      </p>

      <h2>5. Contacto para garantías</h2>
      <p>
        Todos los reclamos de garantía deben gestionarse exclusivamente a través de WhatsApp al{' '}
        <a href="https://wa.me/573115397983" target="_blank" rel="noopener noreferrer">
          +57 311 539 7983
        </a>
        , dentro del plazo indicado en la sección 2, adjuntando las fotografías y el número de pedido. Nuestro equipo te responderá en un plazo máximo de <strong>3 días hábiles</strong>.
      </p>

      <hr />
      <p className="text-xs text-sc-muted">
        Esta política aplica a todos los pedidos realizados en Colombia. Street Candy's se reserva el derecho de actualizar esta política en cualquier momento, publicando la versión vigente en esta página.
      </p>
    </LegalLayout>
  );
}
