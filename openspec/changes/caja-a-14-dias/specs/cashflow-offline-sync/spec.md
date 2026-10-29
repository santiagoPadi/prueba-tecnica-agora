# cashflow-offline-sync · Sin señal y sin duplicados

## Purpose

`cashflow-offline-sync` garantiza que la app funcione sin señal con el último pronóstico y acepte abonos y compromisos en el acto, y que al volver la señal todo llegue al servidor una sola vez, con errores explícitos y cada tienda viendo solo sus datos.

## ADDED Requirements

### Requirement: Sin señal en el teléfono
La app SHALL mostrar el último pronóstico con su hora sin conexión desde el almacén local del teléfono, SHALL validar cada abono con la misma regla que el servidor, SHALL recalcular en el teléfono con el mismo motor al registrar algo, SHALL encolar cada escritura en la cola local de subida con un id generado en el cliente y SHALL marcar lo pendiente hasta que el servidor lo confirme.

#### Scenario: Solo los datos de su tienda
- **WHEN** la app de una tienda sincroniza con la sesión de su dueña
- **THEN** la sincronización SHALL bajar solo los datos de esa tienda (pronóstico oficial con su hora, cuentas con su perfil, abonos de 90 días, pagos, compromisos, saldos y ritmo, ~200 KB) y SHALL NOT bajar ningún dato de otra tienda
- **AND** con solo esos datos la app SHALL armar la entrada del motor y obtener el mismo pronóstico que el servidor (salvo `computedAt`), y una prueba de contrato por tienda en CI SHALL fallar si la sincronización omite un dato que el motor necesita

#### Scenario: Qué ve sin señal
- **WHEN** la dueña abre la app sin cobertura
- **THEN** SHALL ver el último pronóstico con el banner «Sin señal · pronóstico de las HH:MM» (la hora del pronóstico oficial que bajó por sincronización; en el ejemplo, 7:02 a. m.) y SHALL poder registrar abonos y cuadrar la caja

#### Scenario: Qué se calcula en el teléfono
- **WHEN** registra sin señal un abono (ejemplo: 300.000 de Minimercado Sol)
- **THEN** el motor local SHALL recalcular en el acto (en el ejemplo, el sábado queda cubierto y el titular pasa a «El lunes 1 de junio te faltan $1.018.000 para el arriendo de la bodega.»), SHALL marcar «Pendiente de sincronizar · 1 movimiento» y SHALL encolar la mutación con un id generado en el teléfono como `clientMutationId`; los perfiles de pago y la señal de red SHALL calcularse solo en el servidor

#### Scenario: Abono mayor al pendiente, en el teléfono
- **WHEN** escribe un monto mayor a lo pendiente de la cuenta (ejemplo: 9.000.000 sobre 1.200.000)
- **THEN** la hoja SHALL NOT guardar el abono y SHALL explicar que supera lo pendiente, con el mismo mensaje que daría el servidor

#### Scenario: Al volver la señal
- **WHEN** vuelve la señal con un abono pendiente
- **THEN** la app SHALL enviarlo desde la cola con su `clientMutationId`, SHALL darlo por sincronizado y mostrar «Abono guardado» al recibir 201 o 200, SHALL quitar «Pendiente de sincronizar», y el titular SHALL NOT cambiar cuando baje el dato oficial del servidor (lo proyectado era lo mismo que confirmó)

#### Scenario: Reenvío tras cerrar la app
- **WHEN** la app se cierra después de que el servidor aplicó un abono y antes de recibir la confirmación
- **THEN** al reabrir, la cola SHALL reenviar la misma operación con el mismo id, el servidor SHALL responder 200 `replayed` y SHALL NOT existir un segundo abono

#### Scenario: Servicio de sincronización caído
- **WHEN** el servicio de sincronización no responde
- **THEN** la app SHALL seguir mostrando sus datos con la hora del último dato recibido, SHALL encolar las escrituras y SHALL NOT bloquear la captura

#### Scenario: El servidor rechaza con 409
- **WHEN** el servidor responde `409 amount_exceeds_pending` porque otro abono entró desde la web
- **THEN** la app SHALL retirar la escritura de la cola para no bloquearla, SHALL guardar el rechazo en su lista local de revisiones, el dato local SHALL volver al estado del servidor en la siguiente sincronización, SHALL mostrar «Un abono necesita revisión: ya había otro registrado desde la web» y SHALL ofrecer «es el mismo pago» o «fue un pago aparte» con el pendiente vigente

#### Scenario: Sin duplicados en la cola
- **WHEN** la misma mutación se intenta encolar dos veces con el mismo `clientMutationId`
- **THEN** la cola SHALL conservar una sola

### Requirement: Sin duplicados en el servidor
El servidor SHALL aceptar como `clientMutationId` el id que el cliente generó para el registro en abonos, cuadres, compromisos y cambios del ritmo, SHALL tratar un reenvío con ese id como la misma operación, SHALL recordar cada id con una huella de su contenido para detectar reenvíos distintos, SHALL validar el pendiente sin carreras y SHALL resolver conflictos sin duplicar ni descartar en silencio.

#### Scenario: Reintento idéntico y contenido distinto
- **WHEN** el servidor recibe dos veces el mismo `clientMutationId` con el mismo contenido, y luego el mismo id con otro monto
- **THEN** SHALL responder 201, luego 200 `replayed` con el mismo `paymentId`, y 409 `client_mutation_conflict` conservando el abono original

#### Scenario: App y web sobre la misma cuenta
- **WHEN** desde el celular se registra un abono de 700.000 y desde la web uno de 600.000 sobre 1.200.000 pendientes
- **THEN** el segundo SHALL recibir 409 `amount_exceeds_pending` con pendiente 500.000 y el servidor SHALL NOT contabilizar el exceso

#### Scenario: Qué cambio gana en una edición
- **WHEN** la fecha del mismo compromiso se edita desde la app sin señal y desde la web
- **THEN** SHALL ganar el cambio que llegue último al servidor, el otro lado SHALL ver «cambiado desde la web el …» con deshacer en 24 horas, y `clientTimestamp` SHALL usarse solo para ordenar mutaciones del mismo dispositivo

#### Scenario: Compromiso reenviado
- **WHEN** el mismo compromiso llega dos veces con el mismo `clientMutationId` porque la cola lo reenvió tras cerrarse la app
- **THEN** el servidor SHALL responder 201 y luego 200 `replayed` con el mismo identificador de compromiso, y SHALL existir un solo compromiso

#### Scenario: Versión anterior de la app
- **WHEN** una versión anterior de la app registra un abono sin `clientMutationId`
- **THEN** el servidor SHALL responder como hoy, sin recibo de idempotencia y sin `replayed`

### Requirement: Modelo de errores de la API
Toda respuesta de error de los endpoints de la función SHALL tener la forma `{ code, message, details }`: `code` estable (`validation_error`, `client_mutation_conflict`, `amount_exceeds_pending`, `store_forbidden`, `rate_limited` y `snapshot_stale`, más `not_found` e `internal_error`), `message` en español cotidiano que la app pueda mostrarle tal cual a la dueña, y `details` con lo que el cliente necesita para recuperarse.

#### Scenario: Estado HTTP de cada código
- **WHEN** se revisa la respuesta de cada código
- **THEN** `validation_error` SHALL ser 422 con `details.field`, `client_mutation_conflict` y `amount_exceeds_pending` 409, `store_forbidden` 403, `rate_limited` 429 con `Retry-After` (más de 60 solicitudes por minuto al `GET` del pronóstico o 20 al `POST`), `not_found` 404 e `internal_error` 500 con `details.requestId` (enlaza con la traza del servidor) y sin trazas ni detalles internos, y `snapshot_stale` SHALL viajar como advertencia en `warnings` de una respuesta 200

#### Scenario: Abono mayor al pendiente
- **WHEN** llega un abono de 600.000 sobre una cuenta que ya solo tiene 500.000 pendientes
- **THEN** la respuesta SHALL ser 409 con `code = amount_exceeds_pending`, `message` «Ese cobro solo tiene $500.000 pendientes.» y `details.pendingAmount = 500000`, que la app usa para ofrecer «es el mismo pago» o «fue un pago aparte»

#### Scenario: Qué se reintenta y qué no
- **WHEN** la cola de subida del teléfono recibe una respuesta de error
- **THEN** 429 y los 5xx SHALL conservar la escritura en la cola y reintentarse con espera creciente (respetando `Retry-After`), mientras que 403, 404, 409 y 422 SHALL retirarla de la cola y guardar el rechazo con su `message` en la lista local de revisiones, para no bloquear la cola

### Requirement: Acceso solo a su tienda
El servidor SHALL tomar el `storeId` únicamente del token de sesión, SHALL responder `403 store_forbidden` cuando el cuerpo, la ruta o los parámetros nombren otra tienda, SHALL sincronizar al teléfono solo los datos de la tienda de la sesión, y los enlaces web que acompañan a los avisos SHALL ser firmados, de alcance limitado y de vigencia corta.

#### Scenario: El `storeId` sale del token
- **WHEN** una dueña llama `POST /v1/cashflow/forecast` con el `storeId` de otra tienda en el cuerpo, o `POST /v2/receivables/:id/payments` sobre una cuenta de otra tienda
- **THEN** SHALL recibir `403 store_forbidden` sin datos de esa tienda y el intento SHALL registrarse; con su propio `storeId`, o sin él, SHALL calcular con los datos de su tienda

#### Scenario: Dos tiendas, dos conjuntos de datos
- **WHEN** las apps de dos tiendas sincronizan con sus propias sesiones
- **THEN** cada una SHALL recibir solo los datos de su tienda; una sesión inválida o sin tienda SHALL rechazarse sin bajar nada, y una vencida SHALL renovarse sola y reconectar sin perder la cola de escrituras

#### Scenario: Enlace firmado de un aviso
- **WHEN** un aviso de WhatsApp o de correo trae un enlace a la web
- **THEN** el enlace SHALL llevar un token firmado de solo lectura del pronóstico de una tienda, con vigencia de 24 horas; registrar un cobro, cuadrar, anotar un pago fijo o abrirlo vencido SHALL pedir iniciar sesión
