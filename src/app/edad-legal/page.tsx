import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Verificación de Edad | Street Candy's",
  description: "Política de verificación de edad de Street Candy's. Nuestros productos están destinados exclusivamente a mayores de 18 años.",
  openGraph: {
    title: "Verificación de Edad | Street Candy's",
    description: "Política de verificación de edad de Street Candy's.",
    type: 'website',
    locale: 'es_CO',
    siteName: "Street Candy's",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/edad-legal`,
  },
  twitter: {
    card: 'summary',
    title: "Verificación de Edad | Street Candy's",
    description: "Política de verificación de edad de Street Candy's.",
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/edad-legal`,
  },
};

export default function EdadLegalPage() {
  return (
    <LegalLayout currentHref="/edad-legal" breadcrumbLabel="Verificación de Edad">
      <p className="text-sc-muted text-sm">Última actualización: 1 de agosto de 2025</p>

      {/* Age notice banner */}
      <div className="not-prose my-6 bg-sc-darkforest text-sc-cream rounded-card p-6 flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-sc-cream/10 rounded-full flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <div>
          <p className="font-black text-lg tracking-tightest mb-1">Solo para mayores de 18 años</p>
          <p className="text-sc-cream/70 text-sm leading-relaxed">
            Los productos de Street Candy's están destinados exclusivamente a adultos mayores de 18 años. Al acceder a este sitio y realizar compras, confirmas que cumples con este requisito de edad.
          </p>
        </div>
      </div>

      <h2>1. Requisito de Edad</h2>
      <p>
        <strong>Street Candy's</strong> comercializa productos derivados del cáñamo industrial que están destinados exclusivamente a personas mayores de <strong>18 años</strong> de edad. Este requisito aplica en todos los países donde operamos, incluyendo Colombia y Costa Rica.
      </p>
      <p>
        Al acceder a nuestro sitio web, crear una cuenta o realizar una compra, declaras y garantizas que:
      </p>
      <ul>
        <li>Tienes 18 años de edad o más.</li>
        <li>Cumples con la edad legal requerida en tu país o jurisdicción para adquirir este tipo de productos.</li>
        <li>Comprendes y aceptas los términos de uso de nuestros productos.</li>
      </ul>

      <h2>2. Marco Legal</h2>
      <p>
        Nuestros productos son derivados del cáñamo industrial (<em>Cannabis sativa L.</em>) con contenido de THC dentro de los límites legales establecidos en cada país:
      </p>
      <ul>
        <li><strong>Colombia:</strong> regulado bajo la Ley 1787 de 2016 y sus decretos reglamentarios. Los productos de cáñamo industrial con menos del 1% de THC son legales para adultos mayores de 18 años.</li>
        <li><strong>Costa Rica:</strong> regulado bajo la normativa vigente de productos derivados del cáñamo. Los productos con contenido de THC dentro de los límites legales están permitidos para adultos mayores de 18 años.</li>
      </ul>

      <h2>3. Proceso de Verificación</h2>
      <p>
        Implementamos las siguientes medidas para verificar la edad de nuestros clientes:
      </p>

      <h3>3.1 Verificación en el Registro</h3>
      <p>
        Al crear una cuenta, solicitamos tu fecha de nacimiento. Esta información es utilizada para verificar que cumples con el requisito de edad mínima. No podrás completar el registro si eres menor de 18 años.
      </p>

      <h3>3.2 Verificación en la Entrega</h3>
      <p>
        Nuestros operadores logísticos pueden solicitar identificación oficial al momento de la entrega para confirmar la edad del receptor. Si el receptor no puede demostrar ser mayor de 18 años, el pedido no será entregado y será devuelto.
      </p>

      <h3>3.3 Verificación Adicional</h3>
      <p>
        Nos reservamos el derecho de solicitar documentación adicional de verificación de edad en cualquier momento, especialmente para pedidos de alto valor o en casos donde existan dudas razonables sobre la edad del comprador.
      </p>

      <h2>4. Responsabilidad del Comprador</h2>
      <p>
        Al realizar una compra en Street Candy's, el comprador asume la responsabilidad de:
      </p>
      <ul>
        <li>Confirmar que tiene la edad legal requerida.</li>
        <li>No adquirir productos en nombre de menores de edad.</li>
        <li>Almacenar los productos fuera del alcance de menores de edad.</li>
        <li>Usar los productos de manera responsable y conforme a la ley.</li>
        <li>No revender o distribuir productos a menores de edad.</li>
      </ul>

      <h2>5. Consecuencias del Incumplimiento</h2>
      <p>
        Si descubrimos que un usuario ha proporcionado información falsa sobre su edad:
      </p>
      <ul>
        <li>Su cuenta será suspendida o eliminada de forma inmediata.</li>
        <li>Los pedidos pendientes serán cancelados.</li>
        <li>No se realizarán reembolsos en casos de fraude de edad.</li>
        <li>Nos reservamos el derecho de reportar el incidente a las autoridades competentes.</li>
      </ul>

      <h2>6. Protección de Menores</h2>
      <p>
        Street Candy's está comprometido con la protección de los menores de edad. Tomamos las siguientes medidas adicionales:
      </p>
      <ul>
        <li>No dirigimos publicidad a menores de edad.</li>
        <li>No recopilamos datos personales de menores de edad.</li>
        <li>Nuestro contenido de marketing está diseñado para audiencias adultas.</li>
        <li>Colaboramos con las autoridades en cualquier investigación relacionada con el acceso de menores a nuestros productos.</li>
      </ul>

      <h2>7. Uso Responsable</h2>
      <p>
        Además del requisito de edad, promovemos el uso responsable de nuestros productos:
      </p>
      <ul>
        <li>No consumas nuestros productos si estás embarazada o en período de lactancia.</li>
        <li>No combines nuestros productos con alcohol u otras sustancias sin consultar a un médico.</li>
        <li>No operes maquinaria pesada o vehículos bajo los efectos de nuestros productos.</li>
        <li>Consulta a un profesional de la salud si tienes condiciones médicas preexistentes.</li>
        <li>Mantén los productos en un lugar seguro, fuera del alcance de niños y mascotas.</li>
      </ul>

      <h2>8. Contacto</h2>
      <p>
        Si tienes preguntas sobre nuestra política de verificación de edad o deseas reportar el acceso de un menor a nuestros productos, contáctanos a través de nuestra página de <a href="/contacto">Contacto</a>.
      </p>

      <hr />
      <p className="text-xs text-sc-muted">
        Esta política aplica a todos los usuarios de Street Candy's en Colombia y Costa Rica. El incumplimiento de los requisitos de edad puede resultar en consecuencias legales.
      </p>
    </LegalLayout>
  );
}
