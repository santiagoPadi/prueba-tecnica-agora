# cashflow-operations · Operación, costo y observabilidad

## Purpose

`cashflow-operations` cubre lo que hace que el pronóstico sea confiable y sostenible en producción: el pronóstico oficial precalculado y su frescura, el historial para soporte, costo y créditos, rendimiento, telemetría, retención y borrado, el despliegue por bandera y la observabilidad.

## ADDED Requirements

### Requirement: Pronóstico oficial, snapshot y frescura
El servidor SHALL mantener un pronóstico oficial por tienda (uno solo, precalculado) calculado cada noche en su zona horaria y recalculado por evento (venta, abono, compromiso o cuadre), SHALL mostrar `computedAt` y `rulesVersion` en la respuesta y en la pantalla, y SHALL recalcular al vuelo desde las entradas compactas cuando el pronóstico guardado tenga más de 24 horas.

#### Scenario: Job nocturno por zona horaria
- **WHEN** una tienda entra a su ventana nocturna (zona horaria `America/Bogota` por defecto)
- **THEN** el job SHALL calcular su pronóstico entre las 00:00 y las 05:00 locales con la fecha local como fecha base, para que el aviso de las 7:00 use el del día, y dejar listos el snapshot y los datos que bajan al teléfono (pronóstico oficial, cuentas por cobrar con su perfil, saldos y ritmo)

#### Scenario: Recálculo por evento
- **WHEN** entra una venta, un abono, un compromiso o un cuadre de la tienda
- **THEN** el snapshot SHALL marcarse como desactualizado y recalcularse (eventos seguidos se agrupan), un `GET` que llegue con el snapshot desactualizado SHALL recalcular al vuelo para reflejar lo recién escrito y el pronóstico nuevo SHALL bajar al teléfono por sincronización con su `computedAt` y `rulesVersion`, visibles en la app

#### Scenario: Snapshot de más de 24 horas
- **WHEN** el snapshot de una tienda tiene más de 24 horas
- **THEN** `GET /v1/cashflow/forecast` SHALL recalcular al vuelo desde las entradas compactas y responder 200 con el `computedAt` actual y `warnings` con `snapshot_stale`, sin leer 90 días de movimientos; al volver la cola de eventos, SHALL recalcularse lo pendiente y reanudarse los avisos sin repetir los ya enviados

#### Scenario: Soporte fuerza el recálculo
- **WHEN** soporte fuerza el recálculo de una tienda desde la herramienta interna, indicando la tienda y el motivo
- **THEN** el servidor SHALL recalcular y reemplazar el snapshot, registrar la emisión con origen «soporte», el agente y el motivo, y devolver el nuevo `computedAt`; con el token de una dueña SHALL responder `403 store_forbidden`

### Requirement: Historial de pronósticos y soporte
El sistema SHALL guardar cada pronóstico emitido (fecha base, `rulesVersion`, cierre por banda, primer hueco y dependencias) durante 13 meses, SHALL exponerlo a la dueña en `GET /v1/cashflow/forecast/history` y SHALL permitir a soporte ver por qué salió un aviso.

#### Scenario: Qué se guarda y cuándo
- **WHEN** el job nocturno emite el pronóstico del día, o un recálculo por evento cambia el veredicto, el primer hueco o las dependencias
- **THEN** SHALL registrarse un pronóstico emitido con la tienda, `asOf`, `computedAt`, `rulesVersion`, `endOfHorizon` por banda, `firstGap`, `hinges` y su origen (nocturno, evento o soporte)

#### Scenario: Consultar el historial
- **WHEN** la dueña pide `GET /v1/cashflow/forecast/history?from=2026-05-01&to=2026-05-31`
- **THEN** SHALL recibir solo los de su tienda, del más reciente al más antiguo y paginados (`limit`, `cursor`); en el ejemplo (caso Carmen), el del 25 de mayo trae `endOfHorizon` 113.000 / 2.419.000 / 4.304.000 y la dependencia de Hotel Brisas; un rango anterior a 13 meses SHALL devolver una lista vacía

#### Scenario: Por qué salió un aviso
- **WHEN** soporte consulta un aviso desde la herramienta interna
- **THEN** SHALL ver el motivo (hueco a ≤ 5 días, hueco que cambió, dependencia incumplida o resumen del lunes), el pronóstico emitido que lo disparó y cada canal intentado con su estado y hora, y el sistema SHALL registrar quién lo consultó

### Requirement: Costo y créditos
El pronóstico SHALL ser gratis y SHALL NOT consumir créditos; la captura por voz y la personalización de mensajes por IA SHALL consumir créditos como hoy; el sistema SHALL medir el costo por tienda.

#### Scenario: Cálculo diario
- **WHEN** 5.000 tiendas reciben su pronóstico cada mañana
- **THEN** el motor SHALL costar del orden de 0,3 ms por tienda, el job nocturno minutos en total, y el GET SHALL responder desde el pronóstico precalculado sin recalcular 90 días de movimientos

#### Scenario: WhatsApp con cuota
- **WHEN** una tienda supera los N avisos de WhatsApp incluidos en el mes
- **THEN** los siguientes SHALL consumir créditos o desactivarse, y los avisos push y de correo SHALL seguir siendo gratis

### Requirement: Rendimiento
El sistema SHALL cumplir presupuestos medibles: lectura del pronóstico con p95 menor a 300 ms desde el snapshot, recálculo local en el teléfono en menos de 50 ms en un equipo de gama baja, primera sincronización de una tienda (~200 KB) en menos de 10 segundos, subida de lo registrado sin señal (hasta 10 movimientos) con p95 menor a 30 segundos desde que vuelve la señal, retraso de sincronización del servidor al teléfono menor a 5 minutos y job nocturno de 5.000 tiendas en menos de 15 minutos.

#### Scenario: Lectura del pronóstico
- **WHEN** una prueba de carga envía 100 solicitudes por segundo a `GET /v1/cashflow/forecast` durante 5 minutos con los snapshots al día
- **THEN** el p95 SHALL ser menor a 300 ms y los errores SHALL ser menos del 1 %

#### Scenario: Recálculo en el teléfono
- **WHEN** la dueña registra un abono en un Android de gama baja (2 GB de RAM) con 14 días y unas 20 cuentas por cobrar
- **THEN** armar la entrada desde la base local y correr el motor SHALL tardar menos de 50 ms (p95 de 100 corridas)

#### Scenario: Celular nuevo o reinstalación
- **WHEN** una tienda instala la app en un celular nuevo con una red 3G lenta simulada (400 kb/s, 400 ms de latencia)
- **THEN** los datos de su tienda (~200 KB) SHALL bajar en menos de 10 segundos y mientras tanto la pantalla SHALL decir «Cargando tus datos» sin cifras supuestas

#### Scenario: Subida al volver la señal
- **WHEN** la dueña registró hasta 10 movimientos sin señal y el teléfono recupera la red
- **THEN** la cola SHALL subirlos en orden y el servidor SHALL confirmarlos con p95 menor a 30 segundos desde que vuelve la señal, los registros SHALL dejar de marcarse como pendientes y un cambio hecho en el servidor SHALL verse en el teléfono en menos de 5 minutos

#### Scenario: Job nocturno
- **WHEN** el job nocturno calcula 5.000 tiendas con la concurrencia de producción
- **THEN** SHALL terminar en menos de 15 minutos, por lotes de zona horaria, sin que el p95 de lectura supere 300 ms

### Requirement: Telemetría de uso
La app y la web SHALL emitir los eventos `forecast_viewed`, `action_tapped`, `payment_registered_offline`, `reconcile_tapped`, `commitment_confirmed` y `notification_opened` con propiedades sin datos personales (ni nombres de clientes, montos, teléfonos o textos de mensajes), SHALL guardarlos en el dispositivo cuando no hay señal y SHALL enviarlos en lote al volver la señal.

#### Scenario: Esquema de cada evento
- **WHEN** se emite cualquiera de los seis eventos
- **THEN** SHALL llevar solo las propiedades de su esquema: `forecast_viewed` (`origin` = `home_card`, `push`, `menu`, `signed_link` o `web`; `verdictStatus`; `certaintyLevel`; `rulesVersion`; `offline`), `action_tapped` (`actionType`, `rank`, `channel`, `originNotificationId`), `payment_registered_offline` (`pendingCount`), `reconcile_tapped` (`mode`), `commitment_confirmed` (`source`, `recurrence`, `viaChip`) y `notification_opened` (`notificationId`, `channel`, `reason`), más `eventId`, `occurredAt`, `storeId` interno, `platform` y `appVersion`

#### Scenario: Sin datos personales
- **WHEN** la dueña toca «Escribir por WhatsApp» en la primera acción (ejemplo: caso Carmen, Hotel Brisas)
- **THEN** SHALL emitirse `action_tapped` con `actionType = cobrar`, `rank = 1` y `channel = whatsapp`, sin «Hotel Brisas», monto ni borrador, y el servicio SHALL descartar y registrar como error todo evento con una propiedad fuera del esquema

#### Scenario: Eventos sin señal
- **WHEN** la dueña registra un abono sin señal
- **THEN** `payment_registered_offline` SHALL guardarse en el teléfono (máximo 500 eventos; si se llena, descarta los más antiguos), enviarse en lote al volver la señal y descartarse en el servicio si su `eventId` ya llegó

### Requirement: Retención y borrado de datos
El sistema SHALL conservar los recibos de idempotencia 90 días, los pronósticos emitidos 13 meses y un solo snapshot por tienda; SHALL borrar la base local del teléfono al cerrar sesión; SHALL eliminar compromisos, snapshots y perfiles al borrar la cuenta; y SHALL guardar la señal agregada sin lista de comercios, de modo que no pueda revertirse, y dejar que la tienda se excluya.

#### Scenario: Plazos de conservación
- **WHEN** un recibo de idempotencia cumple 90 días, o un pronóstico emitido cumple 13 meses
- **THEN** SHALL borrarse automáticamente (se conservan las métricas agregadas por `rulesVersion`), un reenvío posterior con el mismo `clientMutationId` SHALL responder 200 `replayed` sin crear un segundo registro, y el recálculo de una tienda SHALL reemplazar su snapshot (uno solo por tienda) sin acumular versiones

#### Scenario: Cerrar sesión
- **WHEN** la dueña cierra sesión en la app
- **THEN** SHALL desconectarse la sincronización y borrarse los datos locales (pronóstico, cola y revisiones); con movimientos pendientes, la app SHALL avisar cuántos son, intentar sincronizarlos si hay señal y SHALL NOT borrarlos sin su confirmación

#### Scenario: Borrar la cuenta
- **WHEN** la dueña pide borrar su cuenta
- **THEN** en un máximo de 15 días hábiles (plazo de los reclamos de la Ley 1581 de 2012) SHALL eliminarse sus compromisos, snapshot, pronósticos emitidos, ritmo, preferencias de avisos, perfiles de pago y vínculos de identidad de sus clientes; la sincronización SHALL dejar de enviar sus datos a cualquier dispositivo y la telemetría SHALL perder su identificador de tienda
- **AND** sus facturas SHALL dejar de contar en el siguiente cálculo de perfiles de red, que no guardan lista de comercios y por eso SHALL NOT poder revertirse a datos de una tienda

### Requirement: Feature flag y piloto
La función SHALL activarse por tienda con una bandera (`cashflow_forecast`): sin ella la app SHALL NOT mostrar la tarjeta ni la pantalla y la API SHALL responder 404 a `/v1/cashflow/*`; el despliegue SHALL avanzar por etapas (piloto interno, 50 tiendas, 10 %, 100 %) con criterios de salida medibles, y apagar la bandera SHALL NOT borrar datos.

#### Scenario: Tienda sin la bandera
- **WHEN** una tienda no tiene la bandera `cashflow_forecast`
- **THEN** la app SHALL ocultar la tarjeta y la pantalla (un enlace `necta://` a la pantalla abre el inicio) y no sincronizar los datos de la función, y la API SHALL responder `404 not_found` a `/v1/cashflow/*`; sin señal la app SHALL usar la última bandera que conoció

#### Scenario: Etapas del despliegue
- **WHEN** se quiere pasar a la siguiente etapa (piloto interno → 50 tiendas → 10 % → 100 %)
- **THEN** la etapa actual SHALL llevar al menos una semana con cero abonos duplicados, sin alertas críticas abiertas de «Observabilidad y alertas» y con al menos el 95 % de los abonos hechos sin señal sincronizados sin revisión; el 10 % SHALL elegirse con un hash estable del `storeId`

#### Scenario: Apagar y volver a encender
- **WHEN** se apaga la bandera de una tienda con compromisos, abonos y un snapshot, y luego se enciende
- **THEN** apagada, la app SHALL ocultar la tarjeta y la pantalla, la API SHALL responder 404, los jobs y avisos SHALL detenerse y sus datos SHALL conservarse; encendida, la app SHALL mostrar la tarjeta, ofrecer declarar el ritmo si falta y volver a sincronizar sus datos, y el job nocturno SHALL incluir la tienda desde esa noche

### Requirement: Operación y medición
El sistema SHALL responder desde un pronóstico precalculado que se actualiza con cada evento, SHALL persistir cada pronóstico emitido, SHALL comparar a los 7 y 14 días con la realidad y SHALL medir el costo por tienda.

#### Scenario: Backtesting
- **WHEN** se cumple el horizonte de un pronóstico emitido
- **THEN** SHALL calcularse el error absoluto a 7 y 14 días por `rulesVersion`, la tasa de falsos positivos y negativos de los avisos de faltante y la calibración de los cobros con p ≥ 0,8

#### Scenario: Publicación
- **WHEN** se corrige un texto o una regla de la app
- **THEN** SHALL publicarse como actualización de la app sin pasar por las tiendas de aplicaciones, y un cambio de reglas SHALL subir `rulesVersion` y pasar las pruebas del caso

#### Scenario: Nueva versión de reglas en sombra
- **WHEN** se propone una nueva `rulesVersion`
- **THEN** SHALL calcularse en sombra junto a la vigente durante al menos 14 días, compararse al cumplirse el horizonte con las medidas del backtesting y promoverse solo si no empeora el error y pasa las pruebas de referencia del caso

#### Scenario: Costo por tienda
- **WHEN** cierra el mes
- **THEN** un panel SHALL mostrar por tienda el tiempo de cómputo, los avisos (WhatsApp incluidos y cobrados en créditos, push y correo), las operaciones de sincronización y los créditos de voz y de mensajes por IA, con el pronóstico en 0 créditos según «Costo y créditos»

### Requirement: Observabilidad y alertas
El sistema SHALL publicar métricas de edad del snapshot, retraso de sincronización, tasa de 409, entrega de avisos y error del backtesting (MAE), y SHALL alertar cuando un snapshot supere 24 horas, el retraso de sincronización supere 5 minutos o la entrega de push baje de 90 %.

#### Scenario: Alertas de frescura
- **WHEN** el snapshot de una tienda activa supera 24 horas, o el retraso entre un cambio en el servidor y su disponibilidad en el teléfono supera 5 minutos
- **THEN** SHALL dispararse la alerta correspondiente con las tiendas afectadas, aunque el `GET` ya recalcule al vuelo

#### Scenario: Tasa de 409
- **WHEN** se publican los rechazos de escritura por código
- **THEN** SHALL medirse `amount_exceeds_pending` sobre las escrituras hechas sin señal (aviso si pasa de 5 %, porque la meta es que el 95 % se sincronice sin intervención) y cualquier `client_mutation_conflict` SHALL abrir una revisión, porque no debería ocurrir

#### Scenario: Entrega de avisos
- **WHEN** en las últimas 24 horas se enviaron al menos 100 push y menos del 90 % tiene recibo de entrega
- **THEN** SHALL dispararse la alerta, y el panel SHALL separar push, WhatsApp y correo

#### Scenario: Error del pronóstico por versión
- **WHEN** corre el backtesting semanal
- **THEN** SHALL publicarse el MAE a 7 y 14 días por `rulesVersion`, y si el de la versión vigente supera el 15 % de las salidas del horizonte dos semanas seguidas SHALL abrirse una revisión de reglas
