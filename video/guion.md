# Video · presentación y guion (hasta 10 minutos)

## 1 · Portada · 0:00

**Dices:** Hola, soy Santiago Pachón Díaz. Les presento «Caja a 14 días»: una función de Necta para que la dueña de un negocio sepa, con dos semanas de anticipación, si le alcanza la plata y qué hacer hoy.

## 2 · El problema · 0:15


**Dices:** Carmen tiene una distribuidora en Barranquilla. Vende a crédito, registra en Necta una de cada cuatro cosas y trabaja donde no hay señal. El viernes le paga cuatro millones doscientos mil al proveedor. Sumado a lo bruto, le sobran siete millones. Es un espejismo: el viernes alcanza solo si Hotel Brisas paga el jueves, y luego vienen dos pagos que Necta no conoce. El sábado le faltan ciento treinta y seis mil; el lunes, más de un millón trescientos mil.

## 3 · La solución · 0:48

**Dices:** La solución es un pronóstico de caja día a día, a catorce días, para cualquier tienda de Necta. No da un solo número; da tres bandas: plata segura, probable y favorable. Con ellas responde qué pasa y cuándo, de qué cobro depende y qué hacer hoy. Funciona sin señal y cada cifra sale de una regla explicable. La función quedó especificada completa para que el equipo la construya, y construí el motor, la pantalla y el diagrama.

## 4 · Cómo está estructurada · 1:20

**Dices:** Son cuatro piezas. El corazón es una librería transversal: el motor de cálculo, en TypeScript puro, sin dependencias ni red. Lo usan las otras tres, y por eso todas dan el mismo resultado.

La app, en Expo y React Native, es donde vive la dueña: la pantalla, el registro de cobros y pagos fijos, y los avisos. Guarda lo de su tienda en una base local con PowerSync y recalcula sin señal.

La web, en React con Vite, es para mirar con calma: las tres bandas en el tiempo y un simulador con el mismo motor. No guarda nada.

El backend, el Node.js de Necta con MongoDB, entrega el pronóstico oficial ya calculado, recibe los cobros sin duplicarlos, aprende cómo paga cada cliente en trabajos nocturnos, y envía los avisos por push, WhatsApp y correo. PowerSync baja a cada teléfono solo lo de su tienda.

## 5 · El motor por dentro · 2:20

**Dices:** Por dentro, el motor es una función: entran los datos de una tienda y una fecha, salen catorce días. Es determinista: la misma entrada da la misma salida en el servidor y en el teléfono. Son nueve pasos: el punto de partida, los cobros fechados por cliente, el ritmo de ventas, las salidas, la simulación día a día que marca el primer hueco y el peor, las dependencias, la certeza con sus razones, las acciones ordenadas y el veredicto en una frase. Y una regla que atraviesa todo: una factura entra entera o no entra. La técnica, en detalle, en la siguiente.

## 6 · La técnica · 3:02

**Dices:** La técnica son reglas deterministas sobre cómo paga cada cliente. Primero, el perfil: con sus ventas a crédito, su porcentaje de pagos a tiempo y su atraso medio, cada cliente queda como confiable, irregular, de historial corto o vencido. Segundo, el perfil da una probabilidad y una fecha distinta por banda: un confiable entra en la plata segura con su porcentaje de pagos a tiempo, en la fecha más tardía de su atraso; un irregular, solo si llega a ochenta por ciento; uno nuevo o vencido nunca entra en la segura. Tercero, la simulación: cada día, por banda, saldo anterior más ventas menos gastos, más cobros menos pagos; la banda segura cuenta el ochenta por ciento de las ventas y sin quincena; de ahí salen el primer hueco, el peor y las dependencias. Cuarto, la certeza resta penalizaciones explicables, y cada acción se puntúa por cuánto tapa el hueco, su probabilidad y su urgencia. Todo con parámetros versionados. ¿Por qué no ARIMA? Veintiséis semanas con el veinticinco por ciento registrado sobreajustan y no se explican en una tarjeta; entraría después, con miles de tiendas, si le gana a las reglas.

## 7 · El diagrama: visión completa · 4:21

**Dices:** El diagrama muestra qué corre en el teléfono, en la web y en el servidor: verde continuo existe en el prototipo; punteado, falta.

## 8 · El diagrama: teléfono, web, integraciones y servidor · 4:31

**Dices:** Arriba, la app con su base local y su cola, la web, las integraciones y el servidor con PowerSync.

## 9 · El diagrama: el flujo de un abono sin señal · 4:38

**En pantalla:** el recorte de la franja amarilla:

**Dices:** El flujo central es un abono sin señal. Carmen anota trescientos mil de Hotel Brisas; el teléfono lo valida con la regla del servidor, lo guarda con un identificador creado ahí y recalcula al instante. Al volver la señal, la cola lo sube y el servidor guarda por ese identificador: un reenvío no duplica nada. Si entretanto entró otro abono desde la web y ya no cabe, responde conflicto, la cola sigue y Carmen decide con un toque. Nada se fusiona en silencio. De vuelta, PowerSync baja la versión oficial.

## 10 · El diagrama: las fallas · 5:16

**Dices:** Y doce fallas, cada una con su respuesta.

## 11 · La pantalla: identidad visual · 5:19

**Dices:** La pantalla usa la identidad de Necta: el azul marino de la tarjeta principal, el verde y el naranja en las cifras, el lavanda para la información y la tipografía Manrope. Y está hecha para la calle. Todas las cifras tienen contraste de siete a uno o más, verificado en pruebas, para leerse al sol. Una sola columna, el titular primero y botones grandes al alcance del pulgar.

## 12 · La pantalla en vivo · 5:47


**Dices:** [Señalar la tarjeta principal] Primero la respuesta: el sábado faltan ciento treinta y seis mil para los ayudantes, y el viernes depende de Hotel Brisas. [Bajar] Debajo, la certeza con sus razones, catorce barras de plata segura y tres acciones para hoy, con el WhatsApp ya escrito.

[Activar «Simular sin señal»] Sin señal, la app muestra el pronóstico con su hora. [«Registrar cobro» en Hotel Brisas, 300000, guardar] Registro trescientos mil de Brisas: se recalcula en el acto y queda «pendiente de sincronizar». El titular no cambia, porque esa plata ya contaba el jueves; lo que baja es la dependencia del viernes, a ochocientos sesenta y dos mil. [Desactivar «Simular sin señal»] Vuelve la señal: «abono guardado».

Se siente instantáneo: el motor tarda menos de tres décimas de milisegundo en mi computador y menos de tres con doscientos clientes; el presupuesto en un Android de gama baja es de cincuenta. Sesenta y seis pruebas lo respaldan.

## 13 · Tiempo · 7:03

**Dices:** La prueba sugería dos horas; fueron dos horas y veinte: treinta minutos en entender el caso, cuarenta en el motor y la pantalla, cuarenta en el diagrama y treinta revisando lo que propuso la IA. Profundicé en las especificaciones, el cálculo y el trabajo sin señal.

## 14 · Cómo usé la IA · 7:22

**Dices:** Dos prompts clave. El primero, para la solución y su arquitectura: que actuara como arquitecto de Necta, con el PDF del caso como única fuente de verdad, y diseñara el cambio OpenSpec completo: cada número de una regla versionada, cero jerga, los campos reales de la API, qué calcula cada capa, cómo sincronizar sin duplicar abonos, y cada decisión con su alternativa descartada y escenarios verificables. El segundo, para el diagrama: a partir del diseño, un Excalidraw con las zonas, el flujo de un abono sin señal paso a paso y las doce fallas con su respuesta; en verde lo que existe, punteado lo que falta; generado por script, y entregado como Excalidraw, SVG, PNG y README. Y algo que corregí: la IA propuso como implementación parcial un endpoint de backend, y hacer la sincronización a mano. Como mi experiencia está en frontend y mobile, elegí el diagrama, para no dejar de lado el diseño del backend, y la pantalla, para mostrar mi capacidad; y PowerSync como capa de sincronización.

## 15 · El siguiente nivel · 8:33

**Dices:** La meta es ver el hueco con una semana de anticipación y saber qué hacer. Primero, medir contra esa meta: con qué anticipación vimos cada hueco real, si los avisos terminan en cobros, y calibrar las probabilidades con el backtesting. Segundo, cerrar el ciclo: que pedir plazo al proveedor sea una propuesta con seguimiento dentro de Necta. Tercero, más registro con menos esfuerzo, con voz y fotos de facturas, porque cada punto de registro sube la certeza.

## 16 · Un cambio de opinión técnico · 9:05

**Dices:** Antes de la IA, en una empresa de marketing, construíamos landing pages para eventos en Angular. Nos las empezaron a pedir más livianas y más rápidas, y cambié el stack a Svelte: por su velocidad, su ligereza y porque no es tan difícil de aprender. Con el equipo lo manejé con una hora diaria para preguntas, dudas y mini clases de Svelte que yo dictaba, para que su curva de aprendizaje fuera menos compleja.

## 17 · Cierre · 9:35

**Dices:** En resumen: una pantalla que Carmen puede leer en la calle, que le dice de qué cobro depende el viernes, funciona sin señal y no le muestra un espejismo, y un plan completo para que el equipo la construya. Gracias.

---

## Anexo A · Cifras para las diapositivas

Todas salen del motor con los datos del caso y se verificaron al escribir este guion.

| Dato | Valor |
| :--- | ---: |
| Cálculo ingenuo (1.900.000 + 5.600.000 + ventas 3.704.000 − 4.200.000) | +7.004.000 |
| Plata hoy según los movimientos · por confirmar | 1.640.000 · 260.000 |
| Viernes 29, plata segura · sin Hotel Brisas | 938.000 · −1.162.000 |
| Sábado 30, primer hueco (ayudantes) | −136.000 |
| Lunes 1, peor hueco (arriendo) | −1.318.000 |
| Salen en 4 días, del viernes al lunes | 6.900.000 |
| Certeza hoy · al cuadrar la caja | 0,46 · 0,62 |
| Tras un abono de 300.000 de Hotel Brisas: dependencia del viernes · certeza | −862.000 · 0,49 |

**Velocidad del motor**, medida en un Apple M4 Pro con Node 24 sobre el mismo código del prototipo:

| Tienda | Promedio | p95 |
| :--- | ---: | ---: |
| Caso de Carmen: 6 cuentas por cobrar, 14 días | 0,27 ms | 0,31 ms |
| 50 cuentas y 20 pagos fijos, 14 días | 0,66 ms | 0,75 ms |
| 200 cuentas y 20 pagos fijos, 60 días | 2,7 ms | 2,9 ms |

El presupuesto en un Android de gama baja es de 50 ms. En el teléfono el motor corre más lento que en un computador; no se midió en un equipo real.

## Anexo B · Los dos prompts, texto completo

**Prompt 1 · La solución y su arquitectura**

> Actúa como arquitecto de producto y de software de Necta. Adjunto el enunciado del caso «Caja a 14 días»: es la única fuente de verdad; no inventes datos ni cambies los del anexo. Diseña la solución completa como un cambio OpenSpec (`proposal.md`, `design.md`, `tasks.md` y `specs/<capacidad>/spec.md`) que otra persona del equipo pueda tomar y construir.
>
> Restricciones: la dueña trabaja sin señal, con el sol encima y con una mano; registra el 25 % de sus movimientos; cada número que vea debe salir de una regla explícita y versionada; ningún texto para ella puede usar jerga contable; respeta los nombres reales de los campos de la API (`storedLedgerBalance`, `projectedBalance`, `alignmentDelta`, `counterpartyName`, `pendingAmount`, `creditDueBy`, `clientMutationId`).
>
> Decide y justifica: qué calcula el teléfono, la web y el servidor; cómo se sincroniza sin duplicar abonos y qué pasa en un conflicto; cuánta inteligencia artificial hace falta con seis meses de datos de una sola tienda; cómo y cuándo llegan los avisos. Para cada decisión escribe la alternativa que descartaste y por qué. Entrega los requisitos con escenarios WHEN / THEN verificables con los datos del anexo.

**Prompt 2 · El diagrama a detalle y cómo entregarlo**

> A partir del `design.md`, genera el diagrama de arquitectura de «Caja a 14 días» en Excalidraw. Debe mostrar: las zonas Teléfono, Web, Servidor, Datos e Integraciones externas con lo que corre en cada una; el flujo de un abono registrado sin señal paso a paso (validación local con la regla del servidor, cola con un id generado en el cliente, proyección optimista, subida al volver la señal, `201` o `200 replayed`, `409` y revisión de un toque); y las fallas con la respuesta del sistema (sin señal, reenvío de la cola, mismo id con otro contenido, abono mayor al pendiente, push no entregado, snapshot sucio, cola de jobs caída, voz sin créditos, PowerSync caído, JWT vencido, sync rules incompletas, celular nuevo).
>
> Marca con borde verde continuo lo que existe en el prototipo y con borde punteado lo que falta por construir. Genera los elementos con un script, para que cajas, flechas y archivo salgan de una sola fuente y no se desalineen al editar; verifica que ningún texto desborde su caja. Entrega `.excalidraw`, `.svg` y `.png`, más un README que explique cómo leerlo.

## Checklist antes de grabar

- [ ] Ensayo cronometrado por debajo de 10:00; si te pasas, acorta primero la 14 y la 6.
- [ ] `npx expo start --ios` abre la pantalla en el simulador; reinicia la app para volver a los datos del caso antes de grabar.
- [ ] El diagrama abierto en el navegador para el acercamiento a la franja amarilla.
