import React from 'react';
import type { Metadata } from 'next';
import LegalLayout from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Política de Envíos | Street Candy's",
  description: "Todo sobre envíos de Street Candy's: tiempos de entrega, costos, zonas de cobertura y condiciones para Colombia y Costa Rica.",
  openGraph: {
    title: "Política de Envíos | Street Candy's",
    description: "Todo sobre envíos de Street Candy's: tiempos de entrega, costos y zonas de cobertura.",
    type: 'website',
    locale: 'es_CO',
    siteName: "Street Candy's",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/envios`,
  },
  twitter: {
    card: 'summary',
    title: "Política de Envíos | Street Candy's",
    description: "Todo sobre envíos de Street Candy's: tiempos de entrega, costos y zonas de cobertura.",
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/envios`,
  },
};

export default function EnviosPage() {
  return (
    <LegalLayout currentHref="/envios" breadcrumbLabel="Política de Envíos">
      <p className="text-sc-muted text-sm">Última actualización: 1 de agosto de 2025</p>

      <p>
        En <strong>Street Candy's</strong> nos esforzamos por entregar tus pedidos de forma rápida, segura y discreta. Esta política describe todo lo que necesitas saber sobre nuestro proceso de envío.
      </p>

      <h2>1. Zonas de Cobertura</h2>
      <p>Actualmente realizamos envíos a:</p>
      <ul>
        <li><strong>Colombia:</strong> a todo el territorio nacional, incluyendo ciudades principales, municipios y zonas rurales con cobertura de operadores logísticos.</li>
        <li><strong>Costa Rica:</strong> a todo el territorio nacional, incluyendo el Gran Área Metropolitana y provincias.</li>
      </ul>
      <p>
        No realizamos envíos internacionales fuera de estos dos países en este momento.
      </p>

      <h2>2. Tiempos de Procesamiento</h2>
      <p>
        Una vez confirmado y pagado tu pedido:
      </p>
      <ul>
        <li><strong>Procesamiento:</strong> entre 1 y 2 días hábiles para preparar y despachar tu pedido.</li>
        <li>Los pedidos realizados después de las 2:00 p.m. (hora local) o en días no hábiles serán procesados el siguiente día hábil.</li>
        <li>En temporadas de alta demanda (fechas especiales, promociones), el tiempo de procesamiento puede extenderse hasta 3 días hábiles.</li>
      </ul>

      <h2>3. Tiempos de Entrega</h2>

      <h3>3.1 Colombia</h3>
      <ul>
        <li><strong>Ciudades principales</strong> (Bogotá, Medellín, Cali, Barranquilla, Cartagena): 2 a 4 días hábiles.</li>
        <li><strong>Ciudades intermedias:</strong> 3 a 5 días hábiles.</li>
        <li><strong>Municipios y zonas rurales:</strong> 5 a 8 días hábiles.</li>
      </ul>

      <h3>3.2 Costa Rica</h3>
      <ul>
        <li><strong>Gran Área Metropolitana</strong> (San José, Alajuela, Heredia, Cartago): 2 a 3 días hábiles.</li>
        <li><strong>Otras provincias:</strong> 3 a 5 días hábiles.</li>
        <li><strong>Zonas remotas:</strong> 5 a 7 días hábiles.</li>
      </ul>

      <p>
        Los tiempos indicados son estimados y pueden variar por factores externos como condiciones climáticas, días festivos o situaciones de fuerza mayor.
      </p>

      <h2>4. Costos de Envío</h2>

      <h3>4.1 Colombia</h3>
      <ul>
        <li><strong>Envío gratis</strong> en compras superiores a <strong>$350.000 COP</strong>.</li>
        <li>Para compras menores, el costo de envío se calcula según el destino y el peso del paquete, y se muestra durante el proceso de pago.</li>
      </ul>

      <h3>4.2 Costa Rica</h3>
      <ul>
        <li><strong>Envío gratis</strong> en compras superiores a <strong>₡45.000 CRC</strong>.</li>
        <li>Para compras menores, el costo de envío se calcula según el destino y el peso del paquete, y se muestra durante el proceso de pago.</li>
      </ul>

      <h2>5. Seguimiento del Pedido</h2>
      <p>
        Una vez despachado tu pedido, recibirás un correo electrónico con el número de guía y el enlace para rastrear tu envío en tiempo real. También puedes consultar el estado de tu pedido en tu <a href="/cuenta/pedidos">historial de pedidos</a>.
      </p>

      <h2>6. Empaque y Discreción</h2>
      <p>
        Todos nuestros pedidos se envían en empaques discretos y seguros, sin indicaciones externas sobre el contenido. Nos preocupamos por tu privacidad en cada entrega.
      </p>

      <h2>7. Intentos de Entrega</h2>
      <p>
        El operador logístico realizará hasta 3 intentos de entrega. Si no es posible entregar el paquete después de estos intentos, será devuelto a nuestras instalaciones. En este caso, te contactaremos para coordinar una nueva entrega (con costo adicional) o gestionar el reembolso según nuestra <a href="/reembolsos">Política de Reembolsos</a>.
      </p>

      <h2>8. Paquetes Dañados o Perdidos</h2>
      <p>
        Si recibes un paquete dañado o tu pedido no llega en el plazo estimado:
      </p>
      <ul>
        <li>Contáctanos dentro de los 5 días hábiles siguientes a la fecha estimada de entrega.</li>
        <li>Proporciona fotos del paquete dañado (si aplica) y el número de pedido.</li>
        <li>Investigaremos el caso con el operador logístico y te ofreceremos una solución en un plazo máximo de 5 días hábiles.</li>
      </ul>

      <h2>9. Dirección de Entrega Incorrecta</h2>
      <p>
        Es responsabilidad del cliente proporcionar una dirección de entrega correcta y completa. Street Candy's no se hace responsable por retrasos o no entregas causados por información de dirección incorrecta o incompleta. Si necesitas modificar la dirección de entrega, contáctanos inmediatamente después de realizar el pedido.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Para consultas sobre el estado de tu envío o cualquier problema con la entrega, contáctanos a través de nuestra página de <a href="/contacto">Contacto</a>.
      </p>

      <hr />
      <p className="text-xs text-sc-muted">
        Esta política aplica a todos los pedidos realizados en Colombia y Costa Rica.
      </p>
    </LegalLayout>
  );
}
