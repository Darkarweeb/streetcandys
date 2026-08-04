-- Migration: 10 New Original Educational Blog Articles in Spanish
-- Timestamp: 20260804040000
-- Articles: COA, THCA, Principiantes, Cannabinoides, Terpenos, Cultivo, THC en cuerpo, Sativa/Indica, Almacenamiento, Dosificación

DO $$
DECLARE
  cat_education_id UUID;
  cat_science_id UUID;
  cat_strains_id UUID;
  cat_consumption_id UUID;
  cat_guias_id UUID;
  cat_cultivo_id UUID;
BEGIN

  -- Ensure existing categories are loaded
  SELECT id INTO cat_education_id FROM public.blog_categories WHERE slug = 'cannabis-education' LIMIT 1;
  SELECT id INTO cat_science_id FROM public.blog_categories WHERE slug = 'cannabis-science' LIMIT 1;
  SELECT id INTO cat_strains_id FROM public.blog_categories WHERE slug = 'cannabis-strains' LIMIT 1;
  SELECT id INTO cat_consumption_id FROM public.blog_categories WHERE slug = 'consumption-methods' LIMIT 1;

  -- New category: Guías para Principiantes
  INSERT INTO public.blog_categories (id, name, slug, description, meta_title, meta_description, is_active, sort_order)
  VALUES (
    gen_random_uuid(),
    'Guías para Principiantes',
    'guias-principiantes',
    'Guías completas para quienes se inician en el mundo del cannabis: productos, dosificación, compra responsable y todo lo que necesitas saber.',
    'Guías de Cannabis para Principiantes | Street Candy',
    'Aprende todo sobre cannabis desde cero — guías claras, prácticas y en español para consumidores nuevos y curiosos.',
    true,
    5
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO cat_guias_id FROM public.blog_categories WHERE slug = 'guias-principiantes' LIMIT 1;

  -- New category: Cultivo y Calidad
  INSERT INTO public.blog_categories (id, name, slug, description, meta_title, meta_description, is_active, sort_order)
  VALUES (
    gen_random_uuid(),
    'Cultivo y Calidad',
    'cultivo-calidad',
    'Artículos sobre métodos de cultivo de cannabis, diferencias de calidad entre indoor, outdoor y greenhouse, y cómo el cultivo afecta el producto final.',
    'Cultivo de Cannabis y Calidad | Street Candy Blog',
    'Descubre cómo se cultiva el cannabis y cómo los métodos de producción afectan la calidad, el aroma y los efectos del producto final.',
    true,
    6
  )
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO cat_cultivo_id FROM public.blog_categories WHERE slug = 'cultivo-calidad' LIMIT 1;

  -- ============================================================
  -- ARTICLE 1: Cómo Leer un COA de Cannabis
  -- ============================================================
  INSERT INTO public.blog_posts (
    id, blog_category_id, author_id, title, slug, excerpt, content,
    cover_image_url, tags, status, is_featured, read_time_minutes,
    meta_title, meta_description, published_at
  ) VALUES (
    gen_random_uuid(),
    cat_education_id,
    NULL,
    'Cómo Leer un COA de Cannabis: Guía Completa para Entender las Pruebas de Laboratorio',
    'como-leer-coa-cannabis',
    'El Certificado de Análisis (COA) es el documento más importante para verificar la calidad y seguridad de cualquier producto de cannabis. Aprende a interpretarlo paso a paso.',
    '<article>
<header>
<h1>Cómo Leer un COA de Cannabis: Guía Completa para Entender las Pruebas de Laboratorio</h1>
<p class="meta">Por Equipo Editorial de Street Candy &bull; 4 de agosto de 2026 &bull; 10 min de lectura</p>
</header>

<nav class="toc">
<h2>Tabla de Contenidos</h2>
<ol>
<li><a href="#que-es-coa">¿Qué es un COA?</a></li>
<li><a href="#por-que-importa">Por Qué es Importante el COA</a></li>
<li><a href="#cannabinoides">Sección de Cannabinoides</a></li>
<li><a href="#thca-thc">THCA y THC: La Diferencia Clave</a></li>
<li><a href="#cbd-cbg">CBD, CBG y Otros Cannabinoides</a></li>
<li><a href="#terpenos">Perfil de Terpenos</a></li>
<li><a href="#pruebas-seguridad">Pruebas de Seguridad</a></li>
<li><a href="#potencia-calidad">Potencia y Calidad del Producto</a></li>
<li><a href="#como-verificar">Cómo Verificar un COA</a></li>
<li><a href="#faq">Preguntas Frecuentes</a></li>
</ol>
</nav>

<section id="que-es-coa">
<h2>¿Qué es un COA?</h2>
<p>Un COA, o Certificado de Análisis (del inglés <em>Certificate of Analysis</em>), es un documento oficial emitido por un laboratorio independiente y acreditado que detalla los resultados de las pruebas realizadas a un producto de cannabis. Es, en esencia, el pasaporte de calidad y seguridad de cualquier producto.</p>
<p>Un COA legítimo debe provenir de un laboratorio de terceros — es decir, un laboratorio que no tiene relación comercial con el productor — para garantizar resultados imparciales. Los mejores productores publican sus COAs de forma pública y accesible, ya sea en su sitio web o mediante un código QR en el empaque del producto.</p>
<p>Si un producto de cannabis no tiene COA disponible, eso es una señal de alerta importante. La transparencia en las pruebas de laboratorio es uno de los estándares mínimos de calidad en la industria.</p>
</section>

<section id="por-que-importa">
<h2>Por Qué es Importante el COA</h2>
<p>El COA cumple tres funciones fundamentales para el consumidor:</p>
<ul>
<li><strong>Verificación de potencia:</strong> Confirma los niveles reales de cannabinoides como THCA, THC y CBD, para que sepas exactamente qué tan potente es el producto.</li>
<li><strong>Confirmación de seguridad:</strong> Certifica que el producto no contiene pesticidas, metales pesados, solventes residuales, micotoxinas ni contaminantes microbiológicos por encima de los límites seguros.</li>
<li><strong>Transparencia del productor:</strong> Un COA publicado demuestra que el productor confía en la calidad de su producto y no tiene nada que ocultar.</li>
</ul>
<p>En un mercado donde los productos de cannabis pueden variar enormemente en calidad, el COA es la herramienta más objetiva que tienes como consumidor para tomar decisiones informadas.</p>
</section>

<section id="cannabinoides">
<h2>Sección de Cannabinoides</h2>
<p>La sección de cannabinoides es generalmente la primera y más consultada de un COA. Aquí encontrarás los porcentajes de cada cannabinoide presente en el producto, expresados como porcentaje del peso total.</p>
<p>Los cannabinoides más comunes que verás en un COA incluyen:</p>
<ul>
<li><strong>THCA</strong> — Ácido tetrahidrocannabinólico (la forma ácida del THC)</li>
<li><strong>THC</strong> — Tetrahidrocannabinol (la forma activa)</li>
<li><strong>CBD</strong> — Cannabidiol</li>
<li><strong>CBDA</strong> — Ácido cannabidiólico</li>
<li><strong>CBG</strong> — Cannabigerol</li>
<li><strong>CBN</strong> — Cannabinol</li>
<li><strong>CBC</strong> — Cannabicromeno</li>
</ul>
<p>Los valores se expresan como porcentaje (%) del peso total de la muestra. Un producto con 20% de THCA tiene 200 mg de THCA por cada gramo de producto.</p>
</section>

<section id="thca-thc">
<h2>THCA y THC: La Diferencia Clave</h2>
<p>Esta es una de las partes más confusas del COA para los consumidores nuevos. En la flor de cannabis sin procesar, la mayor parte del cannabinoide psicoactivo existe como THCA, no como THC. El THCA es la forma ácida e inactiva que se convierte en THC mediante el calor (un proceso llamado descarboxilación).</p>
<p>Cuando fumas o vaporizas cannabis, el calor convierte el THCA en THC casi instantáneamente. Por eso, para calcular la potencia real de una flor, debes usar la fórmula de THC total:</p>
<p><strong>THC Total = (THCA × 0.877) + THC</strong></p>
<p>El factor 0.877 representa la pérdida de masa molecular cuando el THCA pierde su grupo ácido carboxílico al convertirse en THC. Si un COA muestra 22% de THCA y 0.5% de THC, el THC total sería aproximadamente 19.8%.</p>
<p>Para los productos comestibles y concentrados, el proceso de fabricación ya ha descarboxilado el THCA, por lo que el COA mostrará principalmente THC directo.</p>
</section>

<section id="cbd-cbg">
<h2>CBD, CBG y Otros Cannabinoides</h2>
<p>Más allá del THC, un buen COA detalla el perfil completo de cannabinoides:</p>
<h3>CBD (Cannabidiol)</h3>
<p>El CBD es el segundo cannabinoide más conocido. No produce efectos psicoactivos por sí solo, pero interactúa con el sistema endocannabinoide de maneras que muchos consumidores encuentran beneficiosas. En flores de cannabis con alto THC, el CBD suele estar presente en niveles bajos (menos del 1%).</p>
<h3>CBG (Cannabigerol)</h3>
<p>El CBG es conocido como el "cannabinoide madre" porque es el precursor del que se derivan el THC y el CBD durante el crecimiento de la planta. Está presente en cantidades pequeñas en la mayoría de las variedades maduras, pero algunas cepas están cultivadas específicamente para tener alto contenido de CBG.</p>
<h3>CBN (Cannabinol)</h3>
<p>El CBN se forma cuando el THC se degrada con el tiempo por exposición al oxígeno y la luz. Niveles altos de CBN en un COA pueden indicar que el producto es viejo o fue almacenado incorrectamente.</p>
</section>

<section id="terpenos">
<h2>Perfil de Terpenos</h2>
<p>Los terpenos son los compuestos aromáticos que dan a cada variedad de cannabis su aroma y sabor únicos. Un COA completo incluirá un perfil de terpenos que lista los terpenos presentes y sus concentraciones, generalmente expresadas en porcentaje o en mg/g.</p>
<p>Los terpenos más comunes que verás incluyen mirceno, limoneno, cariofileno, linalool, pineno y terpinoleno. Cada uno contribuye tanto al aroma como a los efectos del producto a través del llamado "efecto séquito" — la interacción sinérgica entre cannabinoides y terpenos.</p>
<p>Un perfil de terpenos rico y diverso es generalmente indicativo de un producto de alta calidad cultivado con cuidado.</p>
</section>

<section id="pruebas-seguridad">
<h2>Pruebas de Seguridad</h2>
<p>La sección de seguridad del COA es tan importante como la de potencia. Aquí se reportan los resultados de pruebas para contaminantes potencialmente peligrosos:</p>
<h3>Pesticidas</h3>
<p>Los laboratorios prueban para docenas de pesticidas comunes. El resultado debe ser "No Detectado" (ND) o estar por debajo de los límites de acción establecidos por las regulaciones del estado o país.</p>
<h3>Metales Pesados</h3>
<p>El cannabis es una planta bioacumuladora — absorbe metales del suelo. Las pruebas verifican niveles de plomo, arsénico, cadmio y mercurio. Todos deben estar por debajo de los límites seguros.</p>
<h3>Solventes Residuales</h3>
<p>Relevante principalmente para concentrados y extractos, esta prueba verifica que no queden solventes peligrosos (como butano o propano) del proceso de extracción.</p>
<h3>Contaminantes Microbiológicos</h3>
<p>Pruebas para bacterias, hongos y moho. Especialmente importante para consumidores con sistemas inmunes comprometidos.</p>
</section>

<section id="potencia-calidad">
<h2>Potencia y Calidad del Producto</h2>
<p>Un error común es asumir que mayor potencia (más THC) equivale a mejor calidad. La realidad es más matizada. Un producto de alta calidad se caracteriza por:</p>
<ul>
<li>Un perfil de cannabinoides completo y bien equilibrado</li>
<li>Un perfil de terpenos rico y diverso</li>
<li>Resultados limpios en todas las pruebas de seguridad</li>
<li>Consistencia entre lotes (los COAs de diferentes lotes deben ser similares)</li>
</ul>
<p>Dos productos con el mismo porcentaje de THC pueden producir experiencias muy diferentes si tienen perfiles de terpenos distintos. El COA te da la información para entender estas diferencias.</p>
</section>

<section id="como-verificar">
<h2>Cómo Verificar un COA</h2>
<p>Para asegurarte de que un COA es legítimo:</p>
<ol>
<li>Verifica que el laboratorio esté acreditado (busca certificaciones ISO 17025 o equivalentes)</li>
<li>Confirma que la fecha del COA sea reciente (idealmente del mismo lote que estás comprando)</li>
<li>Comprueba que el número de lote en el COA coincida con el del empaque del producto</li>
<li>Busca el laboratorio en línea para confirmar que existe y está acreditado</li>
</ol>
</section>

<section id="faq">
<h2>Preguntas Frecuentes</h2>
<div class="faq-item">
<h3>¿Qué significa "ND" en un COA?</h3>
<p>ND significa "No Detectado" — el laboratorio no encontró ese compuesto en cantidades medibles. Para pesticidas y contaminantes, ND es el resultado ideal.</p>
</div>
<div class="faq-item">
<h3>¿Con qué frecuencia deben actualizarse los COAs?</h3>
<p>Idealmente, cada lote de producción debe tener su propio COA. Los productores responsables actualizan sus COAs con cada nuevo lote, que puede ser cada semana o cada mes dependiendo del volumen de producción.</p>
</div>
<div class="faq-item">
<h3>¿Puedo confiar en un COA del propio productor?</h3>
<p>Los COAs deben provenir de laboratorios de terceros independientes, no del propio productor. Un COA interno no tiene el mismo valor que uno emitido por un laboratorio acreditado sin relación comercial con el productor.</p>
</div>
<div class="faq-item">
<h3>¿Qué hago si un producto no tiene COA disponible?</h3>
<p>Si un productor no puede o no quiere proporcionar un COA, lo más prudente es no comprar ese producto. La falta de transparencia en las pruebas de laboratorio es una señal de alerta importante sobre la calidad y seguridad del producto.</p>
</div>
</section>

<section id="articulos-relacionados">
<h2>Artículos Relacionados</h2>
<ul>
<li><a href="/blog/thca-explicado">THCA Explicado: Qué Es, Cómo Funciona y Por Qué Está Ganando Popularidad</a></li>
<li><a href="/blog/cannabinoides-explicados">Cannabinoides Explicados: THC, CBD, CBG, CBN y Más</a></li>
<li><a href="/blog/terpenos-cannabis">Terpenos del Cannabis: Aromas, Sabores y Perfiles</a></li>
</ul>
</section>
</article>',
    NULL,
    ARRAY['COA cannabis', 'certificado de análisis', 'pruebas de laboratorio cannabis', 'THCA THC diferencia', 'cannabinoides', 'terpenos', 'seguridad cannabis', 'calidad cannabis'],
    'published',
    false,
    10,
    'Cómo Leer un COA de Cannabis: Guía Completa de Pruebas de Laboratorio',
    'Aprende a interpretar un Certificado de Análisis (COA) de cannabis paso a paso: cannabinoides, THCA, THC, CBD, terpenos y pruebas de seguridad explicados en español.',
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- ARTICLE 2: THCA Explicado
  -- ============================================================
  INSERT INTO public.blog_posts (
    id, blog_category_id, author_id, title, slug, excerpt, content,
    cover_image_url, tags, status, is_featured, read_time_minutes,
    meta_title, meta_description, published_at
  ) VALUES (
    gen_random_uuid(),
    cat_science_id,
    NULL,
    'THCA Explicado: Qué Es, Cómo Funciona y Por Qué Está Ganando Popularidad',
    'thca-explicado',
    'El THCA es el cannabinoide más abundante en la flor de cannabis fresca, pero la mayoría de los consumidores no saben exactamente qué es ni cómo se diferencia del THC. Esta guía lo explica todo.',
    '<article>
<header>
<h1>THCA Explicado: Qué Es, Cómo Funciona y Por Qué Está Ganando Popularidad</h1>
<p class="meta">Por Equipo Editorial de Street Candy &bull; 4 de agosto de 2026 &bull; 9 min de lectura</p>
</header>

<nav class="toc">
<h2>Tabla de Contenidos</h2>
<ol>
<li><a href="#que-es-thca">¿Qué es el THCA?</a></li>
<li><a href="#thca-vs-thc">THCA vs THC: Las Diferencias Clave</a></li>
<li><a href="#descarboxilacion">La Descarboxilación: Cómo el THCA se Convierte en THC</a></li>
<li><a href="#flores-thca">Flores THCA: Qué Son y Cómo Funcionan</a></li>
<li><a href="#productos-thca">Productos con THCA Disponibles</a></li>
<li><a href="#leer-coa">Cómo Leer el THCA en un COA</a></li>
<li><a href="#popularidad">Por Qué Está Ganando Popularidad</a></li>
<li><a href="#faq">Preguntas Frecuentes</a></li>
</ol>
</nav>

<section id="que-es-thca">
<h2>¿Qué es el THCA?</h2>
<p>El THCA (ácido tetrahidrocannabinólico) es el cannabinoide más abundante en la planta de cannabis viva y en la flor recién cosechada. Es la forma ácida y precursora del THC — el compuesto psicoactivo más conocido del cannabis.</p>
<p>A diferencia del THC, el THCA en su estado natural no produce efectos psicoactivos. Esto se debe a su estructura molecular: el THCA tiene un grupo carboxílico adicional (-COOH) que le impide unirse eficientemente a los receptores CB1 del sistema endocannabinoide, que son los responsables de los efectos psicoactivos del cannabis.</p>
<p>En términos simples: cuando ves un porcentaje alto de THCA en el COA de una flor de cannabis, estás viendo el potencial de THC que se liberará cuando el producto sea calentado.</p>
</section>

<section id="thca-vs-thc">
<h2>THCA vs THC: Las Diferencias Clave</h2>
<p>Aunque el THCA y el THC son molecularmente muy similares, sus diferencias tienen implicaciones importantes:</p>
<h3>Estructura Molecular</h3>
<p>El THCA tiene la misma estructura base que el THC, pero con un grupo carboxílico adicional. Este grupo extra es lo que hace que el THCA sea más grande y tenga una forma diferente, lo que afecta cómo interactúa con los receptores del cuerpo.</p>
<h3>Efectos Psicoactivos</h3>
<p>El THC se une directamente a los receptores CB1 del cerebro, produciendo los efectos psicoactivos característicos del cannabis. El THCA, debido a su estructura molecular más grande, no se une eficientemente a estos receptores y por lo tanto no produce intoxicación cuando se consume sin calentar.</p>
<h3>Estabilidad</h3>
<p>El THCA es relativamente inestable y se convierte gradualmente en THC con el tiempo, incluso a temperatura ambiente, aunque este proceso es mucho más lento que con calor directo. Por eso, el cannabis almacenado durante mucho tiempo tiende a tener menos THCA y más THC que el cannabis fresco.</p>
<h3>Presencia en el Producto</h3>
<p>En la flor de cannabis sin procesar, la gran mayoría del cannabinoide psicoactivo existe como THCA. El THC libre representa típicamente menos del 1% del total. En concentrados y productos procesados con calor, la proporción se invierte.</p>
</section>

<section id="descarboxilacion">
<h2>La Descarboxilación: Cómo el THCA se Convierte en THC</h2>
<p>La descarboxilación es el proceso químico mediante el cual el THCA pierde su grupo carboxílico y se convierte en THC. Este proceso ocurre cuando el cannabis es expuesto al calor.</p>
<h3>Cómo Ocurre</h3>
<p>Cuando fumas o vaporizas cannabis, las temperaturas altas (generalmente por encima de 105°C) provocan que el grupo carboxílico del THCA se desprenda en forma de dióxido de carbono (CO₂). Lo que queda es el THC activo que produce los efectos psicoactivos.</p>
<p>Este proceso ocurre casi instantáneamente cuando fumas, pero puede ocurrir más lentamente a temperaturas más bajas durante períodos más largos — como cuando horneas cannabis para hacer mantequilla de cannabis para comestibles.</p>
<h3>La Fórmula de Conversión</h3>
<p>No todo el THCA se convierte en THC — hay una pérdida de masa del 12.3% cuando el grupo carboxílico se desprende. Por eso la fórmula es:</p>
<p><strong>THC Total = (THCA × 0.877) + THC</strong></p>
<p>Un producto con 25% de THCA produciría aproximadamente 21.9% de THC después de la descarboxilación completa.</p>
</section>

<section id="flores-thca">
<h2>Flores THCA: Qué Son y Cómo Funcionan</h2>
<p>Las "flores THCA" son simplemente flores de cannabis con alto contenido de THCA — que es, en realidad, como se presenta naturalmente toda la flor de cannabis. El término se usa principalmente en el contexto del mercado de hemp (cáñamo industrial) en Estados Unidos.</p>
<p>Bajo la Ley Agrícola de 2018 de EE. UU., el hemp se define como cannabis con menos del 0.3% de THC en peso seco. Las flores THCA pueden cumplir técnicamente con esta definición porque el THCA no es THC — aunque al ser calentadas producen THC en cantidades significativas.</p>
<p>Esto ha creado un mercado de flores THCA que son esencialmente indistinguibles de la marihuana tradicional en términos de apariencia, aroma y efectos cuando se consumen. Es importante que los consumidores entiendan que estas flores producirán los mismos efectos psicoactivos que el cannabis convencional cuando se fuman o vaporizan.</p>
</section>

<section id="productos-thca">
<h2>Productos con THCA Disponibles</h2>
<p>El THCA está presente en prácticamente todos los productos de cannabis derivados de la flor. Los principales tipos incluyen:</p>
<h3>Flores</h3>
<p>La flor de cannabis es la fuente más directa de THCA. Los porcentajes típicos van del 15% al 30% de THCA en variedades modernas de alta potencia.</p>
<h3>Pre-rolls</h3>
<p>Los cigarrillos de cannabis pre-enrollados contienen la misma flor con su contenido natural de THCA.</p>
<h3>Concentrados</h3>
<p>Algunos concentrados como el "THCA diamonds" o "THCA crystalline" son formas casi puras de THCA (95%+) que se producen mediante procesos de extracción especializados. Estos productos producen efectos muy potentes cuando se vaporizan.</p>
<h3>Tinturas y Productos Crudos</h3>
<p>El jugo de cannabis crudo y algunas tinturas sin calentar contienen THCA en su forma no descarboxilada.</p>
</section>

<section id="leer-coa">
<h2>Cómo Leer el THCA en un COA</h2>
<p>Cuando revises el COA de una flor de cannabis, busca la sección de cannabinoides. Verás el THCA listado como un porcentaje. Para entender la potencia real del producto:</p>
<ol>
<li>Toma el porcentaje de THCA (por ejemplo, 22%)</li>
<li>Multiplícalo por 0.877 (por ejemplo, 22 × 0.877 = 19.3%)</li>
<li>Suma el THC libre que ya aparece en el COA (por ejemplo, 0.4%)</li>
<li>El resultado es el THC total disponible: aproximadamente 19.7%</li>
</ol>
<p>Este número te da una idea más precisa de la potencia real del producto cuando lo consumes con calor.</p>
</section>

<section id="popularidad">
<h2>Por Qué Está Ganando Popularidad</h2>
<p>El THCA ha ganado atención significativa en los últimos años por varias razones:</p>
<ul>
<li><strong>Mayor conciencia del consumidor:</strong> Los consumidores educados ahora entienden que el THCA es el indicador real de potencia en la flor, no el THC libre.</li>
<li><strong>Mercado de hemp:</strong> Las flores THCA han creado un mercado accesible en estados donde el cannabis recreativo aún no es legal.</li>
<li><strong>Interés en consumo crudo:</strong> Algunos consumidores están explorando el consumo de cannabis crudo (jugos, batidos) para obtener THCA sin descarboxilar.</li>
<li><strong>Transparencia de laboratorio:</strong> La proliferación de COAs ha hecho que los consumidores presten más atención a los números de THCA.</li>
</ul>
</section>

<section id="faq">
<h2>Preguntas Frecuentes</h2>
<div class="faq-item">
<h3>¿El THCA te pone "high"?</h3>
<p>El THCA en su forma natural (sin calentar) no produce efectos psicoactivos significativos. Sin embargo, cuando se calienta — al fumar, vaporizar o cocinar — se convierte en THC y sí produce los efectos psicoactivos característicos del cannabis.</p>
</div>
<div class="faq-item">
<h3>¿Cuál es la diferencia entre THCA y THC en un COA?</h3>
<p>En un COA de flor de cannabis, el THCA representa el cannabinoide en su forma ácida natural (la mayoría del total), mientras que el THC representa la pequeña cantidad que ya se ha descarboxilado naturalmente. Para calcular la potencia real, usa la fórmula: THC Total = (THCA × 0.877) + THC.</p>
</div>
<div class="faq-item">
<h3>¿Las flores THCA son legales?</h3>
<p>La legalidad de las flores THCA varía según la jurisdicción. En algunos estados de EE. UU., las flores THCA derivadas de hemp son legales bajo la Ley Agrícola de 2018 si el THC libre está por debajo del 0.3%. Sin embargo, las leyes cambian constantemente y varían por estado. Siempre verifica las regulaciones locales vigentes.</p>
</div>
<div class="faq-item">
<h3>¿Por qué los COAs muestran más THCA que THC en la flor?</h3>
<p>Porque la planta de cannabis produce cannabinoides en su forma ácida (THCA, CBDA, etc.) de manera natural. La conversión a las formas neutras (THC, CBD) requiere calor o tiempo. En la flor fresca, prácticamente todo el cannabinoide psicoactivo existe como THCA.</p>
</div>
</section>

<section id="articulos-relacionados">
<h2>Artículos Relacionados</h2>
<ul>
<li><a href="/blog/como-leer-coa-cannabis">Cómo Leer un COA de Cannabis: Guía Completa</a></li>
<li><a href="/blog/cannabinoides-explicados">Cannabinoides Explicados: THC, CBD, CBG, CBN y Más</a></li>
<li><a href="/blog/guia-principiantes-primer-producto">Guía para Principiantes: Cómo Elegir tu Primer Producto de Cannabis</a></li>
</ul>
</section>
</article>',
    NULL,
    ARRAY['THCA', 'THCA vs THC', 'descarboxilación', 'flores THCA', 'cannabinoides', 'COA cannabis', 'potencia cannabis'],
    'published',
    false,
    9,
    'THCA Explicado: Qué Es, Cómo Funciona y Diferencia con THC',
    'Guía completa sobre el THCA: qué es, cómo se diferencia del THC, el proceso de descarboxilación, flores THCA y cómo leerlo en un COA de laboratorio.',
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- ARTICLE 3: Guía para Principiantes
  -- ============================================================
  INSERT INTO public.blog_posts (
    id, blog_category_id, author_id, title, slug, excerpt, content,
    cover_image_url, tags, status, is_featured, read_time_minutes,
    meta_title, meta_description, published_at
  ) VALUES (
    gen_random_uuid(),
    cat_guias_id,
    NULL,
    'Guía para Principiantes: Cómo Elegir tu Primer Producto de Cannabis',
    'guia-principiantes-primer-producto',
    'Si estás considerando probar cannabis por primera vez o eres nuevo en el mundo de los productos legales, esta guía te ayudará a entender tus opciones y tomar una decisión informada y segura.',
    '<article>
<header>
<h1>Guía para Principiantes: Cómo Elegir tu Primer Producto de Cannabis</h1>
<p class="meta">Por Equipo Editorial de Street Candy &bull; 4 de agosto de 2026 &bull; 11 min de lectura</p>
</header>

<nav class="toc">
<h2>Tabla de Contenidos</h2>
<ol>
<li><a href="#antes-de-empezar">Antes de Empezar: Lo Que Debes Saber</a></li>
<li><a href="#tipos-productos">Tipos de Productos de Cannabis</a></li>
<li><a href="#flores">Flores de Cannabis</a></li>
<li><a href="#gummies">Gummies y Comestibles</a></li>
<li><a href="#vapes">Vapes y Cartuchos</a></li>
<li><a href="#concentrados">Concentrados</a></li>
<li><a href="#factores-compra">Factores Importantes Antes de Comprar</a></li>
<li><a href="#recomendaciones">Recomendaciones para Principiantes</a></li>
<li><a href="#faq">Preguntas Frecuentes</a></li>
</ol>
</nav>

<section id="antes-de-empezar">
<h2>Antes de Empezar: Lo Que Debes Saber</h2>
<p>Elegir tu primer producto de cannabis puede ser abrumador. La variedad de opciones disponibles hoy — flores, gummies, vapes, concentrados, tinturas — es enorme, y cada tipo tiene características, tiempos de inicio y duraciones de efecto muy diferentes.</p>
<p>Lo más importante que debes entender antes de comprar es que no todos los productos de cannabis son iguales. La potencia, la velocidad de inicio de los efectos y la duración varían significativamente según el tipo de producto. Para un principiante, elegir el producto equivocado puede resultar en una experiencia desagradable que no refleja lo que el cannabis puede ofrecer cuando se usa responsablemente.</p>
<p>Esta guía te dará las herramientas para tomar una decisión informada basada en tus preferencias, tu tolerancia y tus objetivos.</p>
</section>

<section id="tipos-productos">
<h2>Tipos de Productos de Cannabis</h2>
<p>El cannabis se puede consumir de muchas formas, y cada método tiene ventajas y desventajas específicas. Los principales tipos son:</p>
<ul>
<li><strong>Flores:</strong> La forma más tradicional — los cogollos de la planta que se fuman o vaporizan</li>
<li><strong>Gummies y comestibles:</strong> Productos alimenticios infusionados con cannabinoides</li>
<li><strong>Vapes:</strong> Dispositivos que calientan aceite de cannabis sin combustión</li>
<li><strong>Concentrados:</strong> Extractos de alta potencia en diversas formas</li>
<li><strong>Tinturas:</strong> Extractos líquidos que se toman bajo la lengua</li>
</ul>
</section>

<section id="flores">
<h2>Flores de Cannabis</h2>
<p>La flor de cannabis es el producto más tradicional y sigue siendo el más popular. Los cogollos se pueden fumar en pipa, en papel de liar o vaporizarse en un dispositivo especializado.</p>
<h3>Ventajas para Principiantes</h3>
<ul>
<li>Los efectos comienzan rápidamente (2-10 minutos), lo que facilita el control de la dosis</li>
<li>La duración es relativamente corta (1-3 horas), lo que reduce el riesgo de una experiencia prolongada no deseada</li>
<li>Hay una gran variedad de opciones con diferentes perfiles de cannabinoides y terpenos</li>
</ul>
<h3>Consideraciones</h3>
<p>Fumar implica combustión, que produce subproductos que algunos consumidores prefieren evitar. La vaporización es una alternativa que calienta la flor sin quemarla, produciendo vapor en lugar de humo.</p>
<h3>Potencia Recomendada para Principiantes</h3>
<p>Para tu primera experiencia, busca flores con un THC total entre 10% y 15%. Las variedades de alta potencia (25%+) pueden ser abrumadoras para alguien sin tolerancia establecida.</p>
</section>

<section id="gummies">
<h2>Gummies y Comestibles</h2>
<p>Los gummies y otros comestibles infusionados con cannabinoides son una opción popular por su discreción y facilidad de dosificación. Sin embargo, son probablemente el tipo de producto más arriesgado para principiantes si no se usan con cuidado.</p>
<h3>El Problema del Tiempo de Inicio</h3>
<p>Los comestibles deben pasar por el sistema digestivo antes de que los cannabinoides lleguen al torrente sanguíneo. Esto significa que los efectos pueden tardar entre 30 minutos y 2 horas en aparecer — y pueden durar entre 4 y 8 horas.</p>
<p>El error más común de los principiantes con comestibles es consumir más porque "no sienten nada" después de 30 minutos, solo para que los efectos de ambas dosis lleguen juntos y sean abrumadores.</p>
<h3>Regla de Oro para Principiantes con Comestibles</h3>
<p>Empieza con una dosis de 2.5 mg a 5 mg de THC. Espera al menos 2 horas antes de considerar tomar más. Esta paciencia es fundamental para una experiencia positiva.</p>
</section>

<section id="vapes">
<h2>Vapes y Cartuchos</h2>
<p>Los vapes de cannabis son dispositivos que calientan aceite de cannabis concentrado hasta producir vapor. Son discretos, convenientes y no requieren encendedor ni preparación.</p>
<h3>Tipos de Vapes</h3>
<ul>
<li><strong>Cartuchos desechables:</strong> Dispositivos completos de un solo uso, convenientes pero menos económicos a largo plazo</li>
<li><strong>Cartuchos recargables:</strong> Cartuchos que se conectan a una batería reutilizable</li>
<li><strong>Pods:</strong> Similar a los cartuchos pero con un sistema de conexión diferente</li>
</ul>
<h3>Consideraciones para Principiantes</h3>
<p>Los aceites de vape suelen ser más concentrados que la flor, con potencias que van del 60% al 90% de THC. Para principiantes, esto significa que incluso una inhalación pequeña puede ser muy potente. Empieza con una sola inhalación corta y espera 10 minutos antes de evaluar los efectos.</p>
</section>

<section id="concentrados">
<h2>Concentrados</h2>
<p>Los concentrados — wax, shatter, rosin, hash, diamonds — son extractos de alta potencia que generalmente contienen entre 60% y 95% de THC. Son definitivamente no recomendados para principiantes.</p>
<p>Los concentrados requieren equipos especializados (dab rigs o vaporizers de concentrados) y un conocimiento previo del cannabis para usarse de forma segura y disfrutable. Si eres nuevo en el cannabis, espera hasta tener experiencia con productos de menor potencia antes de explorar los concentrados.</p>
</section>

<section id="factores-compra">
<h2>Factores Importantes Antes de Comprar</h2>
<h3>1. Verifica el COA</h3>
<p>Siempre pide o busca el Certificado de Análisis del producto. Confirma la potencia real y que el producto haya pasado las pruebas de seguridad para pesticidas y contaminantes.</p>
<h3>2. Empieza con Baja Potencia</h3>
<p>Para principiantes, la potencia moderada es tu amiga. No hay ninguna ventaja en empezar con el producto más potente disponible.</p>
<h3>3. Considera el Perfil de Terpenos</h3>
<p>Los terpenos influyen en el tipo de experiencia. Variedades con alto mirceno tienden a ser más relajantes; las de alto limoneno tienden a ser más energizantes. Pregunta en el dispensario sobre el perfil de terpenos.</p>
<h3>4. Elige el Método Correcto</h3>
<p>Para principiantes, las flores o los vapes son generalmente más fáciles de controlar que los comestibles, debido a su inicio de efectos más rápido.</p>
<h3>5. Compra en Fuentes Confiables</h3>
<p>Compra siempre en dispensarios o tiendas autorizadas que puedan proporcionar COAs y tengan personal capacitado para orientarte.</p>
</section>

<section id="recomendaciones">
<h2>Recomendaciones para Principiantes</h2>
<p>Si tuviéramos que hacer una recomendación general para alguien que prueba cannabis por primera vez:</p>
<ol>
<li>Elige un ambiente cómodo y seguro, idealmente en casa con personas de confianza</li>
<li>Opta por flores o un vape con THC moderado (10-15%)</li>
<li>Empieza con una cantidad muy pequeña — una sola inhalación corta</li>
<li>Espera al menos 15 minutos antes de evaluar los efectos</li>
<li>No mezcles con alcohol u otras sustancias</li>
<li>Ten agua y snacks disponibles</li>
<li>No conduzcas ni operes maquinaria</li>
</ol>
</section>

<section id="faq">
<h2>Preguntas Frecuentes</h2>
<div class="faq-item">
<h3>¿Qué producto es mejor para alguien que nunca ha probado cannabis?</h3>
<p>Para la mayoría de los principiantes, las flores con potencia moderada (10-15% THC) o un vape de baja potencia son las mejores opciones porque los efectos comienzan rápidamente, lo que facilita el control de la dosis. Los comestibles son más difíciles de dosificar para principiantes.</p>
</div>
<div class="faq-item">
<h3>¿Cuánto cannabis debo consumir la primera vez?</h3>
<p>Menos de lo que crees. Para flores o vapes, una sola inhalación corta es suficiente para empezar. Para comestibles, 2.5 mg de THC es una dosis inicial apropiada. Siempre puedes consumir más, pero no puedes consumir menos una vez que ya lo tomaste.</p>
</div>
<div class="faq-item">
<h3>¿Qué hago si consumí demasiado?</h3>
<p>Si sientes que consumiste demasiado, recuerda que los efectos son temporales y pasarán. Busca un lugar cómodo para sentarte o acostarte, bebe agua, respira profundo y recuerda que estás bien. El CBD puede ayudar a moderar los efectos del THC. Evita el pánico — es la respuesta más contraproducente.</p>
</div>
<div class="faq-item">
<h3>¿Los gummies son más seguros que fumar?</h3>
<p>Los gummies evitan los subproductos de la combustión, pero son más difíciles de dosificar para principiantes debido a su inicio de efectos tardío y larga duración. Ningún método es inherentemente "más seguro" — la clave es la dosificación responsable independientemente del método.</p>
</div>
</section>

<section id="articulos-relacionados">
<h2>Artículos Relacionados</h2>
<ul>
<li><a href="/blog/guia-dosificacion-cannabis">Guía de Dosificación de Cannabis para Principiantes</a></li>
<li><a href="/blog/cannabinoides-explicados">Cannabinoides Explicados: THC, CBD, CBG, CBN y Más</a></li>
<li><a href="/blog/como-guardar-cannabis">Cómo Guardar Cannabis y Productos THC Correctamente</a></li>
</ul>
</section>
</article>',
    NULL,
    ARRAY['guía principiantes cannabis', 'primer producto cannabis', 'flores cannabis', 'gummies THC', 'vapes cannabis', 'cómo elegir cannabis', 'dosificación principiantes'],
    'published',
    false,
    11,
    'Guía para Principiantes: Cómo Elegir tu Primer Producto de Cannabis',
    'Guía completa para principiantes sobre cómo elegir tu primer producto de cannabis: flores, gummies, vapes y concentrados explicados con consejos de dosificación responsable.',
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- ARTICLE 4: Cannabinoides Explicados
  -- ============================================================
  INSERT INTO public.blog_posts (
    id, blog_category_id, author_id, title, slug, excerpt, content,
    cover_image_url, tags, status, is_featured, read_time_minutes,
    meta_title, meta_description, published_at
  ) VALUES (
    gen_random_uuid(),
    cat_science_id,
    NULL,
    'Cannabinoides Explicados: THC, CBD, CBG, CBN y Más',
    'cannabinoides-explicados',
    'El cannabis contiene más de 100 cannabinoides diferentes, pero la mayoría de los consumidores solo conocen el THC y el CBD. Esta guía explica los principales cannabinoides, cómo funcionan y por qué el perfil completo importa.',
    '<article>
<header>
<h1>Cannabinoides Explicados: THC, CBD, CBG, CBN y Más</h1>
<p class="meta">Por Equipo Editorial de Street Candy &bull; 4 de agosto de 2026 &bull; 12 min de lectura</p>
</header>

<nav class="toc">
<h2>Tabla de Contenidos</h2>
<ol>
<li><a href="#sistema-endocannabinoide">El Sistema Endocannabinoide</a></li>
<li><a href="#que-son-cannabinoides">¿Qué Son los Cannabinoides?</a></li>
<li><a href="#thc">THC: El Cannabinoide Psicoactivo</a></li>
<li><a href="#cbd">CBD: El Cannabinoide No Psicoactivo</a></li>
<li><a href="#cbg">CBG: El Cannabinoide Madre</a></li>
<li><a href="#cbn">CBN: El Cannabinoide del Envejecimiento</a></li>
<li><a href="#cbc">CBC: Cannabicromeno</a></li>
<li><a href="#thcv">THCV: El Cannabinoide Energizante</a></li>
<li><a href="#efecto-sequito">El Efecto Séquito</a></li>
<li><a href="#perfil-cannabinoide">La Importancia del Perfil Cannabinoide</a></li>
<li><a href="#faq">Preguntas Frecuentes</a></li>
</ol>
</nav>

<section id="sistema-endocannabinoide">
<h2>El Sistema Endocannabinoide</h2>
<p>Para entender cómo funcionan los cannabinoides, primero debes conocer el sistema endocannabinoide (SEC) — el sistema de señalización biológica con el que los cannabinoides interactúan en el cuerpo humano.</p>
<p>El sistema endocannabinoide es una red de receptores, enzimas y moléculas señalizadoras que está presente en prácticamente todos los tejidos del cuerpo. Fue descubierto en la década de 1990 precisamente porque los científicos estaban investigando cómo el THC afecta al cerebro.</p>
<p>Los dos principales tipos de receptores son:</p>
<ul>
<li><strong>Receptores CB1:</strong> Se encuentran principalmente en el cerebro y el sistema nervioso central. Son los responsables de los efectos psicoactivos del THC.</li>
<li><strong>Receptores CB2:</strong> Se encuentran principalmente en el sistema inmune y los tejidos periféricos. Están más asociados con efectos antiinflamatorios.</li>
</ul>
<p>El cuerpo produce sus propios cannabinoides endógenos (llamados endocannabinoides) — como la anandamida y el 2-AG — que se unen a estos mismos receptores. Los cannabinoides del cannabis (fitocannabinoides) imitan o modulan estas señales naturales.</p>
</section>

<section id="que-son-cannabinoides">
<h2>¿Qué Son los Cannabinoides?</h2>
<p>Los cannabinoides son compuestos químicos producidos por la planta de cannabis que interactúan con el sistema endocannabinoide del cuerpo. La planta produce más de 100 cannabinoides diferentes, aunque la mayoría están presentes en cantidades muy pequeñas.</p>
<p>Los cannabinoides se dividen en dos categorías principales:</p>
<ul>
<li><strong>Cannabinoides ácidos:</strong> La forma en que la planta los produce naturalmente (THCA, CBDA, CBGA). Generalmente no son psicoactivos.</li>
<li><strong>Cannabinoides neutros:</strong> La forma activa que resulta de la descarboxilación por calor (THC, CBD, CBG). Algunos son psicoactivos, otros no.</li>
</ul>
</section>

<section id="thc">
<h2>THC: El Cannabinoide Psicoactivo</h2>
<p>El tetrahidrocannabinol (THC) es el cannabinoide más conocido y el principal responsable de los efectos psicoactivos del cannabis. Se une directamente a los receptores CB1 del cerebro, produciendo los efectos característicos: euforia, alteración de la percepción del tiempo, aumento del apetito y, en dosis altas, ansiedad o paranoia en personas susceptibles.</p>
<h3>Formas del THC</h3>
<ul>
<li><strong>THCA:</strong> La forma ácida presente en la flor fresca. No es psicoactiva hasta ser calentada.</li>
<li><strong>Delta-9 THC:</strong> La forma activa estándar, producida por descarboxilación.</li>
<li><strong>Delta-8 THC:</strong> Un isómero del Delta-9 con efectos similares pero generalmente considerados más suaves.</li>
<li><strong>THCV:</strong> Una variante con propiedades únicas (ver sección específica).</li>
</ul>
<h3>Potencia y Tolerancia</h3>
<p>El THC produce tolerancia con el uso regular — el cuerpo reduce la densidad de receptores CB1 en respuesta a la estimulación continua. Esto significa que los consumidores habituales necesitan más THC para lograr los mismos efectos que los consumidores ocasionales.</p>
</section>

<section id="cbd">
<h2>CBD: El Cannabinoide No Psicoactivo</h2>
<p>El cannabidiol (CBD) es el segundo cannabinoide más conocido y el más abundante en las variedades de hemp. A diferencia del THC, el CBD no produce efectos psicoactivos — no te pone "high".</p>
<p>El CBD interactúa con el sistema endocannabinoide de manera diferente al THC: en lugar de unirse directamente a los receptores CB1 y CB2, modula su actividad de formas más indirectas. También interactúa con otros sistemas de receptores en el cuerpo.</p>
<h3>CBD y THC Juntos</h3>
<p>Hay evidencia de que el CBD puede moderar algunos de los efectos del THC, particularmente la ansiedad. Variedades con una proporción equilibrada de THC:CBD (como 1:1) son populares entre consumidores que buscan los efectos del THC pero con menos riesgo de ansiedad.</p>
</section>

<section id="cbg">
<h2>CBG: El Cannabinoide Madre</h2>
<p>El cannabigerol (CBG) es conocido como el "cannabinoide madre" porque el CBGA (su forma ácida) es el precursor de todos los demás cannabinoides. Durante el crecimiento de la planta, el CBGA se convierte en THCA, CBDA y CBCA a través de diferentes vías enzimáticas.</p>
<p>En la mayoría de las variedades maduras de cannabis, el CBG está presente en cantidades pequeñas (menos del 1%) porque la mayor parte del CBGA se ha convertido en otros cannabinoides. Sin embargo, algunas variedades están cultivadas específicamente para tener alto contenido de CBG.</p>
<p>El CBG no es psicoactivo y está siendo investigado por sus posibles propiedades. Los consumidores reportan que los productos con alto CBG tienden a producir efectos más claros y energizantes.</p>
</section>

<section id="cbn">
<h2>CBN: El Cannabinoide del Envejecimiento</h2>
<p>El cannabinol (CBN) se forma cuando el THC se degrada con el tiempo por exposición al oxígeno, la luz y el calor. No es producido directamente por la planta en cantidades significativas — es un producto de la degradación del THC.</p>
<p>El CBN es ligeramente psicoactivo (mucho menos que el THC) y se une débilmente a los receptores CB1. Niveles altos de CBN en un COA generalmente indican que el producto es viejo o fue almacenado incorrectamente.</p>
<p>Algunos consumidores buscan productos con CBN por sus supuestas propiedades sedantes, aunque la evidencia científica sobre esto es limitada.</p>
</section>

<section id="cbc">
<h2>CBC: Cannabicromeno</h2>
<p>El cannabicromeno (CBC) es el tercer cannabinoide más abundante en algunas variedades de cannabis. No es psicoactivo y no se une significativamente a los receptores CB1 o CB2. En cambio, interactúa con otros receptores del cuerpo.</p>
<p>El CBC está presente en cantidades pequeñas en la mayoría de los productos de cannabis y contribuye al efecto séquito general del producto.</p>
</section>

<section id="thcv">
<h2>THCV: El Cannabinoide Energizante</h2>
<p>El tetrahidrocannabivarin (THCV) es un cannabinoide con propiedades únicas. En dosis bajas, actúa como antagonista de los receptores CB1 (bloqueando algunos efectos del THC). En dosis altas, puede actuar como agonista parcial.</p>
<p>El THCV está presente principalmente en variedades africanas de cannabis. Los consumidores reportan que las variedades con alto THCV producen efectos más claros, energizantes y con menos estimulación del apetito que las variedades típicas.</p>
</section>

<section id="efecto-sequito">
<h2>El Efecto Séquito</h2>
<p>El "efecto séquito" (entourage effect) es el concepto de que los cannabinoides, terpenos y otros compuestos del cannabis trabajan mejor juntos que de forma aislada. La interacción sinérgica entre estos compuestos produce efectos que ninguno de ellos podría producir solo.</p>
<p>Este es el argumento principal a favor de los productos de "espectro completo" (full spectrum) sobre los aislados de cannabinoides puros. Un producto de espectro completo contiene todos los cannabinoides y terpenos naturales de la planta, mientras que un aislado contiene solo un cannabinoide purificado.</p>
</section>

<section id="perfil-cannabinoide">
<h2>La Importancia del Perfil Cannabinoide</h2>
<p>Dos productos con el mismo porcentaje de THC pueden producir experiencias muy diferentes si tienen perfiles de cannabinoides distintos. Un producto con alto THC y bajo CBD puede producir más ansiedad que uno con una proporción equilibrada. Un producto con CBG puede producir efectos más claros que uno sin él.</p>
<p>Por eso, al elegir un producto de cannabis, no te enfoques solo en el porcentaje de THC. Revisa el perfil completo de cannabinoides en el COA y considera cómo la combinación de todos ellos podría afectar tu experiencia.</p>
</section>

<section id="faq">
<h2>Preguntas Frecuentes</h2>
<div class="faq-item">
<h3>¿Cuántos cannabinoides tiene el cannabis?</h3>
<p>La planta de cannabis produce más de 100 cannabinoides diferentes, aunque la mayoría están presentes en cantidades muy pequeñas. Los más estudiados y relevantes para los consumidores son el THC, CBD, CBG, CBN, CBC y THCV.</p>
</div>
<div class="faq-item">
<h3>¿El CBD cancela los efectos del THC?</h3>
<p>El CBD puede moderar algunos efectos del THC, particularmente la ansiedad, pero no los cancela completamente. La relación entre CBD y THC es compleja y depende de las dosis de cada uno. En general, una proporción más alta de CBD:THC tiende a producir una experiencia más equilibrada.</p>
</div>
<div class="faq-item">
<h3>¿Qué cannabinoide es mejor para relajarse?</h3>
<p>No hay una respuesta única, ya que la respuesta a los cannabinoides varía entre personas. Sin embargo, variedades con alto mirceno (un terpeno), THC moderado y algo de CBD son frecuentemente asociadas con efectos relajantes. El CBN también es buscado por sus supuestas propiedades sedantes.</p>
</div>
<div class="faq-item">
<h3>¿Qué es el espectro completo vs. aislado?</h3>
<p>Un producto de espectro completo contiene todos los cannabinoides y terpenos naturales de la planta. Un aislado contiene solo un cannabinoide purificado (generalmente CBD o THC). Los productos de espectro completo aprovechan el efecto séquito; los aislados ofrecen mayor control sobre el cannabinoide específico.</p>
</div>
</section>

<section id="articulos-relacionados">
<h2>Artículos Relacionados</h2>
<ul>
<li><a href="/blog/thca-explicado">THCA Explicado: Qué Es y Cómo Funciona</a></li>
<li><a href="/blog/terpenos-cannabis">Terpenos del Cannabis: Aromas, Sabores y Perfiles</a></li>
<li><a href="/blog/como-leer-coa-cannabis">Cómo Leer un COA de Cannabis</a></li>
</ul>
</section>
</article>',
    NULL,
    ARRAY['cannabinoides', 'THC', 'CBD', 'CBG', 'CBN', 'sistema endocannabinoide', 'efecto séquito', 'perfil cannabinoide'],
    'published',
    false,
    12,
    'Cannabinoides Explicados: THC, CBD, CBG, CBN y Más | Street Candy',
    'Guía completa sobre los principales cannabinoides del cannabis: THC, CBD, CBG, CBN, CBC y THCV — cómo funcionan, sus diferencias y por qué el perfil completo importa.',
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- ARTICLE 5: Terpenos del Cannabis
  -- ============================================================
  INSERT INTO public.blog_posts (
    id, blog_category_id, author_id, title, slug, excerpt, content,
    cover_image_url, tags, status, is_featured, read_time_minutes,
    meta_title, meta_description, published_at
  ) VALUES (
    gen_random_uuid(),
    cat_science_id,
    NULL,
    'Terpenos del Cannabis: Aromas, Sabores y Perfiles',
    'terpenos-cannabis',
    'Los terpenos son los compuestos responsables del aroma y sabor únicos de cada variedad de cannabis. Pero su importancia va mucho más allá del olor — también influyen en los efectos. Conoce los principales terpenos y lo que significan.',
    '<article>
<header>
<h1>Terpenos del Cannabis: Aromas, Sabores y Perfiles</h1>
<p class="meta">Por Equipo Editorial de Street Candy &bull; 4 de agosto de 2026 &bull; 10 min de lectura</p>
</header>

<nav class="toc">
<h2>Tabla de Contenidos</h2>
<ol>
<li><a href="#que-son-terpenos">¿Qué Son los Terpenos?</a></li>
<li><a href="#terpenos-efectos">Terpenos y Efectos: El Efecto Séquito</a></li>
<li><a href="#mirceno">Mirceno</a></li>
<li><a href="#limoneno">Limoneno</a></li>
<li><a href="#cariofileno">Cariofileno</a></li>
<li><a href="#linalool">Linalool</a></li>
<li><a href="#pineno">Pineno</a></li>
<li><a href="#terpinoleno">Terpinoleno</a></li>
<li><a href="#ocimeno">Ocimeno</a></li>
<li><a href="#perfiles-aromaticos">Perfiles Aromáticos Comunes</a></li>
<li><a href="#leer-terpenos-coa">Cómo Leer los Terpenos en un COA</a></li>
<li><a href="#faq">Preguntas Frecuentes</a></li>
</ol>
</nav>

<section id="que-son-terpenos">
<h2>¿Qué Son los Terpenos?</h2>
<p>Los terpenos son compuestos orgánicos aromáticos producidos por una enorme variedad de plantas — no solo el cannabis. Son los responsables del aroma del pino, la lavanda, los cítricos y miles de otras plantas. En el cannabis, los terpenos son producidos en las mismas glándulas de resina (tricomas) que producen los cannabinoides.</p>
<p>La planta de cannabis produce más de 200 terpenos diferentes, aunque la mayoría están presentes en cantidades muy pequeñas. Los terpenos dominantes de una variedad son los que determinan su aroma y sabor característicos — por eso una variedad huele a frutas tropicales y otra a tierra y pino.</p>
<p>Evolutivamente, los terpenos sirven como mecanismo de defensa de la planta — repelen insectos y herbívoros, y atraen polinizadores. Para los consumidores de cannabis, son mucho más que aromas: son parte integral de la experiencia.</p>
</section>

<section id="terpenos-efectos">
<h2>Terpenos y Efectos: El Efecto Séquito</h2>
<p>Durante mucho tiempo, la industria del cannabis clasificó las variedades simplemente como "sativa" (energizante) o "indica" (relajante). Hoy sabemos que esta clasificación es demasiado simplista. Los efectos reales de una variedad están determinados en gran medida por su perfil de terpenos, no solo por su clasificación botánica.</p>
<p>El "efecto séquito" describe la interacción sinérgica entre cannabinoides y terpenos. Los terpenos no solo contribuyen al aroma — también modulan cómo los cannabinoides interactúan con el sistema endocannabinoide. Algunos terpenos pueden potenciar los efectos del THC; otros pueden moderarlos.</p>
<p>Por eso, dos variedades con el mismo porcentaje de THC pero perfiles de terpenos diferentes pueden producir experiencias muy distintas.</p>
</section>

<section id="mirceno">
<h2>Mirceno</h2>
<p>El mirceno es el terpeno más abundante en la mayoría de las variedades de cannabis. Tiene un aroma terroso, herbal y ligeramente frutal — similar al lúpulo de la cerveza (de hecho, el lúpulo también es rico en mirceno).</p>
<p><strong>Aroma:</strong> Terroso, herbal, musky, con notas de frutas tropicales</p>
<p><strong>También presente en:</strong> Mango, lúpulo, tomillo, hierba luisa</p>
<p><strong>Efectos asociados:</strong> El mirceno es frecuentemente asociado con efectos sedantes y relajantes. Hay una teoría popular de que comer mango antes de consumir cannabis (por su alto contenido de mirceno) puede intensificar los efectos, aunque la evidencia científica es limitada.</p>
<p>Las variedades con alto mirceno (más del 0.5%) tienden a producir efectos más corporales y relajantes.</p>
</section>

<section id="limoneno">
<h2>Limoneno</h2>
<p>El limoneno es el segundo terpeno más común en el cannabis y tiene un aroma cítrico brillante e inconfundible. Es el mismo compuesto que da su aroma a los limones, naranjas y otras frutas cítricas.</p>
<p><strong>Aroma:</strong> Cítrico, limón, naranja, fresco</p>
<p><strong>También presente en:</strong> Cítricos, romero, menta</p>
<p><strong>Efectos asociados:</strong> El limoneno es frecuentemente asociado con efectos elevadores del ánimo, energizantes y anti-estrés. Las variedades con alto limoneno son populares para uso diurno.</p>
</section>

<section id="cariofileno">
<h2>Cariofileno</h2>
<p>El cariofileno (también llamado beta-cariofileno) es único entre los terpenos del cannabis porque también se une directamente a los receptores CB2 del sistema endocannabinoide. Esto lo hace técnicamente un "cannabinoide dietético".</p>
<p><strong>Aroma:</strong> Picante, pimienta negra, madera, especiado</p>
<p><strong>También presente en:</strong> Pimienta negra, clavo, canela, albahaca</p>
<p><strong>Efectos asociados:</strong> El cariofileno es frecuentemente asociado con efectos antiinflamatorios y relajantes sin efectos psicoactivos propios. Es popular entre consumidores que buscan alivio sin intoxicación.</p>
</section>

<section id="linalool">
<h2>Linalool</h2>
<p>El linalool es el terpeno principal de la lavanda y es conocido por sus propiedades calmantes. En el cannabis, está presente en menor cantidad que el mirceno o el limoneno, pero su influencia en el perfil aromático y los efectos es significativa.</p>
<p><strong>Aroma:</strong> Floral, lavanda, suave, dulce</p>
<p><strong>También presente en:</strong> Lavanda, albahaca, laurel, cilantro</p>
<p><strong>Efectos asociados:</strong> El linalool es frecuentemente asociado con efectos ansiolíticos (anti-ansiedad) y sedantes. Las variedades con alto linalool son populares para el uso nocturno y para consumidores que son propensos a la ansiedad.</p>
</section>

<section id="pineno">
<h2>Pineno</h2>
<p>El pineno existe en dos formas: alfa-pineno y beta-pineno. El alfa-pineno es el terpeno más común en la naturaleza y es el responsable del aroma fresco y resinoso del pino.</p>
<p><strong>Aroma:</strong> Pino, bosque, fresco, resinoso</p>
<p><strong>También presente en:</strong> Pinos, romero, salvia, eneldo</p>
<p><strong>Efectos asociados:</strong> El pineno es frecuentemente asociado con efectos alertadores y potenciadores de la memoria. Hay investigación que sugiere que el pineno puede contrarrestar algunos efectos de deterioro de la memoria asociados con el THC.</p>
</section>

<section id="terpinoleno">
<h2>Terpinoleno</h2>
<p>El terpinoleno tiene un perfil aromático complejo y multifacético — es floral, herbal, cítrico y ligeramente piñoso al mismo tiempo. Es menos común que el mirceno o el limoneno, pero es el terpeno dominante en algunas variedades populares.</p>
<p><strong>Aroma:</strong> Floral, herbal, cítrico, ligeramente piñoso</p>
<p><strong>También presente en:</strong> Manzana, lila, nuez moscada, té</p>
<p><strong>Efectos asociados:</strong> El terpinoleno es frecuentemente asociado con efectos energizantes y creativos. Las variedades con terpinoleno dominante tienden a ser más estimulantes.</p>
</section>

<section id="ocimeno">
<h2>Ocimeno</h2>
<p>El ocimeno tiene un aroma dulce, herbal y ligeramente cítrico. Es menos común como terpeno dominante, pero contribuye a la complejidad aromática de muchas variedades.</p>
<p><strong>Aroma:</strong> Dulce, herbal, floral, ligeramente cítrico</p>
<p><strong>También presente en:</strong> Albahaca, menta, perejil, orquídeas</p>
</section>

<section id="perfiles-aromaticos">
<h2>Perfiles Aromáticos Comunes</h2>
<p>Los terpenos se combinan para crear perfiles aromáticos complejos. Algunos de los perfiles más comunes en el cannabis incluyen:</p>
<ul>
<li><strong>Frutal/Tropical:</strong> Alto mirceno + limoneno + ocimeno. Variedades como Mango Kush o Tropicana Cookies.</li>
<li><strong>Cítrico/Limón:</strong> Alto limoneno dominante. Variedades como Lemon Haze o Super Lemon Haze.</li>
<li><strong>Terroso/Pimienta:</strong> Alto mirceno + cariofileno. Variedades como OG Kush o Bubba Kush.</li>
<li><strong>Floral/Lavanda:</strong> Alto linalool. Variedades como Lavender o Do-Si-Dos.</li>
<li><strong>Pino/Bosque:</strong> Alto pineno. Variedades como Jack Herer o Blue Dream.</li>
</ul>
</section>

<section id="leer-terpenos-coa">
<h2>Cómo Leer los Terpenos en un COA</h2>
<p>Un COA completo incluirá un perfil de terpenos con los terpenos presentes y sus concentraciones. Los valores se expresan como porcentaje (%) o en mg/g.</p>
<p>Para interpretar el perfil de terpenos:</p>
<ol>
<li>Identifica el terpeno dominante (el de mayor concentración) — este determinará el aroma principal</li>
<li>Observa los terpenos secundarios — contribuyen a la complejidad del perfil</li>
<li>Considera cómo la combinación de terpenos podría influir en los efectos</li>
</ol>
<p>Un perfil de terpenos total superior al 2% generalmente indica un producto de alta calidad con aroma y sabor pronunciados.</p>
</section>

<section id="faq">
<h2>Preguntas Frecuentes</h2>
<div class="faq-item">
<h3>¿Los terpenos producen efectos por sí solos?</h3>
<p>Los terpenos tienen efectos propios — el linalool de la lavanda tiene propiedades calmantes bien documentadas, por ejemplo. Sin embargo, en el contexto del cannabis, su mayor influencia es a través del efecto séquito: la interacción con los cannabinoides que modifica y matiza la experiencia general.</p>
</div>
<div class="faq-item">
<h3>¿Por qué algunas variedades huelen diferente aunque tengan el mismo THC?</h3>
<p>Porque el aroma está determinado por los terpenos, no por el THC. Dos variedades con 20% de THC pueden tener perfiles de terpenos completamente diferentes, resultando en aromas y sabores totalmente distintos.</p>
</div>
<div class="faq-item">
<h3>¿Los terpenos se pierden con el calor?</h3>
<p>Sí, los terpenos son volátiles y se evaporan con el calor. La vaporización a temperaturas más bajas (170-185°C) preserva mejor los terpenos que fumar a altas temperaturas. Los concentrados de "live resin" y "live rosin" se hacen con plantas frescas congeladas para preservar el máximo de terpenos.</p>
</div>
<div class="faq-item">
<h3>¿Qué terpeno es mejor para la ansiedad?</h3>
<p>El linalool y el cariofileno son los terpenos más frecuentemente asociados con efectos ansiolíticos. Sin embargo, la respuesta individual varía, y la mejor manera de encontrar lo que funciona para ti es experimentar con diferentes perfiles de terpenos en dosis bajas.</p>
</div>
</section>

<section id="articulos-relacionados">
<h2>Artículos Relacionados</h2>
<ul>
<li><a href="/blog/cannabinoides-explicados">Cannabinoides Explicados: THC, CBD, CBG, CBN y Más</a></li>
<li><a href="/blog/como-leer-coa-cannabis">Cómo Leer un COA de Cannabis</a></li>
<li><a href="/blog/sativa-indica-hibrida-diferencias">Sativa, Indica e Híbrida: Entendiendo las Diferencias Reales</a></li>
</ul>
</section>
</article>',
    NULL,
    ARRAY['terpenos cannabis', 'mirceno', 'limoneno', 'cariofileno', 'linalool', 'pineno', 'aromas cannabis', 'efecto séquito', 'perfil terpenos'],
    'published',
    false,
    10,
    'Terpenos del Cannabis: Aromas, Sabores y Perfiles Explicados',
    'Guía completa sobre los terpenos del cannabis: qué son, cómo influyen en los efectos, los principales terpenos (mirceno, limoneno, cariofileno, linalool) y cómo leerlos en un COA.',
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- ARTICLE 6: Cannabis Indoor, Outdoor y Greenhouse
  -- ============================================================
  INSERT INTO public.blog_posts (
    id, blog_category_id, author_id, title, slug, excerpt, content,
    cover_image_url, tags, status, is_featured, read_time_minutes,
    meta_title, meta_description, published_at
  ) VALUES (
    gen_random_uuid(),
    cat_cultivo_id,
    NULL,
    'Cannabis Indoor, Outdoor y Greenhouse: Diferencias de Cultivo y Calidad',
    'cannabis-indoor-outdoor-greenhouse',
    'El método de cultivo del cannabis tiene un impacto directo en la calidad, el aroma, la potencia y el precio del producto final. Conoce las diferencias entre indoor, outdoor y greenhouse para tomar mejores decisiones de compra.',
    '<article>
<header>
<h1>Cannabis Indoor, Outdoor y Greenhouse: Diferencias de Cultivo y Calidad</h1>
<p class="meta">Por Equipo Editorial de Street Candy &bull; 4 de agosto de 2026 &bull; 9 min de lectura</p>
</header>

<nav class="toc">
<h2>Tabla de Contenidos</h2>
<ol>
<li><a href="#por-que-importa-cultivo">Por Qué Importa el Método de Cultivo</a></li>
<li><a href="#indoor">Cannabis Indoor: Control Total</a></li>
<li><a href="#outdoor">Cannabis Outdoor: La Fuerza de la Naturaleza</a></li>
<li><a href="#greenhouse">Cannabis Greenhouse: Lo Mejor de Ambos Mundos</a></li>
<li><a href="#comparacion">Comparación Directa</a></li>
<li><a href="#factores-ambientales">Factores Ambientales y Calidad</a></li>
<li><a href="#como-identificar">Cómo Identificar el Método de Cultivo</a></li>
<li><a href="#faq">Preguntas Frecuentes</a></li>
</ol>
</nav>

<section id="por-que-importa-cultivo">
<h2>Por Qué Importa el Método de Cultivo</h2>
<p>Cuando compras cannabis, el método de cultivo es uno de los factores más importantes que determinan la calidad del producto que recibes. El ambiente en el que creció la planta — la luz, la temperatura, la humedad, el suelo — afecta directamente la densidad de los cogollos, el contenido de cannabinoides, el perfil de terpenos y la apariencia general del producto.</p>
<p>Los tres métodos principales de cultivo son indoor (interior), outdoor (exterior) y greenhouse (invernadero). Cada uno tiene ventajas y desventajas específicas, y cada uno produce un tipo de producto con características distintas.</p>
</section>

<section id="indoor">
<h2>Cannabis Indoor: Control Total</h2>
<p>El cultivo indoor se realiza en espacios cerrados — cuartos de cultivo, tiendas de campaña de cultivo, instalaciones comerciales — donde el cultivador controla completamente todos los aspectos del ambiente: luz artificial, temperatura, humedad, CO₂, nutrientes y ciclos de luz/oscuridad.</p>
<h3>Ventajas del Indoor</h3>
<ul>
<li><strong>Control total del ambiente:</strong> El cultivador puede optimizar cada variable para maximizar la calidad</li>
<li><strong>Múltiples cosechas al año:</strong> Sin depender de las estaciones, es posible cosechar 4-6 veces por año</li>
<li><strong>Cogollos más densos y resinosos:</strong> La luz artificial intensa y el control de humedad producen cogollos muy compactos con alta concentración de tricomas</li>
<li><strong>Mayor consistencia:</strong> Los lotes son más uniformes porque el ambiente es constante</li>
<li><strong>Menor riesgo de plagas y enfermedades:</strong> El ambiente controlado reduce la exposición a patógenos externos</li>
</ul>
<h3>Desventajas del Indoor</h3>
<ul>
<li><strong>Mayor costo:</strong> La electricidad para iluminación, climatización y ventilación es costosa</li>
<li><strong>Huella ambiental:</strong> El alto consumo energético tiene un impacto ambiental significativo</li>
<li><strong>Escala limitada:</strong> Es más difícil y costoso escalar la producción indoor</li>
</ul>
<h3>Características del Producto Indoor</h3>
<p>El cannabis indoor tiende a tener cogollos muy densos, cubiertos de tricomas brillantes, con aromas intensos y potencias altas. Es generalmente el producto de mayor precio en el mercado.</p>
</section>

<section id="outdoor">
<h2>Cannabis Outdoor: La Fuerza de la Naturaleza</h2>
<p>El cultivo outdoor aprovecha la luz solar natural, el suelo y el clima para producir cannabis. Las plantas crecen en el exterior durante la temporada de cultivo y se cosechan una vez al año, generalmente en otoño.</p>
<h3>Ventajas del Outdoor</h3>
<ul>
<li><strong>Menor costo de producción:</strong> Sin electricidad para iluminación ni climatización artificial</li>
<li><strong>Plantas más grandes:</strong> Las plantas outdoor pueden crecer mucho más que las indoor, produciendo mayor volumen por planta</li>
<li><strong>Perfil de terpenos más complejo:</strong> Algunos cultivadores argumentan que la exposición a factores ambientales naturales produce perfiles de terpenos más complejos y matizados</li>
<li><strong>Menor huella ambiental:</strong> Usa energía solar en lugar de electricidad artificial</li>
</ul>
<h3>Desventajas del Outdoor</h3>
<ul>
<li><strong>Dependencia del clima:</strong> Las condiciones meteorológicas adversas pueden afectar la cosecha</li>
<li><strong>Una cosecha por año:</strong> Limitado por las estaciones</li>
<li><strong>Mayor exposición a plagas:</strong> El ambiente exterior expone las plantas a más insectos y patógenos</li>
<li><strong>Menor consistencia:</strong> Las variaciones climáticas entre años producen lotes menos uniformes</li>
</ul>
<h3>Características del Producto Outdoor</h3>
<p>El cannabis outdoor tiende a tener cogollos más grandes pero menos densos que el indoor, con aromas más terrosos y naturales. La potencia puede ser ligeramente menor, pero el precio es generalmente más accesible.</p>
</section>

<section id="greenhouse">
<h2>Cannabis Greenhouse: Lo Mejor de Ambos Mundos</h2>
<p>El cultivo greenhouse (invernadero) combina la luz solar natural con estructuras de vidrio o plástico que protegen las plantas y permiten cierto control del ambiente. Es un punto intermedio entre indoor y outdoor.</p>
<h3>Tipos de Greenhouse</h3>
<ul>
<li><strong>Greenhouse básico:</strong> Solo protección del clima, sin control adicional del ambiente</li>
<li><strong>Greenhouse con luz suplementaria:</strong> Usa luz solar como base pero añade iluminación artificial cuando es necesario</li>
<li><strong>Greenhouse con control climático completo:</strong> Temperatura, humedad y CO₂ controlados, pero con luz solar como fuente principal</li>
</ul>
<h3>Ventajas del Greenhouse</h3>
<ul>
<li><strong>Mejor relación calidad-precio:</strong> Produce cannabis de alta calidad a menor costo que el indoor puro</li>
<li><strong>Múltiples cosechas posibles:</strong> Con control de luz, es posible manipular los ciclos de floración</li>
<li><strong>Protección del clima:</strong> Las plantas están protegidas de lluvia, viento y temperaturas extremas</li>
<li><strong>Menor huella ambiental que indoor:</strong> Aprovecha la luz solar como fuente principal de energía</li>
</ul>
<h3>Características del Producto Greenhouse</h3>
<p>El cannabis greenhouse puede ser de muy alta calidad, especialmente en instalaciones modernas con control climático avanzado. La calidad es generalmente superior al outdoor básico y comparable al indoor, pero a un precio más accesible.</p>
</section>

<section id="comparacion">
<h2>Comparación Directa</h2>
<table>
<thead>
<tr><th>Característica</th><th>Indoor</th><th>Outdoor</th><th>Greenhouse</th></tr>
</thead>
<tbody>
<tr><td>Densidad de cogollos</td><td>Muy alta</td><td>Media</td><td>Alta</td></tr>
<tr><td>Potencia (THC)</td><td>Alta</td><td>Media-Alta</td><td>Alta</td></tr>
<tr><td>Perfil de terpenos</td><td>Intenso y controlado</td><td>Complejo y natural</td><td>Equilibrado</td></tr>
<tr><td>Precio</td><td>Alto</td><td>Accesible</td><td>Medio</td></tr>
<tr><td>Consistencia</td><td>Muy alta</td><td>Variable</td><td>Alta</td></tr>
<tr><td>Impacto ambiental</td><td>Alto</td><td>Bajo</td><td>Medio-bajo</td></tr>
</tbody>
</table>
</section>

<section id="factores-ambientales">
<h2>Factores Ambientales y Calidad</h2>
<p>Independientemente del método de cultivo, los factores ambientales que más influyen en la calidad del cannabis son:</p>
<h3>Luz</h3>
<p>La intensidad y el espectro de la luz afectan directamente la producción de cannabinoides y terpenos. Las plantas bajo luz intensa tienden a producir más resina.</p>
<h3>Temperatura y Humedad</h3>
<p>Las temperaturas frescas durante la floración (especialmente las noches frías) pueden intensificar los colores y los aromas. La humedad controlada previene el moho y las enfermedades.</p>
<h3>Suelo y Nutrientes</h3>
<p>El cannabis cultivado en suelo vivo rico en microorganismos tiende a producir perfiles de terpenos más complejos que el cultivado en medios hidropónicos con nutrientes sintéticos.</p>
</section>

<section id="como-identificar">
<h2>Cómo Identificar el Método de Cultivo</h2>
<p>Los productores responsables siempre indican el método de cultivo en el empaque o en la descripción del producto. Si no está indicado, puedes hacer preguntas al dispensario o buscar el COA del producto, que a veces incluye información sobre el método de cultivo.</p>
<p>Visualmente, el cannabis indoor tiende a tener cogollos más compactos y uniformes, mientras que el outdoor puede tener cogollos más grandes y menos uniformes. Sin embargo, estas son generalizaciones — un outdoor bien cultivado puede superar a un indoor mal cultivado.</p>
</section>

<section id="faq">
<h2>Preguntas Frecuentes</h2>
<div class="faq-item">
<h3>¿El cannabis indoor es siempre mejor que el outdoor?</h3>
<p>No necesariamente. El método de cultivo es solo uno de los factores que determinan la calidad. Un outdoor cultivado con cuidado en un clima ideal puede producir cannabis de calidad excepcional. La genética, la experiencia del cultivador y las prácticas post-cosecha son igualmente importantes.</p>
</div>
<div class="faq-item">
<h3>¿Por qué el cannabis indoor es más caro?</h3>
<p>El cultivo indoor tiene costos operativos mucho más altos que el outdoor o greenhouse, principalmente por el consumo de electricidad para iluminación y climatización. Estos costos se reflejan en el precio final del producto.</p>
</div>
<div class="faq-item">
<h3>¿El greenhouse es mejor que el outdoor?</h3>
<p>El greenhouse ofrece mayor control y protección que el outdoor puro, lo que generalmente resulta en mayor consistencia y calidad. Sin embargo, un outdoor bien cultivado en condiciones climáticas ideales puede producir cannabis de calidad comparable o superior a un greenhouse básico.</p>
</div>
<div class="faq-item">
<h3>¿Cómo sé si el cannabis que compro es indoor, outdoor o greenhouse?</h3>
<p>Los productores responsables siempre indican el método de cultivo. Si no está en el empaque, pregunta en el dispensario. La transparencia sobre el método de cultivo es una señal positiva sobre la calidad y honestidad del productor.</p>
</div>
</section>

<section id="articulos-relacionados">
<h2>Artículos Relacionados</h2>
<ul>
<li><a href="/blog/como-leer-coa-cannabis">Cómo Leer un COA de Cannabis</a></li>
<li><a href="/blog/como-guardar-cannabis">Cómo Guardar Cannabis y Productos THC Correctamente</a></li>
<li><a href="/blog/terpenos-cannabis">Terpenos del Cannabis: Aromas, Sabores y Perfiles</a></li>
</ul>
</section>
</article>',
    NULL,
    ARRAY['cannabis indoor', 'cannabis outdoor', 'cannabis greenhouse', 'métodos de cultivo cannabis', 'calidad cannabis', 'diferencias cultivo'],
    'published',
    false,
    9,
    'Cannabis Indoor, Outdoor y Greenhouse: Diferencias de Cultivo y Calidad',
    'Descubre las diferencias entre cannabis indoor, outdoor y greenhouse: métodos de cultivo, calidad del producto, potencia, terpenos y cómo elegir según tus preferencias.',
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- ARTICLE 7: ¿Cuánto Tiempo Permanece el THC en el Cuerpo?
  -- ============================================================
  INSERT INTO public.blog_posts (
    id, blog_category_id, author_id, title, slug, excerpt, content,
    cover_image_url, tags, status, is_featured, read_time_minutes,
    meta_title, meta_description, published_at
  ) VALUES (
    gen_random_uuid(),
    cat_science_id,
    NULL,
    '¿Cuánto Tiempo Permanece el THC en el Cuerpo? Factores, Detección y Mitos',
    'cuanto-tiempo-permanece-thc-cuerpo',
    'Una de las preguntas más frecuentes sobre el cannabis es cuánto tiempo permanece el THC detectable en el cuerpo. La respuesta depende de múltiples factores individuales. Esta guía explica la ciencia detrás de la detección del THC.',
    '<article>
<header>
<h1>¿Cuánto Tiempo Permanece el THC en el Cuerpo? Factores, Detección y Mitos</h1>
<p class="meta">Por Equipo Editorial de Street Candy &bull; 4 de agosto de 2026 &bull; 10 min de lectura</p>
</header>

<nav class="toc">
<h2>Tabla de Contenidos</h2>
<ol>
<li><a href="#como-metaboliza-thc">Cómo el Cuerpo Metaboliza el THC</a></li>
<li><a href="#factores-influyen">Factores que Influyen en la Detección</a></li>
<li><a href="#metodos-deteccion">Métodos de Detección</a></li>
<li><a href="#tiempos-deteccion">Tiempos de Detección por Método</a></li>
<li><a href="#diferencias-individuales">Diferencias Individuales</a></li>
<li><a href="#mitos-comunes">Mitos Comunes sobre la Detección del THC</a></li>
<li><a href="#faq">Preguntas Frecuentes</a></li>
</ol>
</nav>

<section id="como-metaboliza-thc">
<h2>Cómo el Cuerpo Metaboliza el THC</h2>
<p>Cuando consumes cannabis, el THC entra al torrente sanguíneo y es transportado al cerebro y otros tejidos. El hígado metaboliza el THC en varios metabolitos, el más importante de los cuales es el THC-COOH (11-nor-9-carboxy-THC).</p>
<p>A diferencia del THC activo, que produce efectos psicoactivos, el THC-COOH es un metabolito inactivo. Sin embargo, es el compuesto que la mayoría de las pruebas de drogas detectan, porque permanece en el cuerpo mucho más tiempo que el THC activo.</p>
<p>El THC y sus metabolitos son lipofílicos — se disuelven en grasa, no en agua. Esto significa que se acumulan en el tejido graso del cuerpo y se liberan lentamente con el tiempo, lo que explica por qué el cannabis puede detectarse durante semanas o incluso meses después del último consumo en usuarios frecuentes.</p>
</section>

<section id="factores-influyen">
<h2>Factores que Influyen en la Detección</h2>
<p>No existe una respuesta única a "¿cuánto tiempo permanece el THC en el cuerpo?" porque depende de múltiples variables:</p>
<h3>Frecuencia de Consumo</h3>
<p>Este es el factor más importante. Los consumidores ocasionales (una vez a la semana o menos) eliminan el THC mucho más rápido que los consumidores diarios o frecuentes. En usuarios ocasionales, el THC puede ser indetectable en orina en 3-4 días. En usuarios diarios crónicos, puede detectarse durante 30 días o más.</p>
<h3>Potencia del Producto</h3>
<p>Productos con mayor concentración de THC introducen más THC al sistema, lo que puede resultar en períodos de detección más largos.</p>
<h3>Método de Consumo</h3>
<p>Fumar y vaporizar producen picos de THC en sangre más altos pero de menor duración que los comestibles. Los comestibles producen picos más bajos pero sostenidos, y sus metabolitos pueden persistir más tiempo.</p>
<h3>Composición Corporal</h3>
<p>Dado que el THC se almacena en tejido graso, las personas con mayor porcentaje de grasa corporal pueden retener los metabolitos del THC por más tiempo que las personas con menor porcentaje de grasa.</p>
<h3>Metabolismo Individual</h3>
<p>La velocidad del metabolismo varía significativamente entre personas y está influenciada por la genética, la edad, la actividad física y la salud general.</p>
<h3>Hidratación</h3>
<p>Una buena hidratación puede acelerar ligeramente la eliminación de metabolitos a través de la orina, aunque el efecto es modesto.</p>
</section>

<section id="metodos-deteccion">
<h2>Métodos de Detección</h2>
<p>Existen cuatro métodos principales para detectar el consumo de cannabis:</p>
<h3>Prueba de Orina</h3>
<p>Es el método más común en pruebas laborales y legales. Detecta el THC-COOH, no el THC activo. Es relativamente económica y tiene una ventana de detección larga.</p>
<h3>Prueba de Sangre</h3>
<p>Detecta el THC activo y sus metabolitos en sangre. Tiene una ventana de detección más corta que la orina, pero puede indicar consumo reciente más precisamente. Se usa principalmente en investigaciones de accidentes de tráfico.</p>
<h3>Prueba de Saliva</h3>
<p>Detecta el THC activo en saliva. Tiene la ventana de detección más corta de todos los métodos (horas a días). Se usa en controles de tráfico en algunos países.</p>
<h3>Prueba de Cabello</h3>
<p>Detecta metabolitos del THC en el folículo capilar. Tiene la ventana de detección más larga — hasta 90 días o más. Sin embargo, es más cara y menos común.</p>
</section>

<section id="tiempos-deteccion">
<h2>Tiempos de Detección por Método</h2>
<table>
<thead>
<tr><th>Método</th><th>Consumidor Ocasional</th><th>Consumidor Moderado</th><th>Consumidor Frecuente</th></tr>
</thead>
<tbody>
<tr><td>Orina</td><td>3-4 días</td><td>5-7 días</td><td>10-30+ días</td></tr>
<tr><td>Sangre</td><td>1-2 días</td><td>2-3 días</td><td>3-7 días</td></tr>
<tr><td>Saliva</td><td>1-3 días</td><td>1-3 días</td><td>1-3 días</td></tr>
<tr><td>Cabello</td><td>Hasta 90 días</td><td>Hasta 90 días</td><td>Hasta 90 días</td></tr>
</tbody>
</table>
<p><em>Nota: Estos son rangos aproximados. Los tiempos reales varían significativamente según los factores individuales descritos anteriormente.</em></p>
</section>

<section id="diferencias-individuales">
<h2>Diferencias Individuales</h2>
<p>Las diferencias individuales en la metabolización del THC son tan significativas que los rangos de tiempo son solo orientativos. Dos personas con patrones de consumo idénticos pueden tener resultados de prueba muy diferentes debido a diferencias en:</p>
<ul>
<li>Genética y variantes enzimáticas (especialmente el citocromo P450)</li>
<li>Composición corporal y porcentaje de grasa</li>
<li>Velocidad metabólica basal</li>
<li>Nivel de actividad física</li>
<li>Función hepática y renal</li>
<li>Hidratación y dieta</li>
</ul>
</section>

<section id="mitos-comunes">
<h2>Mitos Comunes sobre la Detección del THC</h2>
<h3>Mito: Beber mucha agua elimina el THC rápidamente</h3>
<p>Realidad: La hidratación puede diluir ligeramente la concentración de metabolitos en orina, pero no acelera significativamente la eliminación del THC del tejido graso. Beber cantidades extremas de agua puede producir una muestra de orina demasiado diluida, lo que puede resultar en una prueba inválida.</p>
<h3>Mito: El ejercicio elimina el THC más rápido</h3>
<p>Realidad: El ejercicio quema grasa, lo que puede liberar THC almacenado en el torrente sanguíneo. Paradójicamente, el ejercicio intenso justo antes de una prueba puede aumentar temporalmente los niveles de THC en sangre y orina.</p>
<h3>Mito: Los productos "detox" garantizan resultados negativos</h3>
<p>Realidad: No existe ningún producto que garantice la eliminación del THC del cuerpo. La mayoría de los productos "detox" son simplemente diuréticos que diluyen la orina temporalmente.</p>
<h3>Mito: El CBD positivo en una prueba indica consumo de THC</h3>
<p>Realidad: Las pruebas estándar de drogas no detectan el CBD. Sin embargo, algunos productos de CBD de espectro completo contienen trazas de THC que podrían acumularse con el uso frecuente.</p>
</section>

<section id="faq">
<h2>Preguntas Frecuentes</h2>
<div class="faq-item">
<h3>¿Cuánto tiempo después de fumar puedo conducir de forma segura?</h3>
<p>Los efectos psicoactivos del THC generalmente duran 2-4 horas cuando se fuma. Sin embargo, algunos efectos sutiles en la coordinación y el tiempo de reacción pueden persistir más tiempo. La recomendación general es no conducir durante al menos 4-6 horas después de consumir cannabis, aunque esto varía según la persona y la dosis.</p>
</div>
<div class="faq-item">
<h3>¿El CBD puede causar un positivo en una prueba de drogas?</h3>
<p>El CBD puro no causa positivos en pruebas de drogas estándar. Sin embargo, los productos de CBD de espectro completo contienen trazas de THC (hasta 0.3% en productos legales de hemp). Con uso frecuente de grandes cantidades, estas trazas podrían acumularse y potencialmente causar un positivo.</p>
</div>
<div class="faq-item">
<h3>¿Por qué el cannabis se detecta durante más tiempo que otras drogas?</h3>
<p>Porque el THC y sus metabolitos son lipofílicos (solubles en grasa) y se acumulan en el tejido graso. Otras drogas son más hidrosolubles y se eliminan más rápidamente a través de la orina. Esta característica química del THC es la razón de su larga ventana de detección.</p>
</div>
</section>

<section id="articulos-relacionados">
<h2>Artículos Relacionados</h2>
<ul>
<li><a href="/blog/cannabinoides-explicados">Cannabinoides Explicados: THC, CBD, CBG, CBN y Más</a></li>
<li><a href="/blog/guia-dosificacion-cannabis">Guía de Dosificación de Cannabis para Principiantes</a></li>
<li><a href="/blog/thca-explicado">THCA Explicado: Qué Es y Cómo Funciona</a></li>
</ul>
</section>
</article>',
    NULL,
    ARRAY['THC en el cuerpo', 'cuánto dura THC', 'prueba de drogas cannabis', 'detección THC', 'metabolismo THC', 'mitos cannabis'],
    'published',
    false,
    10,
    '¿Cuánto Tiempo Permanece el THC en el Cuerpo? Guía Completa',
    'Descubre cuánto tiempo permanece el THC detectable en orina, sangre, saliva y cabello. Factores que influyen, métodos de detección y mitos comunes explicados en español.',
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- ARTICLE 8: Sativa, Indica e Híbrida
  -- ============================================================
  INSERT INTO public.blog_posts (
    id, blog_category_id, author_id, title, slug, excerpt, content,
    cover_image_url, tags, status, is_featured, read_time_minutes,
    meta_title, meta_description, published_at
  ) VALUES (
    gen_random_uuid(),
    cat_strains_id,
    NULL,
    'Sativa, Indica e Híbrida: Entendiendo las Diferencias Reales',
    'sativa-indica-hibrida-diferencias',
    'La clasificación de cannabis en sativa, indica e híbrida es la más conocida en la industria, pero también la más malentendida. La ciencia moderna ha cambiado fundamentalmente cómo debemos pensar en estas categorías.',
    '<article>
<header>
<h1>Sativa, Indica e Híbrida: Entendiendo las Diferencias Reales</h1>
<p class="meta">Por Equipo Editorial de Street Candy &bull; 4 de agosto de 2026 &bull; 11 min de lectura</p>
</header>

<nav class="toc">
<h2>Tabla de Contenidos</h2>
<ol>
<li><a href="#historia-clasificacion">Historia de las Clasificaciones</a></li>
<li><a href="#sativa-tradicional">Sativa: La Clasificación Tradicional</a></li>
<li><a href="#indica-tradicional">Indica: La Clasificación Tradicional</a></li>
<li><a href="#hibridas">Híbridas: El Mundo Real</a></li>
<li><a href="#problema-clasificacion">El Problema con la Clasificación Tradicional</a></li>
<li><a href="#genetica-moderna">Genética Moderna: La Realidad</a></li>
<li><a href="#enfoque-moderno">El Enfoque Moderno: Cannabinoides y Terpenos</a></li>
<li><a href="#como-elegir">Cómo Elegir Basándote en Efectos Reales</a></li>
<li><a href="#faq">Preguntas Frecuentes</a></li>
</ol>
</nav>

<section id="historia-clasificacion">
<h2>Historia de las Clasificaciones</h2>
<p>La clasificación del cannabis en "sativa" e "indica" tiene sus raíces en la botánica del siglo XVIII. En 1753, el botánico Carl Linnaeus clasificó el cannabis cultivado en Europa como <em>Cannabis sativa</em>. En 1785, Jean-Baptiste Lamarck describió una especie diferente encontrada en India como <em>Cannabis indica</em>, notando diferencias morfológicas en la planta.</p>
<p>Durante décadas, estas clasificaciones botánicas se convirtieron en la base del sistema de categorización que usa la industria del cannabis: sativa para efectos energizantes y cerebrales, indica para efectos relajantes y corporales.</p>
<p>El problema es que esta clasificación popular tiene muy poco respaldo científico moderno.</p>
</section>

<section id="sativa-tradicional">
<h2>Sativa: La Clasificación Tradicional</h2>
<p>Según la clasificación tradicional de la industria, las variedades sativa se caracterizan por:</p>
<h3>Morfología de la Planta</h3>
<ul>
<li>Plantas más altas y delgadas</li>
<li>Hojas más largas y estrechas</li>
<li>Período de floración más largo</li>
<li>Originarias de regiones ecuatoriales (América Central, África, Sudeste Asiático)</li>
</ul>
<h3>Efectos Atribuidos Tradicionalmente</h3>
<ul>
<li>Energizantes y estimulantes</li>
<li>Creatividad y enfoque</li>
<li>Elevación del ánimo</li>
<li>Más apropiadas para uso diurno</li>
<li>Efectos más "cerebrales"</li>
</ul>
</section>

<section id="indica-tradicional">
<h2>Indica: La Clasificación Tradicional</h2>
<p>Según la clasificación tradicional, las variedades indica se caracterizan por:</p>
<h3>Morfología de la Planta</h3>
<ul>
<li>Plantas más bajas y compactas</li>
<li>Hojas más anchas y oscuras</li>
<li>Período de floración más corto</li>
<li>Originarias de regiones montañosas (Hindu Kush, Afganistán, Pakistán)</li>
</ul>
<h3>Efectos Atribuidos Tradicionalmente</h3>
<ul>
<li>Relajantes y sedantes</li>
<li>Alivio de tensión muscular</li>
<li>Efectos corporales pronunciados</li>
<li>Más apropiadas para uso nocturno</li>
<li>El famoso "couchlock" (sensación de estar pegado al sofá)</li>
</ul>
</section>

<section id="hibridas">
<h2>Híbridas: El Mundo Real</h2>
<p>Las variedades híbridas son cruces entre plantas sativa e indica. En teoría, combinan características de ambas categorías. En la práctica, la gran mayoría del cannabis disponible en el mercado moderno es técnicamente híbrido — el resultado de décadas de cruzamiento selectivo.</p>
<p>Las híbridas se subcategorizan como "sativa-dominante", "indica-dominante" o "equilibrada" según qué características predominan.</p>
</section>

<section id="problema-clasificacion">
<h2>El Problema con la Clasificación Tradicional</h2>
<p>La investigación científica moderna ha revelado que la clasificación sativa/indica es fundamentalmente problemática:</p>
<h3>La Genética No Coincide con las Etiquetas</h3>
<p>Estudios genéticos han demostrado que las etiquetas "sativa" e "indica" en el mercado moderno tienen poca correlación con la genética real de las plantas. Muchas variedades etiquetadas como "sativa" tienen genética predominantemente indica, y viceversa.</p>
<h3>Los Efectos No Son Predecibles por la Etiqueta</h3>
<p>Múltiples estudios con consumidores han mostrado que las personas no pueden distinguir consistentemente entre los efectos de variedades etiquetadas como sativa vs. indica en condiciones controladas. Los efectos reportados son altamente subjetivos y variables.</p>
<h3>La Morfología No Determina los Efectos</h3>
<p>La forma de la hoja o la altura de la planta no tienen relación directa con el perfil de cannabinoides o terpenos que determinan los efectos.</p>
</section>

<section id="genetica-moderna">
<h2>Genética Moderna: La Realidad</h2>
<p>Desde la perspectiva genética moderna, la distinción más significativa en el cannabis es entre:</p>
<ul>
<li><strong>Cannabis de fibra (hemp):</strong> Cultivado por milenios para fibra y semillas, con bajo THC</li>
<li><strong>Cannabis de droga:</strong> Cultivado por su contenido de cannabinoides</li>
</ul>
<p>Dentro del cannabis de droga, las variedades modernas son tan hibridadas que la distinción sativa/indica tiene poco valor predictivo sobre los efectos. Lo que realmente determina los efectos es el perfil de cannabinoides y terpenos.</p>
</section>

<section id="enfoque-moderno">
<h2>El Enfoque Moderno: Cannabinoides y Terpenos</h2>
<p>Los expertos de la industria y los científicos del cannabis están convergiendo en un enfoque más preciso para predecir los efectos: el análisis del perfil de cannabinoides y terpenos.</p>
<p>En lugar de preguntar "¿es sativa o indica?", las preguntas más útiles son:</p>
<ul>
<li>¿Cuál es el porcentaje de THC y CBD?</li>
<li>¿Cuál es el terpeno dominante?</li>
<li>¿Tiene alto mirceno (más relajante) o alto limoneno (más energizante)?</li>
<li>¿Qué otros cannabinoides están presentes?</li>
</ul>
<p>Esta información, disponible en el COA del producto, es mucho más predictiva de los efectos que la etiqueta sativa/indica.</p>
</section>

<section id="como-elegir">
<h2>Cómo Elegir Basándote en Efectos Reales</h2>
<p>Para elegir un producto basándote en los efectos que buscas:</p>
<h3>Si buscas efectos relajantes y sedantes:</h3>
<p>Busca productos con alto mirceno (el terpeno más asociado con efectos sedantes), linalool y cariofileno. Una proporción de THC:CBD más equilibrada también puede contribuir a efectos más relajantes.</p>
<h3>Si buscas efectos energizantes y creativos:</h3>
<p>Busca productos con alto limoneno, terpinoleno y pineno. Estos terpenos están más asociados con efectos estimulantes y elevadores del ánimo.</p>
<h3>Si eres principiante:</h3>
<p>Independientemente de la etiqueta sativa/indica, empieza con productos de potencia moderada (10-15% THC) y observa cómo tu cuerpo responde. La respuesta individual al cannabis varía significativamente.</p>
</section>

<section id="faq">
<h2>Preguntas Frecuentes</h2>
<div class="faq-item">
<h3>¿Debo ignorar completamente las etiquetas sativa/indica?</h3>
<p>No necesariamente. Aunque la clasificación es imprecisa, puede ser útil como punto de partida general. Sin embargo, no debes basar tu decisión únicamente en ella. Complementa la etiqueta con información sobre el perfil de terpenos y cannabinoides del COA para tomar una decisión más informada.</p>
</div>
<div class="faq-item">
<h3>¿Por qué la industria sigue usando sativa/indica si no es preciso?</h3>
<p>Principalmente por tradición y familiaridad del consumidor. La clasificación sativa/indica está tan arraigada en la cultura del cannabis que cambiarla completamente sería confuso para muchos consumidores. La industria está evolucionando gradualmente hacia descripciones más basadas en terpenos y cannabinoides.</p>
</div>
<div class="faq-item">
<h3>¿Las sativas siempre dan energía y las indicas siempre relajan?</h3>
<p>No. Esta es una generalización que no se sostiene en la práctica. Los efectos del cannabis dependen del perfil de cannabinoides y terpenos, la dosis, el método de consumo, la tolerancia individual y el estado mental del consumidor. Una variedad etiquetada como sativa puede producir efectos relajantes en una persona y energizantes en otra.</p>
</div>
<div class="faq-item">
<h3>¿Qué es más importante: la etiqueta o el COA?</h3>
<p>El COA siempre es más informativo que la etiqueta. El COA te dice exactamente qué cannabinoides y terpenos contiene el producto, lo que es mucho más predictivo de los efectos que una etiqueta sativa/indica.</p>
</div>
</section>

<section id="articulos-relacionados">
<h2>Artículos Relacionados</h2>
<ul>
<li><a href="/blog/terpenos-cannabis">Terpenos del Cannabis: Aromas, Sabores y Perfiles</a></li>
<li><a href="/blog/cannabinoides-explicados">Cannabinoides Explicados: THC, CBD, CBG, CBN y Más</a></li>
<li><a href="/blog/como-leer-coa-cannabis">Cómo Leer un COA de Cannabis</a></li>
</ul>
</section>
</article>',
    NULL,
    ARRAY['sativa indica híbrida', 'diferencias sativa indica', 'clasificación cannabis', 'efectos cannabis', 'genética cannabis', 'terpenos efectos'],
    'published',
    false,
    11,
    'Sativa, Indica e Híbrida: Diferencias Reales Explicadas | Street Candy',
    'Descubre la verdad sobre las diferencias entre sativa, indica e híbrida: historia, genética, por qué la clasificación tradicional es imprecisa y cómo elegir basándote en cannabinoides y terpenos.',
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- ARTICLE 9: Cómo Guardar Cannabis Correctamente
  -- ============================================================
  INSERT INTO public.blog_posts (
    id, blog_category_id, author_id, title, slug, excerpt, content,
    cover_image_url, tags, status, is_featured, read_time_minutes,
    meta_title, meta_description, published_at
  ) VALUES (
    gen_random_uuid(),
    cat_education_id,
    NULL,
    'Cómo Guardar Cannabis y Productos THC Correctamente',
    'como-guardar-cannabis',
    'El almacenamiento adecuado del cannabis es fundamental para preservar su potencia, aroma y calidad. Un producto mal almacenado puede perder terpenos, degradar cannabinoides y desarrollar moho. Aprende cómo hacerlo bien.',
    '<article>
<header>
<h1>Cómo Guardar Cannabis y Productos THC Correctamente</h1>
<p class="meta">Por Equipo Editorial de Street Candy &bull; 4 de agosto de 2026 &bull; 8 min de lectura</p>
</header>

<nav class="toc">
<h2>Tabla de Contenidos</h2>
<ol>
<li><a href="#por-que-importa-almacenamiento">Por Qué Importa el Almacenamiento</a></li>
<li><a href="#enemigos-cannabis">Los Cuatro Enemigos del Cannabis</a></li>
<li><a href="#temperatura">Temperatura Ideal</a></li>
<li><a href="#humedad">Humedad Relativa</a></li>
<li><a href="#luz">Protección de la Luz</a></li>
<li><a href="#oxigeno">Control del Oxígeno</a></li>
<li><a href="#contenedores">Contenedores Recomendados</a></li>
<li><a href="#productos-especificos">Almacenamiento por Tipo de Producto</a></li>
<li><a href="#senales-deterioro">Señales de Deterioro</a></li>
<li><a href="#faq">Preguntas Frecuentes</a></li>
</ol>
</nav>

<section id="por-que-importa-almacenamiento">
<h2>Por Qué Importa el Almacenamiento</h2>
<p>El cannabis es un producto orgánico que se degrada con el tiempo si no se almacena correctamente. Los terpenos — responsables del aroma y parte de los efectos — son compuestos volátiles que se evaporan fácilmente. Los cannabinoides como el THCA se degradan gradualmente en CBN (un cannabinoide menos potente) cuando se exponen al calor, la luz y el oxígeno.</p>
<p>Un cannabis bien almacenado puede mantener su calidad durante 6-12 meses. Un cannabis mal almacenado puede perder significativamente su potencia y aroma en semanas.</p>
</section>

<section id="enemigos-cannabis">
<h2>Los Cuatro Enemigos del Cannabis</h2>
<p>Cuatro factores son los principales responsables del deterioro del cannabis:</p>
<ol>
<li><strong>Calor:</strong> Acelera la degradación de cannabinoides y evapora terpenos</li>
<li><strong>Humedad excesiva:</strong> Promueve el crecimiento de moho y bacterias</li>
<li><strong>Luz UV:</strong> Degrada los cannabinoides, especialmente el THCA</li>
<li><strong>Oxígeno:</strong> Oxida los cannabinoides y acelera la degradación general</li>
</ol>
<p>El almacenamiento ideal minimiza la exposición a todos estos factores simultáneamente.</p>
</section>

<section id="temperatura">
<h2>Temperatura Ideal</h2>
<p>La temperatura ideal para almacenar cannabis es entre 15°C y 21°C (60°F y 70°F). Las temperaturas más altas aceleran la degradación de cannabinoides y la evaporación de terpenos. Las temperaturas muy bajas (como el congelador) pueden hacer que los tricomas se vuelvan frágiles y se rompan.</p>
<h3>Qué Evitar</h3>
<ul>
<li><strong>Calor directo:</strong> No guardes cannabis cerca de estufas, calentadores o en lugares expuestos al sol</li>
<li><strong>Cambios bruscos de temperatura:</strong> Los ciclos de calentamiento y enfriamiento promueven la condensación, que puede introducir humedad</li>
<li><strong>El congelador:</strong> Aunque preserva algunos aspectos, el frío extremo puede dañar los tricomas</li>
</ul>
<h3>Opciones de Almacenamiento por Temperatura</h3>
<p>Un cajón fresco y oscuro en tu habitación suele ser suficiente para almacenamiento a corto plazo (1-3 meses). Para almacenamiento a largo plazo, considera un lugar fresco y oscuro como un sótano o un armario interior.</p>
</section>

<section id="humedad">
<h2>Humedad Relativa</h2>
<p>La humedad relativa (HR) ideal para almacenar cannabis es entre 55% y 65%. Este rango mantiene los cogollos suficientemente hidratados para preservar su textura y terpenos, sin ser tan húmedo como para promover el crecimiento de moho.</p>
<h3>Humedad Demasiado Alta (más del 65%)</h3>
<p>El exceso de humedad es el mayor riesgo para el cannabis almacenado. Por encima del 65% de HR, el riesgo de moho aumenta significativamente. El moho en el cannabis no siempre es visible a simple vista — puede estar presente en el interior de los cogollos.</p>
<h3>Humedad Demasiado Baja (menos del 55%)</h3>
<p>La humedad insuficiente hace que los cogollos se sequen demasiado, volviéndose quebradizos y perdiendo terpenos. Un cannabis demasiado seco produce humo más áspero y pierde parte de su aroma.</p>
<h3>Paquetes de Control de Humedad</h3>
<p>Los paquetes de control de humedad (como los de la marca Boveda) son una solución práctica y económica. Disponibles en diferentes niveles de HR (58%, 62%, 69%), mantienen automáticamente la humedad dentro del rango deseado en el contenedor.</p>
</section>

<section id="luz">
<h2>Protección de la Luz</h2>
<p>La luz UV es uno de los factores más dañinos para el cannabis. Los estudios han demostrado que la exposición a la luz UV es la principal causa de degradación de cannabinoides en el cannabis almacenado.</p>
<p>Para proteger el cannabis de la luz:</p>
<ul>
<li>Usa contenedores opacos o de vidrio oscuro (ámbar o verde)</li>
<li>Guarda el cannabis en lugares oscuros — cajones, armarios, cajas</li>
<li>Evita los contenedores de plástico transparente o las bolsas zip transparentes para almacenamiento a largo plazo</li>
</ul>
</section>

<section id="oxigeno">
<h2>Control del Oxígeno</h2>
<p>El oxígeno oxida los cannabinoides y acelera su degradación. Para minimizar la exposición al oxígeno:</p>
<ul>
<li>Usa contenedores herméticos que minimicen el espacio de aire</li>
<li>Elige un contenedor del tamaño apropiado para la cantidad que tienes — demasiado espacio de aire es contraproducente</li>
<li>Abre el contenedor solo cuando sea necesario</li>
</ul>
<p>Para almacenamiento a muy largo plazo, algunos consumidores usan sellado al vacío, aunque esto puede comprimir los cogollos y dañar los tricomas si se hace incorrectamente.</p>
</section>

<section id="contenedores">
<h2>Contenedores Recomendados</h2>
<h3>Frascos de Vidrio con Tapa Hermética</h3>
<p>Los frascos de vidrio con tapa hermética (como los frascos Mason) son la opción más recomendada. El vidrio no transfiere olores ni sabores al cannabis, es hermético y puede ser opaco o de vidrio oscuro para proteger de la luz.</p>
<h3>Contenedores de Titanio</h3>
<p>Los contenedores de titanio son herméticos, duraderos y no transfieren sabores. Son una excelente opción aunque generalmente más costosos que el vidrio.</p>
<h3>Qué Evitar</h3>
<ul>
<li><strong>Bolsas de plástico zip:</strong> No son herméticas, pueden transferir sabores y no protegen de la luz</li>
<li><strong>Contenedores de plástico regular:</strong> El plástico puede generar carga estática que daña los tricomas y puede transferir sabores</li>
<li><strong>Cajas de madera sin forro:</strong> La madera puede absorber humedad y transferir olores</li>
</ul>
</section>

<section id="productos-especificos">
<h2>Almacenamiento por Tipo de Producto</h2>
<h3>Flores</h3>
<p>Frasco de vidrio hermético, oscuro, a temperatura ambiente (15-21°C), con paquete de control de humedad al 62%.</p>
<h3>Gummies y Comestibles</h3>
<p>Lugar fresco y oscuro, en su empaque original sellado o en un contenedor hermético. Algunos comestibles requieren refrigeración — sigue las instrucciones del fabricante.</p>
<h3>Vapes y Cartuchos</h3>
<p>Temperatura ambiente, posición vertical para evitar fugas, lejos del calor y la luz directa. No los guardes en el congelador.</p>
<h3>Concentrados</h3>
<p>Contenedores de silicona o vidrio, en lugar fresco y oscuro. Los concentrados más sensibles (como el live rosin) pueden beneficiarse de refrigeración.</p>
<h3>Tinturas</h3>
<p>Lugar fresco y oscuro, en su frasco original de vidrio oscuro. Algunas tinturas requieren refrigeración después de abrir.</p>
</section>

<section id="senales-deterioro">
<h2>Señales de Deterioro</h2>
<p>Señales de que tu cannabis se ha deteriorado:</p>
<ul>
<li><strong>Moho visible:</strong> Manchas blancas, grises o negras en los cogollos — no consumas cannabis con moho</li>
<li><strong>Olor a humedad o a heno:</strong> Indica degradación de terpenos o inicio de moho</li>
<li><strong>Textura excesivamente seca y quebradiza:</strong> Los cogollos se deshacen al tocarlos</li>
<li><strong>Pérdida de aroma:</strong> Un cannabis sin olor ha perdido sus terpenos</li>
<li><strong>Color amarillento o marrón:</strong> Puede indicar degradación de cannabinoides</li>
</ul>
</section>

<section id="faq">
<h2>Preguntas Frecuentes</h2>
<div class="faq-item">
<h3>¿Puedo guardar cannabis en el refrigerador?</h3>
<p>No es recomendable. El refrigerador tiene ciclos de temperatura y humedad variables que pueden promover la condensación. Además, los olores del refrigerador pueden contaminar el cannabis. Un lugar fresco y oscuro a temperatura ambiente es preferible.</p>
</div>
<div class="faq-item">
<h3>¿Cuánto tiempo dura el cannabis bien almacenado?</h3>
<p>El cannabis correctamente almacenado puede mantener su calidad durante 6-12 meses. Después de un año, comenzará a perder potencia y aroma gradualmente, aunque seguirá siendo consumible. El cannabis de más de 2 años habrá perdido significativamente su calidad.</p>
</div>
<div class="faq-item">
<h3>¿Los paquetes de control de humedad son necesarios?</h3>
<p>No son estrictamente necesarios, pero son muy recomendables para almacenamiento a largo plazo. Son económicos y eliminan la preocupación de mantener la humedad correcta manualmente. Para almacenamiento a corto plazo (menos de 2 semanas), generalmente no son necesarios.</p>
</div>
<div class="faq-item">
<h3>¿Puedo guardar diferentes variedades juntas?</h3>
<p>Es mejor guardar cada variedad en su propio contenedor para preservar sus aromas únicos. Si las guardas juntas, los perfiles de terpenos se mezclarán y perderás las características individuales de cada variedad.</p>
</div>
</section>

<section id="articulos-relacionados">
<h2>Artículos Relacionados</h2>
<ul>
<li><a href="/blog/terpenos-cannabis">Terpenos del Cannabis: Aromas, Sabores y Perfiles</a></li>
<li><a href="/blog/como-leer-coa-cannabis">Cómo Leer un COA de Cannabis</a></li>
<li><a href="/blog/guia-principiantes-primer-producto">Guía para Principiantes: Cómo Elegir tu Primer Producto</a></li>
</ul>
</section>
</article>',
    NULL,
    ARRAY['guardar cannabis', 'almacenamiento cannabis', 'conservar cannabis', 'humedad cannabis', 'temperatura cannabis', 'moho cannabis'],
    'published',
    false,
    8,
    'Cómo Guardar Cannabis y Productos THC Correctamente | Street Candy',
    'Aprende cómo almacenar cannabis correctamente: temperatura ideal, humedad, protección de la luz y oxígeno. Guía completa para preservar potencia, aroma y calidad del cannabis.',
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

  -- ============================================================
  -- ARTICLE 10: Guía de Dosificación de Cannabis
  -- ============================================================
  INSERT INTO public.blog_posts (
    id, blog_category_id, author_id, title, slug, excerpt, content,
    cover_image_url, tags, status, is_featured, read_time_minutes,
    meta_title, meta_description, published_at
  ) VALUES (
    gen_random_uuid(),
    cat_guias_id,
    NULL,
    'Guía de Dosificación de Cannabis para Principiantes: Cómo Encontrar tu Dosis Ideal',
    'guia-dosificacion-cannabis',
    'La dosificación es uno de los aspectos más importantes del consumo responsable de cannabis. Esta guía te ayudará a entender cómo dosificar diferentes tipos de productos, evitar errores comunes y encontrar la cantidad que funciona para ti.',
    '<article>
<header>
<h1>Guía de Dosificación de Cannabis para Principiantes: Cómo Encontrar tu Dosis Ideal</h1>
<p class="meta">Por Equipo Editorial de Street Candy &bull; 4 de agosto de 2026 &bull; 11 min de lectura</p>
</header>

<nav class="toc">
<h2>Tabla de Contenidos</h2>
<ol>
<li><a href="#por-que-importa-dosis">Por Qué la Dosificación Importa</a></li>
<li><a href="#factores-individuales">Factores que Afectan tu Respuesta</a></li>
<li><a href="#dosificacion-flores">Dosificación: Flores y Vapes</a></li>
<li><a href="#dosificacion-comestibles">Dosificación: Comestibles y Gummies</a></li>
<li><a href="#dosificacion-concentrados">Dosificación: Concentrados</a></li>
<li><a href="#concentracion-productos">Entendiendo la Concentración</a></li>
<li><a href="#microdosificacion">Microdosificación</a></li>
<li><a href="#errores-comunes">Errores Comunes de Dosificación</a></li>
<li><a href="#uso-responsable">Principios de Uso Responsable</a></li>
<li><a href="#faq">Preguntas Frecuentes</a></li>
</ol>
</nav>

<section id="por-que-importa-dosis">
<h2>Por Qué la Dosificación Importa</h2>
<p>El cannabis tiene una relación dosis-respuesta compleja. A dosis bajas, el THC puede producir efectos placenteros, relajantes o creativos. A dosis altas, puede producir ansiedad, paranoia, náuseas y una experiencia generalmente desagradable — especialmente en personas sin tolerancia establecida.</p>
<p>La buena noticia es que el cannabis no tiene una dosis letal conocida. La mala noticia es que una sobredosis de THC, aunque no sea peligrosa para la vida, puede ser una experiencia muy desagradable que puede durar horas.</p>
<p>La clave para una experiencia positiva con el cannabis es empezar con dosis bajas, aumentar gradualmente y conocer tu respuesta individual.</p>
</section>

<section id="factores-individuales">
<h2>Factores que Afectan tu Respuesta</h2>
<p>La respuesta al cannabis varía enormemente entre personas. Los principales factores son:</p>
<h3>Tolerancia</h3>
<p>Los consumidores nuevos tienen tolerancia cero — sus receptores CB1 no están acostumbrados al THC. Con el uso regular, el cuerpo desarrolla tolerancia y necesita más THC para lograr los mismos efectos. Por eso las dosis que funcionan para un consumidor habitual pueden ser abrumadoras para un principiante.</p>
<h3>Peso Corporal y Composición</h3>
<p>Aunque el peso corporal no es el factor determinante que muchos creen, puede influir en la respuesta al cannabis. Las personas con mayor masa corporal pueden necesitar dosis ligeramente más altas.</p>
<h3>Metabolismo</h3>
<p>Un metabolismo más rápido puede procesar el THC más rápidamente, resultando en efectos de menor duración. Un metabolismo más lento puede prolongar los efectos.</p>
<h3>Estado Mental y Entorno</h3>
<p>El "set and setting" — tu estado mental y el entorno donde consumes — tiene un impacto enorme en la experiencia. Consumir en un ambiente cómodo y con un estado mental positivo generalmente produce mejores experiencias que hacerlo bajo estrés o en un ambiente desconocido.</p>
<h3>Genética</h3>
<p>Algunas personas tienen variantes genéticas que las hacen más o menos sensibles a los efectos del THC. Esto explica por qué algunas personas son muy sensibles al cannabis mientras que otras necesitan dosis altas para sentir efectos.</p>
</section>

<section id="dosificacion-flores">
<h2>Dosificación: Flores y Vapes</h2>
<p>Las flores y los vapes son los métodos más fáciles de dosificar para principiantes porque los efectos comienzan rápidamente (2-10 minutos), lo que permite evaluar la respuesta antes de consumir más.</p>
<h3>Guía de Dosificación para Flores</h3>
<ul>
<li><strong>Principiante:</strong> Una sola inhalación corta. Espera 15 minutos antes de evaluar.</li>
<li><strong>Tolerancia baja:</strong> 1-2 inhalaciones. Espera 15-20 minutos entre sesiones.</li>
<li><strong>Tolerancia moderada:</strong> 2-4 inhalaciones según preferencia.</li>
<li><strong>Tolerancia alta:</strong> Según experiencia personal.</li>
</ul>
<h3>Consideraciones de Potencia</h3>
<p>La potencia del producto afecta directamente la dosificación. Una inhalación de una flor con 25% de THC es significativamente más potente que una inhalación de una flor con 12% de THC. Siempre verifica la potencia en el COA y ajusta tu dosis en consecuencia.</p>
<h3>Vapes</h3>
<p>Los aceites de vape son generalmente más concentrados que la flor (60-90% de THC vs. 15-25% en flor). Aplica el mismo principio: empieza con una sola inhalación corta y espera antes de tomar más.</p>
</section>

<section id="dosificacion-comestibles">
<h2>Dosificación: Comestibles y Gummies</h2>
<p>Los comestibles son el tipo de producto donde los errores de dosificación son más comunes y sus consecuencias más pronunciadas. El inicio tardío de los efectos (30 minutos a 2 horas) lleva a muchos consumidores a tomar más de lo necesario.</p>
<h3>Guía de Dosificación para Comestibles</h3>
<table>
<thead>
<tr><th>Dosis de THC</th><th>Perfil del Consumidor</th><th>Efectos Esperados</th></tr>
</thead>
<tbody>
<tr><td>1-2.5 mg</td><td>Principiante absoluto</td><td>Efectos muy sutiles, ideal para primera experiencia</td></tr>
<tr><td>2.5-5 mg</td><td>Principiante</td><td>Efectos leves a moderados</td></tr>
<tr><td>5-10 mg</td><td>Tolerancia baja-moderada</td><td>Efectos moderados</td></tr>
<tr><td>10-20 mg</td><td>Tolerancia moderada</td><td>Efectos pronunciados</td></tr>
<tr><td>20+ mg</td><td>Tolerancia alta</td><td>Efectos intensos</td></tr>
</tbody>
</table>
<h3>La Regla de Oro de los Comestibles</h3>
<p><strong>Empieza bajo, ve despacio.</strong> Toma tu dosis inicial, espera al menos 2 horas antes de considerar tomar más. Los efectos de los comestibles pueden tardar hasta 2 horas en aparecer completamente.</p>
</section>

<section id="dosificacion-concentrados">
<h2>Dosificación: Concentrados</h2>
<p>Los concentrados son productos de alta potencia (60-95% de THC) que requieren equipos especializados y experiencia previa. No son recomendados para principiantes.</p>
<p>Si decides explorar los concentrados, empieza con una cantidad mínima — literalmente del tamaño de un grano de arroz o menos — y espera para evaluar los efectos antes de consumir más.</p>
</section>

<section id="concentracion-productos">
<h2>Entendiendo la Concentración</h2>
<p>Para calcular la dosis exacta de THC en un producto:</p>
<h3>Flores</h3>
<p>Si una flor tiene 20% de THC total, hay 200 mg de THC por gramo. Un porro de 0.5 gramos contiene aproximadamente 100 mg de THC, aunque no todo se inhala — la eficiencia de absorción al fumar es aproximadamente del 25-50%.</p>
<h3>Comestibles</h3>
<p>Los comestibles indican la dosis por porción en el empaque (por ejemplo, "10 mg de THC por gummy"). Esta es la dosis más fácil de calcular con precisión.</p>
<h3>Vapes</h3>
<p>Los cartuchos de vape indican el porcentaje de THC. Una inhalación de 3 segundos de un cartucho de 80% de THC puede contener entre 2-5 mg de THC, dependiendo del dispositivo.</p>
</section>

<section id="microdosificacion">
<h2>Microdosificación</h2>
<p>La microdosificación es la práctica de consumir cantidades muy pequeñas de cannabis — generalmente 1-5 mg de THC — para obtener beneficios sutiles sin efectos psicoactivos pronunciados.</p>
<p>Los microdosificadores reportan beneficios como mayor enfoque, reducción del estrés y mejora del estado de ánimo sin sentirse "high". Es una estrategia popular entre consumidores que quieren integrar el cannabis en su rutina diaria de forma funcional.</p>
<p>Para microdosificar efectivamente, los comestibles de baja dosis o los vapes con inhalaciones muy cortas son los métodos más precisos.</p>
</section>

<section id="errores-comunes">
<h2>Errores Comunes de Dosificación</h2>
<h3>Error 1: Consumir más porque "no siento nada"</h3>
<p>El error más común, especialmente con comestibles. Los efectos pueden tardar hasta 2 horas en aparecer. Espera siempre el tiempo suficiente antes de tomar más.</p>
<h3>Error 2: Ignorar la potencia del producto</h3>
<p>Una inhalación de una flor de 25% de THC es muy diferente a una de 12%. Siempre verifica la potencia y ajusta tu dosis.</p>
<h3>Error 3: Mezclar con alcohol</h3>
<p>El alcohol potencia los efectos del THC significativamente. La combinación puede resultar en efectos mucho más intensos de lo esperado.</p>
<h3>Error 4: Consumir en un ambiente estresante</h3>
<p>El estado mental y el entorno influyen enormemente en la experiencia. Evita consumir cuando estés ansioso, estresado o en un ambiente desconocido, especialmente si eres principiante.</p>
<h3>Error 5: No tener CBD disponible</h3>
<p>El CBD puede moderar los efectos del THC. Tener un producto de CBD disponible puede ser útil si sientes que consumiste demasiado THC.</p>
</section>

<section id="uso-responsable">
<h2>Principios de Uso Responsable</h2>
<ol>
<li><strong>Empieza bajo, ve despacio:</strong> Siempre comienza con la dosis mínima recomendada</li>
<li><strong>Conoce tu producto:</strong> Verifica siempre la potencia en el COA</li>
<li><strong>No conduzcas:</strong> Nunca conduzcas bajo los efectos del cannabis</li>
<li><strong>Elige el momento adecuado:</strong> Consume cuando tengas tiempo libre y no tengas responsabilidades importantes</li>
<li><strong>Mantén hidratación:</strong> Bebe agua antes, durante y después</li>
<li><strong>Respeta tu tolerancia:</strong> Lo que funciona para otro puede no funcionar para ti</li>
<li><strong>Toma descansos regulares:</strong> Los descansos periódicos previenen el desarrollo de tolerancia excesiva</li>
</ol>
</section>

<section id="faq">
<h2>Preguntas Frecuentes</h2>
<div class="faq-item">
<h3>¿Cuánto THC es demasiado para un principiante?</h3>
<p>Para la mayoría de los principiantes, más de 5 mg de THC en comestibles o más de 2-3 inhalaciones de flores de potencia moderada puede resultar en una experiencia desagradable. Empieza siempre con la dosis mínima y aumenta gradualmente en sesiones futuras.</p>
</div>
<div class="faq-item">
<h3>¿Qué hago si consumí demasiado THC?</h3>
<p>Recuerda que los efectos son temporales. Busca un lugar cómodo, bebe agua, respira profundo y recuerda que estás bien. El CBD puede ayudar a moderar los efectos. Evita el pánico — es la respuesta más contraproducente. Los efectos pasarán.</p>
</div>
<div class="faq-item">
<h3>¿La microdosificación funciona para todos?</h3>
<p>La microdosificación funciona bien para muchas personas, pero la respuesta es individual. Algunas personas no sienten efectos con dosis muy bajas, mientras que otras son muy sensibles. Experimenta con diferentes dosis para encontrar lo que funciona para ti.</p>
</div>
<div class="faq-item">
<h3>¿Puedo desarrollar tolerancia al cannabis?</h3>
<p>Sí. El uso regular de cannabis produce tolerancia — el cuerpo reduce la densidad de receptores CB1 en respuesta a la estimulación continua. Los descansos periódicos (llamados "tolerance breaks" o "T-breaks") permiten que los receptores se recuperen y restauran la sensibilidad al cannabis.</p>
</div>
<div class="faq-item">
<h3>¿Los comestibles son más potentes que fumar?</h3>
<p>Los comestibles producen efectos diferentes, no necesariamente más potentes en términos de THC. Sin embargo, el hígado convierte el THC en 11-hidroxi-THC, un metabolito que cruza la barrera hematoencefálica más eficientemente que el THC inhalado. Esto puede hacer que los efectos de los comestibles se sientan más intensos y duraderos, incluso con la misma cantidad de THC.</p>
</div>
</section>

<section id="articulos-relacionados">
<h2>Artículos Relacionados</h2>
<ul>
<li><a href="/blog/guia-principiantes-primer-producto">Guía para Principiantes: Cómo Elegir tu Primer Producto</a></li>
<li><a href="/blog/cannabinoides-explicados">Cannabinoides Explicados: THC, CBD, CBG, CBN y Más</a></li>
<li><a href="/blog/cuanto-tiempo-permanece-thc-cuerpo">¿Cuánto Tiempo Permanece el THC en el Cuerpo?</a></li>
</ul>
</section>
</article>',
    NULL,
    ARRAY['dosificación cannabis', 'dosis THC', 'microdosificación cannabis', 'comestibles dosis', 'principiantes cannabis', 'uso responsable cannabis'],
    'published',
    false,
    11,
    'Guía de Dosificación de Cannabis para Principiantes | Street Candy',
    'Aprende a dosificar cannabis correctamente: flores, gummies, vapes y concentrados. Guía completa con tablas de dosificación, errores comunes y principios de uso responsable.',
    NOW()
  )
  ON CONFLICT (slug) DO NOTHING;

END $$;
