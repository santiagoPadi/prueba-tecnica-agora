# Proposal · «Caja a 14 días» (capacidades `cashflow-*`)

## Why

Las dueñas de negocios pequeños que usan Necta venden a crédito, registran solo una parte de sus movimientos y trabajan sin señal, y antes de un pago grande no saben si la plata les alcanza ni a quién cobrarle primero, porque Necta solo mira hacia atrás y sus recordatorios no evalúan la caja. «Caja a 14 días» responde esa pregunta con una semana de anticipación, en lenguaje cotidiano y con acciones concretas, para que la dueña cobre, negocie o aparte plata antes de acudir a un préstamo informal.

## What Changes

- Añadir un **pronóstico de caja día a día** (14 días por defecto, hasta 60) en tres bandas: plata segura, probable y favorable. Parte del saldo que dan los movimientos (`projectedBalance`), muestra la diferencia con el guardado (`storedLedgerBalance`; `alignmentDelta`) como plata por confirmar, fecha cada cobro (`pendingAmount`, `creditDueBy`, `counterpartyName`) según cómo paga cada cliente, modela las ventas de contado por día de la semana y descuenta los pagos que Necta no tiene registrados.
- Responder con un **veredicto en lenguaje cotidiano**, una **certeza explicada** (alta / media / baja) y **qué hacer**: a quién cobrarle primero, qué cobro asegurar porque de él depende un pago y a quién pedirle plazo, con el mensaje de WhatsApp listo.
- Dar una **pantalla en la app** y una **tarjeta resumen en inicio**, legibles al sol, usables con una mano y útiles sin señal: último pronóstico con su hora, abono registrado en el acto y sincronización sin duplicados.
- **Captura:** onboarding del ritmo de ventas, compromisos (nómina, arriendo, cuotas) por chips de un toque, voz (`cashCommitmentV1`) o a mano, siempre con confirmación, y cuadre del saldo en un toque.
- **Escrituras idempotentes** (`clientMutationId`, `409` explícito) y una regla de qué cambio gana entre app y web; nada se fusiona ni se descarta en silencio.
- **Sincronización en la app** con base local y cola de escrituras hacia la API (PowerSync; ver `design.md`, decisión 10); la web va contra la API.
- **Avisos a tiempo** por push y, si no hay app o permiso, por WhatsApp con plantilla o correo, con **preferencias y consentimiento**.
- **Panel web** con las tres bandas, simulador «¿qué pasa si…?», cuadre y compromisos.
- **Señal de otras tiendas** solo agregada (K ≥ 3), con consentimiento y exclusión.
- **Medición y operación:** telemetría de uso y costo, backtesting por `rulesVersion`, flag por tienda y vista de diagnóstico para soporte; el pronóstico es gratis.

## Capabilities

### New Capabilities
- `cashflow-forecast`: el cálculo día a día en tres bandas, el veredicto, la certeza explicada y las acciones (a quién cobrar, qué cobro asegurar, a quién pedir plazo), el nivel de inteligencia artificial, el lenguaje sin jerga y la señal agregada de otras tiendas.
- `cashflow-capture`: lo que Necta no tiene y el pronóstico necesita: ritmo de ventas declarado, pagos fijos que no pasan por la app y compromisos (chips de un toque, voz, formulario), siempre con confirmación.
- `cashflow-ui`: la pantalla «Caja a 14 días», la tarjeta resumen en inicio, legibilidad al sol y uso con una mano, accesibilidad y el panel web.
- `cashflow-offline-sync`: trabajo sin señal, escrituras idempotentes sin duplicados, modelo de errores de la API y acceso solo a la propia tienda.
- `cashflow-notifications`: avisos a tiempo con escalada push → WhatsApp → correo, preferencias y consentimiento.
- `cashflow-operations`: pronóstico oficial precalculado y su frescura, historial y soporte, costo y créditos, rendimiento, telemetría, retención y borrado, bandera por tienda y observabilidad.

Son las primeras capacidades del proyecto (`openspec/specs/` está vacío), así que todos sus requisitos son ADDED; al archivar el cambio quedarán como los specs vigentes.

### Modified Capabilities
Ninguna. Necta no tiene todavía specs OpenSpec de sus sistemas existentes (cuentas por cobrar y abonos, bancos, notificaciones y mensajería, voz), así que no hay un `openspec/specs/<capacidad>/spec.md` sobre el que escribir un delta MODIFIED. Los cambios que esta función exige en esos sistemas se declaran en **Impact** y se especifican como requisitos ADDED («Sin duplicados en el servidor» y «Modelo de errores de la API» en `cashflow-offline-sync`, «Avisos a tiempo con fallback» en `cashflow-notifications`, «Horizonte y saldo de partida» en `cashflow-forecast` para el cuadre); cuando esos sistemas tengan su spec base, pasarán a deltas MODIFIED de esa capacidad.

## Impact

- **App React Native / Expo:** pantalla, tarjeta, captura y hoja de revisión; SQLite y cola de PowerSync (`@powersync/react-native`), que exigen un development build de EAS y una versión nativa en las tiendas.
- **Sincronización:** PowerSync Service sobre Atlas (replica set, MongoDB 6+, post-images). Solo la app.
- **Backend Node.js + MongoDB:** motor y endpoints nuevos, colecciones nuevas y derivadas, jobs BullMQ sobre Redis y OpenAPI.
- **Web React / Vite:** panel, simulador, cuadre, compromisos y abonos, bajo el mismo dominio que la API.
- **Sistemas existentes afectados (sin spec OpenSpec previa; ver Modified Capabilities):** cuentas por cobrar y abonos (`POST /v2/receivables/:id/payments` acepta `clientMutationId` y `clientTimestamp` opcionales; un reenvío idéntico responde `200 replayed`; contenido distinto, `409 client_mutation_conflict`; un abono mayor a `pendingAmount`, `409 amount_exceeds_pending`; sin `clientMutationId` responde como hoy); bancos (nuevo `POST /v2/banks/:id/reconcile-quick` con tres modos y ajuste auditable `conteo-de-caja`; `GET /v2/banks/:id/projection` no cambia); notificaciones y mensajería (plantilla de WhatsApp `caja_alerta_v1`, escalada push → WhatsApp → correo, preferencias por tienda); voz (`cashCommitmentV1` en `extract-schema`); push Expo y correo; ventas por lote (`POST /v2/sale/batch`, ya idempotente, sin cambios).
- **Datos, legal y costo:** agregación K-anónima y consentimiento (Ley 1581 de 2012; Ley 1266 de 2008). El pronóstico no consume créditos; la voz y los mensajes por IA sí, como hoy.

## Estado de partida

- **Lo que Necta tiene hoy:** resúmenes que miran hacia atrás (total por cobrar y por pagar sin ventana de fechas), ningún registro de los pagos fijos que no pasan por la app, recordatorios push que solo avisan que algo vence mañana y no llegan a la web, y una app que sin señal no guarda nada.
- **La pregunta sin respuesta:** «¿me alcanza, o le pido plazo? ¿a quién le cobro primero?». *Ejemplo (Carmen Ortiz, Limpia Ya, Barranquilla, lunes 25 de mayo de 2026):* Necta le muestra $1.900.000 entre caja y banco y $5.600.000 por cobrar; el viernes debe $4.200.000. El cálculo ingenuo dice «te sobran $7.004.000»; día a día, el viernes alcanza solo si Hotel Brisas paga el jueves, el sábado faltan $136.000 y el lunes $1.318.000. Vale para cualquier tienda y fecha.
- Existe un **prototipo** (`app/`): un motor TypeScript puro con reglas versionadas (`RULES_VERSION = 2026.05.r2`), probado con el caso de referencia, y una pantalla React Native de una sola vista con estado optimista y una cola de sincronización simulada en memoria. El diagrama de arquitectura está en `arquitectura/`.
- **Por construir:** backend, PowerSync, web, avisos, señal de otras tiendas, costo y operación.

## Objetivos y no objetivos

**Objetivos**

- Que la dueña de cualquier tienda vea, con una semana de anticipación y para cualquier fecha y horizonte de 1 a 60 días, si su caja cubre lo que debe, qué tan segura es la respuesta y qué hacer.
- Una sola respuesta en app (con o sin señal), web, avisos y servidor: un motor, un `rulesVersion`.
- Capturar con un toque lo que Necta no tiene (ritmo, pagos fijos, saldo), sin duplicados ni cambios descartados en silencio entre app y web.
- Avisos por el canal que funciona, sin cansar; pantalla legible al sol por defecto y usable con una mano.
- Medir error, adopción y costo por tienda.

**No objetivos**

- Ser asesoría financiera ni reemplazar el cuaderno o la contabilidad de la tienda.
- Que una IA decida: cifras, fechas y prioridades salen de un motor de reglas; la IA solo interviene en la voz y en borradores de mensajes, con confirmación.

## Alcance por capa

Entre paréntesis, las épicas E1–E12 que construyen cada capa; son los grupos 1–12 de `tasks.md`, que también trae las fases F0–F4 con duraciones, equipos y criterios de salida.

### App (E3, E4, E5, E6)
- **Pantalla «Caja a 14 días»** sobre SQLite local (titular, certeza, plata segura día a día, acciones con WhatsApp listo, hoja de abono; horizonte configurable), **tarjeta resumen en inicio** y **onboarding del ritmo de ventas**.
- **Compromisos:** chips de un toque cuando faltan ≤ 7 días para quincena o inicio de mes, voz y formulario; confirmar, editar, borrar y revisar los `sugerido-por-patron`. **Cuadre** en un toque.
- **Hoja de revisión de conflictos:** ante `409 amount_exceeds_pending`, «es el mismo pago» o «fue un pago aparte»; en ediciones, «cambiado desde la web el …» con deshacer en 24 h.
- **Deep links y push:** `necta://` (registrar venta, compromisos, abrir la pantalla desde el aviso), permiso y token de notificaciones, preferencias de avisos y consentimiento, `wa.me` con el número real del cliente.
- **Telemetría** sin datos personales (`forecast_viewed`, `action_tapped`, `notification_opened`…), guardada sin señal y enviada en lote; **accesibilidad:** contraste ≥ 7:1, toques ≥ 48 dp, VoiceOver y TalkBack, fuente del sistema al 200 %, nada solo por color, textos sin jerga.

### Backend (E2, E3, E4, E8)
- **Endpoints:** `GET/POST /v1/cashflow/forecast` y `GET …/forecast/history`; `GET/POST /v1/cashflow/commitments`, `PATCH …/:id/confirm`, `DELETE …/:id`; `GET/PATCH /v1/cashflow/rhythm` y `…/notification-preferences`; `POST /v2/banks/:id/reconcile-quick`; `POST /v2/receivables/:id/payments` extendido; `cashCommitmentV1` en `/v1/voice/extract-schema`; plantillas de WhatsApp en mensajería; errores `{ code, message, details }` y límites de uso; OpenAPI.
- **Datos:** `CashCommitment`, `CashflowForecastSnapshot`, `MutationReceipt` (TTL 90 días), `CounterpartyProfile`, `CounterpartyNetworkProfile`, `EntityLink`, `ForecastIssued` y las colecciones derivadas para el teléfono.
- **Jobs (BullMQ):** snapshot nocturno por zona horaria, recálculo por evento (`isDirty`), perfiles de pago de 6 meses y de red (solo en el servidor; el teléfono nunca los calcula), detector de recurrencias, backtesting y avisos (lunes 7:00, chequeo de las 18:00): push (Expo, ticket y recibo) → WhatsApp (`caja_alerta_v1`) → correo, con dedupe, horario y cuota.
- **Idempotencia:** recibo por `storeId + clientMutationId` con hash, `200 replayed`, `409 client_mutation_conflict` y validación atómica de `pendingAmount`.

### Sincronización (E5)
- **PowerSync Service** (Cloud o propio) conectado a Atlas (replica set, MongoDB 6+, change streams con post-images); sync rules en el repo, un bucket por tienda según el `store_id` del JWT de Necta (JWKS). Solo en la app.
- **Bajan** `cashflow_forecasts`, `cashflow_receivables`, `receivable_payments` (90 días), `cashflow_payables`, `cash_commitments`, `cashflow_pockets` y `cashflow_rhythm`; `pending_reviews` es solo local. **Suben** por `uploadData` a los endpoints idempotentes; `complete()` también ante un `409`.

### Web (E7)
- Panel `/caja` con las tres bandas, muro de 4 días, dependencias y certeza, leyendo `GET /v1/cashflow/forecast`; simulador «¿qué pasa si…?» con el motor en el navegador; cuadre, abonos y compromisos (`/caja/compromisos`) con `clientMutationId` generado en el navegador; preferencias de avisos y consentimiento; enlace firmado de solo lectura y 24 h desde WhatsApp y correo; accesible con teclado. Sin datos locales ni PowerSync.

### Datos y privacidad (E9, E11)
- **Señal de otras tiendas:** `EntityLink` (NIT > teléfono verificado > nombre + ciudad, confianza ≥ 0,8) y `CounterpartyNetworkProfile` con K ≥ 3 comercios y ≥ 10 facturas, atraso redondeado y supresión si un comercio aporta más del 50 %; solo como prior para clientes con poco historial, con texto neutro.
- **Consentimiento:** autorización expresa al activar (casilla sin marcar, con fecha y versión del texto), un solo interruptor para aportar y usar la señal, exclusión efectiva en 24 h, opt-in de WhatsApp y auditoría de cada consulta.
- **Retención y borrado:** recibos 90 días, pronósticos emitidos 13 meses, un snapshot por tienda; la base local se borra al cerrar sesión; la cuenta borrada se elimina en 15 días hábiles como máximo (Ley 1581 de 2012; Ley 1266 de 2008).

### Operación (E10, E11, E12)
- **Observabilidad** (OpenTelemetry, Sentry): antigüedad del snapshot, retraso de replicación, tasa de `409`, entrega de avisos y MAE, con alertas (snapshot > 24 h, retraso > 5 min, push < 90 %).
- **Costo y backtesting:** telemetría por tienda (jobs, WhatsApp, PowerSync); cuota de WhatsApp incluida; backtesting a 7 y 14 días por `rulesVersion` (MAE, falsos positivos y negativos, calibración de p ≥ 0,8); toda `rulesVersion` nueva corre 14 días en sombra.
- **Despliegue:** flag `cashflow_forecast` por tienda y etapas (piloto interno, 50 tiendas, 10 %, 100 %); reversión apagando la flag, sin borrar datos; CI (typecheck, pruebas, OpenAPI, contrato de sync rules); EAS Build, Submit y Update.
- **Soporte:** vista y endpoints internos con auditoría de acceso: pronóstico emitido con su `rulesVersion`, por qué salió cada aviso y por qué canal, y recálculo forzado.

### Fuera de alcance
- Que un modelo de lenguaje o uno estadístico decida cifras, fechas o prioridades.
- Préstamos, scoring crediticio, pagos automáticos o negociación automática con proveedores.
- Mostrar a una tienda datos individuales de otra.
- Un módulo completo de pagos recurrentes (solo compromisos con fecha dentro del horizonte y su próxima repetición).
- PowerSync en la web, varias monedas por tienda y modelos de pronóstico por segmento (se reevalúan con miles de tiendas).

## Secuencia de construcción

Cinco fases (F0 Fundaciones · F1 Pronóstico y captura en la app · F2 Avisos y web · F3 Red, costo y calidad · F4 Lanzamiento), unas 35–40 semanas con 6 a 8 personas. El calendario, los equipos, lo que queda listo y el criterio de salida de cada fase están en `tasks.md` (sección «Fases»); el despliegue por bandera y la reversión por fase, en `design.md` (Migration Plan).

## Métricas de éxito

| Métrica | Objetivo del piloto de 50 tiendas (90 días) |
| :--- | :--- |
| % de pagos a proveedores que vencen sin pagar (meta del producto) | −30 % en tiendas activas |
| Usuarias que ven un faltante ≥ 7 días antes de la fecha | ≥ 80 % de los faltantes reales |
| Conversión de avisos: toca «cobrar» y registra un abono en 48 h | ≥ 25 % |
| Abonos registrados sin señal que se sincronizan sin intervención | ≥ 95 % (el resto, resuelto en la hoja de un toque) |
| `alignmentDelta` promedio por tienda | −40 % con el cuadre de un toque |
| Error del pronóstico a 7 y 14 días (MAE) | < 15 % de las salidas del horizonte |
| Préstamos informales reportados en la encuesta trimestral | tendencia a la baja |

Adopción y operación (propuesta):

| Métrica | Objetivo propuesto |
| :--- | :--- |
| Tiendas activadas con ritmo declarado (1.ª semana) / con un compromiso confirmado (30 días) | ≥ 80 % / ≥ 60 % |
| Sincronización: al volver la señal (hasta 10 movimientos) · primera bajada · retraso de replicación | p95 ≤ 30 s · < 10 s · < 5 min |
| `amount_exceeds_pending` sobre escrituras sin señal; `client_mutation_conflict` | < 5 %; 0 |
| Push entregados con recibo; tiendas que desactivan los avisos | ≥ 90 %; < 5 % |
| Lectura del pronóstico (p95) · recálculo en el teléfono · job nocturno de 5.000 tiendas | < 300 ms · < 50 ms · < 15 min |
| Costo por tienda y mes | infraestructura de centavos de dólar; WhatsApp dentro de la cuota (≥ 95 % de tiendas) |

## Riesgos y dependencias

| Riesgo | Impacto | Mitigación | Dueño |
| :--- | :--- | :--- | :--- |
| **PowerSync** (Cloud o propio) sin decidir; trae módulos nativos y exige **development builds de EAS** (no corre en Expo Go) y **Atlas** con MongoDB 6+ y post-images | Sin ellos no hay captura real sin señal ni replicación | Decidirlo y probarlo en F0 en staging, con dev client y `collMod`; la API y el `GET` no dependen de PowerSync; los endpoints idempotentes permiten cambiar de capa | Plataforma y móvil |
| **Plantilla de WhatsApp** sin aprobar por Meta, o endpoint de plantillas pendiente en mensajería | Sin escalada para quien no tiene app ni permiso | Enviarla en F0; respaldo con correo y aviso en la app; nunca fuera de plantilla | Producto y mensajería |
| **Probabilidades sin calibrar** | Faltante no avisado o aviso falso | Reglas versionadas; el titular sale de la banda prudente; backtesting y sombra desde el piloto interno | Datos y producto |
| **Fatiga de avisos** | La dueña los silencia | Solo cambio material, 7:00–20:00, uno operativo al día, preferencias | Producto |
| **Registro parcial** o ritmo declarado distinto del real | Certeza baja | Certeza explicada, chips, cuadre de un toque, banda prudente al 80 %, historial que reemplaza lo declarado | Producto |
| **Motor local y servidor divergen**; duplicados o conflictos app/web | Dos respuestas o plata mal contada | Un paquete y un `rulesVersion`; pruebas de contrato; idempotencia y `409` explícito | Backend y móvil |
| **Datos personales** (Ley 1581 de 2012) y **aislamiento entre tiendas** | Reclamos, sanciones o datos de una tienda visibles en otra | Autorización y finalidad claras, exclusión, auditoría; bucket por `store_id` del JWT con pruebas en CI; concepto jurídico antes de F3 | Legal y seguridad |
| **Señal de red** leída como información comercial o crediticia (Ley 1266 de 2008), o reidentificación | Obligaciones de habeas data; daño reputacional | K ≥ 3, redondeo, supresión, sin nombres ni listas; solo con concepto favorable | Legal y datos |

## Decisiones que requieren aprobación

1. **El pronóstico es gratis:** no consume créditos (la voz y los mensajes por IA sí, como hoy).
2. **PowerSync solo en la app:** un servicio nuevo en la ruta de datos del teléfono.
3. **WhatsApp con cuota incluida** de N mensajes por tienda al mes; por encima, créditos o se desactiva. Push y correo son gratis.
4. **Señal de otras tiendas con K ≥ 3,** consentimiento expreso y exclusión voluntaria (un solo interruptor para aportar y usar), solo como prior para clientes con poco historial.
5. **Horario de avisos 7:00–20:00** en la zona horaria de la tienda, máximo un aviso operativo al día.
6. **La semana de quincena es la semana (lunes a domingo) que contiene el 15 o el 30**, como la calcula el motor y exige el escenario «Otra tienda, otro horizonte» del spec; si Necta prefiere «la semana siguiente al pago», cambia una regla versionada (`quincenaWeek`) y sube `rulesVersion`.

## Preguntas abiertas

- ¿Qué plantillas de WhatsApp están aprobadas y cuántos mensajes (N) incluye el plan?
- ¿Dónde corre hoy el backend y qué latencia acepta plataforma?
- ¿PowerSync Cloud o propio, y quién lo opera? ¿Atlas corre MongoDB 6+ con post-images y la app ya usa development builds de EAS?
- ¿Hay que actualizar la política de tratamiento de datos y el Registro Nacional de Bases de Datos?
- ¿Quién más de la tienda puede ver el pronóstico?
