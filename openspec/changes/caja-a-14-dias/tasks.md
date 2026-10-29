# Tasks — Caja a 14 días

Plan de construcción de las capacidades `cashflow-*` («Caja a 14 días») de principio a fin, para todas las tiendas de Necta. Cada tarea: `N.N Descripción. — Depende de: ids · Talla · Rol — Verificar: criterio`. **Talla** (orientativa): S ≤ 1 día, M 2–3 días, L 1 semana, XL > 1 semana. **Rol:** backend, mobile, web, plataforma, QA, producto o legal. `[x]` hecha, `[ ]` pendiente. Los grupos 1–12 son las épicas E1–E12 de la propuesta y el diseño; son temáticos, no cronológicos: el orden de construcción lo dan las fases de abajo y la columna «Depende de».

## Estado de partida

- **Motor:** TypeScript puro, sin IO, con reglas versionadas (`RULES_VERSION = 2026.05.r2`) y pruebas con el caso de referencia, en el prototipo `app/`.
- **Pantalla y diagrama:** una vista de React Native/Expo con estado optimista y cola de sincronización simulada en memoria; arquitectura en `arquitectura/`.
- **Falta:** backend de pronóstico, PowerSync, web, avisos, señal de otras tiendas, costo y despliegue.
- Lo hecho lleva `[x]` (1.1–1.3, 6.1–6.3, 9.1).

## Fases

F0 Fundaciones · F1 Pronóstico y captura en la app · F2 Avisos y web · F3 Red, costo y calidad · F4 Lanzamiento. Las tareas hechas quedan fuera.

Duraciones y equipos son una estimación orientativa: se reestiman al cerrar F0, con los datos del spike de PowerSync. En total, 35–40 semanas (8 a 9 meses) con 6 a 8 personas. El esfuerzo puro de las tareas suma unas 60 persona-semanas (tabla «Resumen»); el calendario es mayor porque incluye revisión, integración, esperas externas (plantilla de Meta, concepto legal, tiendas de apps) y los 90 días de observación del piloto de 50 tiendas.

| Fase | Duración | Equipo sugerido | Épicas (apoyo) |
| :--- | :--- | :--- | :--- |
| F0 Fundaciones | 3–4 semanas | Líder técnico, 2 backend, 1 móvil, 1 plataforma; producto y legal parcial | E1, E2, E4, E5, E12 (E6, E8, E11) |
| F1 Pronóstico y captura en la app | 8–10 semanas | 2 backend, 2 móvil, 1 plataforma, 1 QA; producto y diseño | E2, E3, E4, E5, E6 (E1, E11, E12) |
| F2 Avisos y web | 5–6 semanas | 1–2 backend, 1 móvil, 1 web, 1 QA; mensajería; producto y diseño | E7, E8 (E2, E3, E4, E6, E11) |
| F3 Red, costo y calidad | 5–6 semanas (2 solapadas con F2) | 1–2 backend, 1 analista, 1 plataforma, 1 QA/seguridad; legal | E9, E10, E11 (E1, E5, E12) |
| F4 Lanzamiento | 13 semanas de piloto + 3 de despliegue | Núcleo reducido, soporte, analítica, producto | E12 (E6, E8, E10, E11) |

### F0 · Fundaciones

- **Objetivo:** lo que no se improvisa o más arriesga (motor como paquete, `GET/POST`, abonos idempotentes, PowerSync con un spike, CI y despliegue) y abrir los trámites lentos: plantilla de Meta (8.3) y concepto legal (9.4).
- **Queda listo:** motor publicado como `@necta/cashflow-engine`; `GET/POST /v1/cashflow/forecast`; `clientMutationId`, `MutationReceipt` y `409` en los abonos; Atlas con post-images y PowerSync en staging; CI con pruebas de contrato, development build de EAS y flag por tienda; plantilla de WhatsApp enviada a Meta y concepto jurídico solicitado.
- **Criterio de salida:** el token de una tienda de staging baja solo su bucket; `GET` y motor local coinciden (salvo `computedAt`) para la fixture y otra tienda; un abono enviado dos veces da `201` y `200 replayed`; un development build abre el último pronóstico en modo avión; CI verde; plantilla enviada a Meta.
- **Incluye:** 1.4–1.6, 2.1, 2.2, 4.1, 4.2, 5.1–5.3, 11.1, 12.1–12.4.

### F1 · Pronóstico y captura en la app

- **Objetivo:** que la dueña vea su pronóstico oficial con y sin señal y registre abonos, cuadre y pagos fijos sin duplicar nada.
- **Queda listo:** snapshots, perfiles (con carga inicial del historial) y colecciones derivadas; ritmo, compromisos (chips, voz, manual), recurrencias y `reconcile-quick`; conflictos con hoja de un toque; `uploadData` y consultas reactivas; pantalla y tarjeta sobre SQLite local, deep links, telemetría y accesibilidad; piloto interno (tiendas del equipo y aliadas) tras flag.
- **Criterio de salida:** en celulares del piloto interno, sin señal ve el último pronóstico con su hora y registra un abono y un compromiso con el titular recalculado; al volver la señal todo sincroniza sin duplicados, también si cierra la app a mitad de subida; un `409` desde la web se resuelve con un toque; app y servidor coinciden en `rulesVersion`.
- **Incluye:** 2.3–2.5, 3.1–3.6, 4.4, 5.4–5.8, 6.4–6.8, 6.10, 6.11, 12.5.

### F2 · Avisos y web

- **Objetivo:** que la respuesta llegue sin abrir la app y esté también en la web.
- **Queda listo:** detector de cambio material, chequeo de dependencias a las 18:00, push Expo con ticket y recibo, WhatsApp con plantilla, correo semanal, dedupe y horario; preferencias y consentimiento; panel web con simulador, cuadre, compromisos y abonos; ediciones concurrentes app/web.
- **Criterio de salida:** en el piloto interno, el resumen del lunes (7:00) y el aviso de las 18:00 llegan por push y, sin token o con `DeviceNotRegistered`, por WhatsApp o correo; web y app muestran el mismo pronóstico y un reintento web da `200 replayed`; el pico de las 7:00 se sostiene en k6.
- **Incluye:** 4.3, 6.9, 7.1–7.4, 8.1–8.5, 11.2.

### F3 · Red, costo y calidad

- **Objetivo:** lo que solo se prueba con volumen y datos: señal de otras tiendas, costo, backtesting, soporte, seguridad y cumplimiento.
- **Queda listo:** resolución de entidad y `CounterpartyNetworkProfile` con K ≥ 3, consentimiento, exclusión y auditoría; costo por tienda, política de créditos y cuota de WhatsApp; backtesting por `rulesVersion`, con reglas nuevas en sombra; observabilidad de la sincronización; vista de diagnóstico para soporte; revisión de seguridad.
- **Criterio de salida:** con K < 3 no existe documento y una tienda excluida deja de aportar y usar la señal; concepto jurídico favorable por escrito; paneles de costo y backtesting con datos del piloto; alertas probadas en staging; 0 hallazgos críticos de seguridad y accesibilidad.
- **Incluye:** 9.2–9.4, 10.1–10.4, 10.6, 11.3–11.5.

### F4 · Lanzamiento

- **Objetivo:** llevar la función a todas las tiendas por etapas, con soporte y reversión listos.
- **Queda listo:** versión nativa en las tiendas (EAS Submit) y correcciones de JS con EAS Update; etapas con flag (50 tiendas durante 90 días, 10 %, 100 %); runbooks, guardia y capacitación de soporte; plan de reversión probado; calibración final de avisos y costo; auditoría final de seguridad y carga.
- **Criterio de salida:** cada etapa, una semana sin abonos duplicados ni alertas críticas y con ≥ 95 % de los abonos sin señal sincronizados sin revisión; las 50 tiendas, además, MAE < 15 %; revisiones a 30 y 90 días hechas.
- **Incluye:** 10.5, 12.6–12.9.

**Cadena más larga de dependencias:** 2.1 → 2.3 → 5.4 → 6.4 → 6.8 → 8.4 → 10.4 → 10.5 → 12.7 → 12.8 → 12.9.

## 1. Motor compartido (E1)

- [x] 1.1 Tipos de entrada y salida (`ForecastInput`, `ForecastResponse`), reglas versionadas y perfiles de cobro por banda, en TypeScript puro sin IO. — Depende de: — · Talla: L · Rol: backend — Verificar: `npm run typecheck`; `app/__tests__/engine.receivables.test.ts`.
- [x] 1.2 Ritmo por día de la semana y simulación en tres bandas: primer hueco, hueco máximo, muro de 4 días y dependencias (`hinges`). — Depende de: 1.1 · Talla: L · Rol: backend — Verificar: `app/__tests__/engine.operating.test.ts`; bloques «la pregunta del viernes» y «el hueco real» de `app/__tests__/engine.carmen.test.ts`.
- [x] 1.3 Certeza con `ifConfirmed`, ranking de acciones con `pedir-plazo` preventivo, compromisos sin confirmar, cuadre y abonos sobre la entrada del motor; referencia numérica del caso de Carmen y prueba de lenguaje sin jerga. — Depende de: 1.2 · Talla: L · Rol: backend — Verificar: `app/__tests__/engine.carmen.test.ts` y `app/__tests__/engine.commitments-and-balance.test.ts`: viernes +938.000 (sin Hotel Brisas, −1.162.000), sábado −136.000, lunes −1.318.000, muro 6.900.000, favorable 4.304.000, sin espejismo de 7.004.000; cuadrar deja el lunes en −1.058.000.
- [ ] 1.4 Publicar el motor como paquete `@necta/cashflow-engine` del monorepo, consumido por backend, app y web. — Depende de: 1.3 · Talla: M · Rol: plataforma — Verificar: una sola versión instalada en los tres (`npm ls`); `rulesVersion` idéntico en servidor y pie de la pantalla.
- [ ] 1.5 Pruebas de generalidad (otra tienda de 21 días que cierra los lunes, año bisiesto, horizonte o fecha inválidos, 1.000 entradas aleatorias con invariantes) y bench en Node y Android de gama baja. — Depende de: 1.4 · Talla: M · Rol: QA — Verificar: los escenarios de «Cualquier tienda, cualquier fecha» pasan sin tocar el motor; ~0,3 ms por tienda en Node y < 50 ms (p95 de 100 corridas) en un Android de 2 GB.
- [ ] 1.6 Documentación del paquete y política de `rulesVersion`: todo cambio que mueva una cifra sube la versión; una app con reglas anteriores muestra la suya hasta actualizarse con EAS Update. — Depende de: 1.4 · Talla: M · Rol: backend — Verificar: alguien ajeno al motor calcula otra tienda solo con el README; CI falla si `rules.ts` cambia sin subir `RULES_VERSION`.

## 2. Backend de pronóstico y datos (E2)

- [ ] 2.1 Colecciones `CashflowForecastSnapshot` (uno por tienda) y `ForecastIssued` (con `trigger`: `nocturno`, `evento` o `soporte`), con índices y migraciones reversibles, también de las colecciones que consulta el job. — Depende de: — · Talla: M · Rol: backend — Verificar: se aplican y revierten en staging; `explain` usa índice; snapshot de ~30 KB.
- [ ] 2.2 `POST` y `GET /v1/cashflow/forecast?days=N` (1–60, 14 por defecto, desde el snapshot de la tienda del token), `GET …/history` (`from`, `to`, `limit`, `cursor`), parámetro `include=input` para soporte, errores `{ code, message, details }`, límites de uso y contrato OpenAPI con pruebas de contrato. — Depende de: 1.4, 2.1 · Talla: XL · Rol: backend — Verificar: con la fixture devuelve las cifras de 1.3, y con otra tienda su resultado; horizonte 0 o 61 → 422; tienda ajena → `403 store_forbidden`; CI falla si contrato y `ForecastResponse` divergen.
- [ ] 2.3 `CounterpartyProfile` (6 meses, desde la fecha de cada pago) con su job, y colecciones derivadas que bajan al dispositivo, con `store_id`: `cashflow_receivables` (con perfil), `cashflow_pockets`, `cashflow_rhythm` y las vistas de pronóstico, pagos y abonos de 90 días. — Depende de: 2.1 · Talla: XL · Rol: backend — Verificar: reproduce los perfiles de la fixture (Hotel Brisas, 6 de 6 a tiempo) y con las filas se arma un `ForecastInput` completo.
- [ ] 2.4 Job nocturno por zona horaria (BullMQ, 00:00–05:00 locales) que recalcula snapshots con la fecha local de cada tienda y escribe las derivadas, y consumidor de eventos (venta, abono, compromiso, cuadre → `CashflowOutbox` (TTL 7 días) → `isDirty` → recálculo). — Depende de: 2.2, 2.3 · Talla: L · Rol: backend — Verificar: tras un abono el snapshot se actualiza en segundos; un snapshot de más de 24 h se recalcula al vuelo con `snapshot_stale`; con Redis caído el GET sirve el último snapshot.
- [ ] 2.5 Carga inicial de todas las tiendas (por lotes, idempotente, reanudable) y `POST /internal/v1/cashflow/forecast/recompute` para forzar el recálculo, con motivo y agente registrados. — Depende de: 2.4 · Talla: L · Rol: backend — Verificar: en staging el 100 % queda con snapshot sin degradar el p95 de la API; con el token de una dueña → `403 store_forbidden`.

## 3. Captura: compromisos, ritmo y cuadre (E3)

- [ ] 3.1 `CashCommitment` (índice `{storeId:1, dueDate:1, status:1}`, `seriesId`, `status`), `POST /v1/cashflow/commitments`, `GET` (lista de la tienda) y `PATCH …/:id` para editar. — Depende de: 2.1, 4.1 · Talla: M · Rol: backend — Verificar: un compromiso `sugerido-por-patron` nace sin confirmar; el GET solo lista su tienda.
- [ ] 3.2 `PATCH …/:id/confirm`, `DELETE …/:id` (con `scope=occurrence` para una sola ocurrencia), recurrencias (quincenal 15/30 y mensual; al confirmar se genera la próxima ocurrencia) y detector de recurrencias en el historial (±3 días, importe ±20 %, ≥ 2 ocurrencias) que sugiere compromisos sin confirmar. — Depende de: 3.1 · Talla: L · Rol: backend — Verificar: la cuota mensual del día 10, fuera del horizonte, aparece cuando el horizonte la alcanza; un historial sintético sugiere «arriendo ~1.300.000 cada día 1».
- [ ] 3.3 `cashCommitmentV1` en `POST /v1/voice/extract-schema`, con confirmación obligatoria y créditos como hoy. — Depende de: 3.1 · Talla: M · Rol: backend — Verificar: «pago un millón cuatrocientos a los ayudantes el 30 y el 15» devuelve importe, fechas y periodicidad; la IA no decide ninguna cifra.
- [ ] 3.4 Colecciones `CashflowRhythm` y `CashflowSettings`, `GET/PATCH /v1/cashflow/rhythm` (422 ante ventas negativas o subida de quincena > 100 %) y derivación desde el historial (`source = historial`) con 8 semanas de ventas y ≥ 70 % de movimientos registrados. — Depende de: 2.3, 4.1 · Talla: L · Rol: backend — Verificar: el ritmo derivado reproduce el declarado en un historial sintético; sin ritmo, el GET del pronóstico → 422 `operatingRhythm`.
- [ ] 3.5 `POST /v2/banks/:id/reconcile-quick` con tres modos (`CONFIRM_STORED_BALANCE`, `CONFIRM_PROJECTED_BALANCE`, `SET_COUNTED_BALANCE`), ajuste `conteo-de-caja` que no reescribe movimientos, e idempotencia. — Depende de: 4.1 · Talla: L · Rol: backend — Verificar: `CONFIRM_STORED_BALANCE` deja `alignmentDelta` en 0; un reintento devuelve el resultado original (la app ya aplica el cuadre local: `app/__tests__/applyPayment.test.ts`).
- [ ] 3.6 Chips de un toque cuando faltan ≤ 7 días para quincena o inicio de mes, y onboarding del ritmo («Cuéntanos cuánto vendes en un día normal»), que escriben por la cola de PowerSync. — Depende de: 3.1, 3.4, 6.4 · Talla: L · Rol: mobile — Verificar: un toque crea el compromiso y lo descuenta al instante, también sin señal; una tienda nueva declara su ritmo y ve su primer pronóstico.

## 4. Escrituras idempotentes y conflictos (E4)

- [ ] 4.1 `MutationReceipt` (hash del contenido, TTL de 90 días, índice único `{storeId:1, clientMutationId:1}`) reutilizable por los endpoints de escritura. — Depende de: — · Talla: M · Rol: backend — Verificar: dos inserciones concurrentes del mismo id dejan una; tras expirar el recibo un reenvío no duplica porque la fila conserva el id.
- [ ] 4.2 `POST /v2/receivables/:id/payments` con `clientMutationId` y `clientTimestamp`: `201`, `200 replayed` (mismo `paymentId`), `409 client_mutation_conflict` y validación atómica del pendiente (`findOneAndUpdate`) con `409 amount_exceeds_pending` y el pendiente vigente. — Depende de: 4.1 · Talla: L · Rol: backend — Verificar: 201, luego 200, luego 409 con otro monto y el original intacto; 600.000 sobre 500.000 pendientes → 409 con 500.000; sin `clientMutationId` responde como hoy (pruebas actuales sin cambios).
- [ ] 4.3 Regla «último en llegar» para ediciones: gana la que llega al servidor (`updatedAt` del servidor; `clientTimestamp` solo ordena el mismo dispositivo); se guardan valor anterior y origen 24 h para «cambiado desde la web el …» y el deshacer. — Depende de: 3.2, 4.1 · Talla: M · Rol: backend — Verificar: editar el mismo compromiso desde la app sin señal y desde la web: gana la última en llegar; pasadas 24 h el deshacer se rechaza.
- [ ] 4.4 Pruebas de conformidad y concurrencia: abonos, cuadre, compromisos y ritmo responden 201 y luego 200 `replayed`; app y web sobre el mismo pendiente. — Depende de: 3.2, 3.4, 3.5, 4.2 · Talla: M · Rol: QA — Verificar: 700.000 y 600.000 sobre 1.200.000 en paralelo, 1.000 veces: siempre un 201 y un 409, y lo abonado nunca supera 1.200.000.

## 5. Sincronización con PowerSync (E5)

- [ ] 5.1 MongoDB listo (replica set, 6+, post-images) y PowerSync Service (Cloud o propio) en staging y producción, con la decisión documentada y su observabilidad: retraso de replicación, tamaño de buckets, conexiones y fallos de `uploadData`. — Depende de: — · Talla: XL · Rol: plataforma — Verificar: un cambio en `receivable_payments` llega con su post-image; reiniciar el servicio no pierde datos; alerta cuando el retraso supera 5 minutos.
- [ ] 5.2 Autenticación: JWKS de Necta con rotación, claim `store_id`, expiración corta y `fetchCredentials`. — Depende de: 5.1 · Talla: M · Rol: backend — Verificar: token vencido, sin `store_id` o de clave no publicada rechazado; renovado, la app reconecta sin perder la cola.
- [ ] 5.3 Spike de PowerSync en staging: sync rules mínimas (`cashflow_forecasts` por `store_id`), JWT de staging y un development build que abre el último pronóstico sin señal; mide primera bajada y tamaño del bucket para reestimar F1. — Depende de: 2.2, 5.1, 5.2, 12.3 · Talla: L · Rol: mobile — Verificar: el token de una tienda baja solo su bucket; ~200 KB bajan en < 10 s con 3G simulada.
- [ ] 5.4 Sync rules versionadas: bucket `por_tienda` por `store_id` del JWT sobre las tablas de design §4 (la ventana de 90 días de abonos la mantiene el job de limpieza sobre la colección derivada, porque las sync rules no evalúan fechas relativas; design §5.5). — Depende de: 2.3, 5.1 · Talla: M · Rol: plataforma — Verificar: con el token de una tienda baja solo su bucket (~200 KB).
- [ ] 5.5 Pruebas de las sync rules en CI: lo que bajan arma un `ForecastInput` completo con el resultado del servidor, y el token de otra tienda no baja ni una fila. — Depende de: 1.4, 5.2, 5.4 · Talla: M · Rol: QA — Verificar: falla si se quita una columna que el motor necesita; con la fixture, las cifras de 1.3.
- [ ] 5.6 `uploadData`: mapa operación → endpoint (design §5.5); 429 y 5xx se reintentan con espera creciente sin completar (respetando `Retry-After`); 403, 404, 409 y 422 completan y guardan el rechazo con su `message` en `pending_reviews` (tabla local); colas de solo subida `bank_reconciliations` y `notification_events`, y tabla local `telemetry_events` (máximo 500). — Depende de: 4.4, 5.4 · Talla: L · Rol: mobile — Verificar: con MSW: 201, 200 replayed, 409, 422 y 500; el 500 reintenta sin completar; el 409 completa y la cola sigue.
- [ ] 5.7 Ciclo de vida de la base local: primer arranque (~200 KB), migración de esquema, cierre de sesión (avisa cuántos movimientos quedan sin enviar y no los borra sin confirmar) y cambio de tienda. — Depende de: 5.6 · Talla: L · Rol: mobile — Verificar: actualizar con cola pendiente no pierde movimientos; cerrar sesión borra la base local; cambiar de tienda no muestra datos de la anterior.
- [ ] 5.8 Pruebas de caos: servicio caído, stream atrasado (`computedAt` visible), token vencido, cierre a mitad de subida y, en dispositivos reales, modo avión, 2G/3G emulado y wifi ↔ datos. — Depende de: 5.1, 5.6 · Talla: M · Rol: QA — Verificar: ningún movimiento se pierde ni se duplica y el banner muestra la hora del último dato.

## 6. App (E6)

- [x] 6.1 Tokens de marca (Manrope, paleta, radios, toques ≥ 48 dp) y contraste ≥ 7:1 sobre las parejas reales. — Depende de: — · Talla: M · Rol: mobile — Verificar: `app/__tests__/contrast.test.ts`.
- [x] 6.2 Pantalla única: tarjeta héroe, certeza desplegable con «Cuadrar mi caja en un toque», tira de plata segura día a día y acciones (tres primero) con «Escribir por WhatsApp» (`wa.me`) y «Registrar cobro» con hoja de abono. — Depende de: 1.3, 6.1 · Talla: L · Rol: mobile — Verificar: `app/__tests__/screen.test.tsx`; revisada en el simulador iOS (iPhone 17).
- [x] 6.3 Estado optimista (confirmado + outbox ⇒ proyección, misma validación que el servidor), sincronizador de demostración y banners de estado. — Depende de: 1.3 · Talla: L · Rol: mobile — Verificar: `app/__tests__/reducer.test.ts`, `app/__tests__/applyPayment.test.ts`; `app/__tests__/screen.test.tsx`: al volver la señal el titular no cambia.
- [ ] 6.4 Montar la pantalla sobre PowerSync (`@powersync/react-native` + `@powersync/op-sqlite`, development build de EAS): esquema de design §4, consultas reactivas (`@powersync/react`) en lugar del reducer, hora del banner desde `cashflow_forecasts.computedAt`. — Depende de: 1.4, 5.2, 5.4, 12.3 · Talla: XL · Rol: mobile — Verificar: la pantalla pinta el pronóstico oficial desde la tabla local y lo sigue pintando en modo avión.
- [ ] 6.5 Escrituras por la cola: el abono va a `receivable_payments` con UUID del cliente y ajusta el pendiente local en la misma transacción; red desde `db.currentStatus`; se retiran la outbox y el control de demostración. — Depende de: 5.6, 6.4 · Talla: L · Rol: mobile — Verificar: e2e con MSW (201, 200 replayed, 409); cerrar la app a mitad de subida y reabrir reenvía el mismo id sin duplicar; 10 movimientos sin señal sincronizan en p95 ≤ 30 s al volver.
- [ ] 6.6 Hoja de un toque para `409 amount_exceeds_pending` desde `pending_reviews`: «es el mismo pago» o «fue un pago aparte». — Depende de: 6.5 · Talla: M · Rol: mobile — Verificar: prueba de pantalla con el 409 simulado; la fila local vuelve al estado del servidor.
- [ ] 6.7 Compromisos en la app, junto a los chips de 3.6: voz (`cashCommitmentV1`; sin señal queda el formulario), formulario manual con confirmación obligatoria, y confirmar, editar, borrar y revisar los sugeridos. — Depende de: 3.3, 3.6 · Talla: M · Rol: mobile — Verificar: un compromiso dictado entra solo tras confirmar; sin señal se descuenta al instante y sincroniza al volver.
- [ ] 6.8 Integración en la app real: tarjeta resumen en inicio, ruta desde «Mi diario», deep links `necta://` (registrar venta, compromisos), horizonte configurable, teléfonos reales en `wa.me`, telemetría sin datos personales (seis eventos; sin señal se guardan y suben en lote) y bandera `cashflow_forecast` (apagada oculta tarjeta y pantalla y no sincroniza `cashflow_*`). — Depende de: 6.4, 12.4 · Talla: L · Rol: mobile — Verificar: navegación y deep links probados; con 21 días la tira tiene 21 barras; apagar la bandera no pierde la cola; eventos sin montos ni nombres en staging.
- [ ] 6.9 Permiso y token de notificaciones, apertura de la pantalla desde el push (app cerrada y en segundo plano), pantallas de preferencias de avisos y consentimientos (WhatsApp y señal de otras tiendas) y aviso «cambiado desde la web el …» con deshacer 24 h. — Depende de: 4.3, 6.8, 8.2, 8.5 · Talla: M · Rol: mobile — Verificar: flujos Maestro desde un push de prueba en iOS y Android; apagar WhatsApp detiene los envíos; una edición ajena muestra el aviso y se deshace.
- [ ] 6.10 Accesibilidad (VoiceOver y TalkBack: titular primero, barras con día y si alcanza; fuente al 200 %) y estados vacíos y de error (tienda nueva, sin cuentas por cobrar, primer arranque sin señal, pronóstico de más de 24 h). — Depende de: 6.4 · Talla: L · Rol: mobile — Verificar: recorrido con ambos lectores sin elementos sin etiqueta; ningún texto se corta; prueba de pantalla por estado.
- [ ] 6.11 Pruebas Jest/Testing Library de lo nuevo, flujos Maestro (sin señal → abono → señal → sincronizado; 409; cuadre; chip) y QA en Android de 2–3 GB de RAM, iOS antiguo y con sol. — Depende de: 6.6, 6.7 · Talla: L · Rol: QA — Verificar: Maestro en CI contra staging, 3 corridas seguidas en verde; pronóstico visible en menos de 2 s en frío; lista de legibilidad a pleno sol firmada.

## 7. Web (E7)

- [ ] 7.1 Panel `/caja` (React/Vite, cookies, `x-client-platform: web`) desde `GET /v1/cashflow/forecast`: tres bandas, muro, dependencias, estados de carga y error (con la API caída conserva el último pronóstico en memoria) y simulador «¿qué pasa si…?» con el motor en el navegador. — Depende de: 1.4, 2.2 · Talla: XL · Rol: web — Verificar: pruebas de componentes con la fixture («Sale en 4 días $6.900.000 · vie 29 may – lun 1 jun», dependencia de Hotel Brisas); el simulador da los mismos números que la app (cuadrar deja el lunes en −1.058.000).
- [ ] 7.2 Cuadre y compromisos (`/caja/compromisos`) con `clientMutationId` generado en el navegador (el mismo en cada reintento), `409` con el pendiente vigente y aviso «cambiado desde la app el …» con deshacer 24 h. — Depende de: 3.5, 4.3, 4.4, 7.1 · Talla: L · Rol: web — Verificar: doble clic en «Guardar» y reintento por red dejan un solo abono (201 y 200 `replayed`).
- [ ] 7.3 Vista del enlace firmado (solo lectura, 24 h) al que llegan WhatsApp y correo, y pantallas de preferencias de avisos y consentimientos. — Depende de: 7.1, 8.5 · Talla: M · Rol: web — Verificar: enlace vencido o de otra tienda → inicio de sesión; sin la bandera, `/caja` → 404; el válido muestra solo titular y acciones.
- [ ] 7.4 Playwright de punta a punta (panel, simular, cuadrar, reintento, 409) y accesibilidad web (teclado, contraste ≥ 7:1, lector de pantalla, pantallas pequeñas). — Depende de: 7.2, 7.3 · Talla: M · Rol: QA — Verificar: verde en CI; axe sin violaciones críticas.

## 8. Avisos (E8)

- [ ] 8.1 Orquestador sobre `CashflowNotification` (máquina de estados de design §8.4, `dedupeKey` único por tienda, TTL 180 días): cambio material (hueco nuevo a ≤ 5 días; hueco que cambia > 20 % o > $200.000; resumen del lunes 7:00), dependencia incumplida a las 18:00 del día contado, dedupe, horario 7:00–20:00 por zona horaria y máximo 1 aviso operativo al día. — Depende de: 2.1, 2.4 · Talla: XL · Rol: backend — Verificar: dos recálculos sin cambio ⇒ 0 avisos; Hotel Brisas sin pagar el jueves 28 a las 18:00 ⇒ 1 aviso crítico, aunque ya haya salido un operativo; el de las 23:00 sale a las 7:00 (reloj simulado).
- [ ] 8.2 Push Expo: ticket, recibo a los 15 min, baja del token ante `DeviceNotRegistered` y reintento por ticket. — Depende de: 8.1 · Talla: M · Rol: backend — Verificar: con mocks de Expo: ticket con error → reintento; recibo `DeviceNotRegistered` → token dado de baja.
- [ ] 8.3 Plantilla WhatsApp `caja_alerta_v1` (nombre de pila, titular y enlace firmado) aprobada por Meta y `POST {MESSAGING_SERVICE_URL}/v1/whatsapp/send/template` en el servicio de mensajería; el OTP no cambia. — Depende de: — · Talla: L · Rol: backend — Verificar: plantilla «aprobada»; envío de prueba a un número con consentimiento; fuera de plantilla el servicio rechaza.
- [ ] 8.4 Correo semanal; escalada a WhatsApp o correo si no hay token, se dio de baja, hay notificaciones bloqueadas o un crítico no se abre en 4 h (no con «solo en el celular»); métricas de entrega por canal y conversión «toca cobrar y registra un abono en 48 h»; `POST /v1/cashflow/notifications/:id/events` (`opened`, `action_taken`) y webhook `POST /internal/v1/messaging/whatsapp/inbound` («No más avisos» revoca el consentimiento en minutos). — Depende de: 6.8, 8.2, 8.3, 8.5 · Talla: L · Rol: backend — Verificar: cada condición dispara un solo envío por el canal siguiente; sin opt-in vigente no sale WhatsApp; un rebote marca el correo inválido.
- [ ] 8.5 Preferencias y consentimientos (`NotificationPreference`; `GET/PATCH /v1/cashflow/notification-preferences`: canales, ventana, opt-in de WhatsApp con teléfono verificado; `PUT /v1/cashflow/network-consent` con fecha y versión del texto) y enlaces web firmados (`WebLink` con hash del token, 24 h, solo lectura, revocables; `POST /v1/cashflow/links/exchange` entrega una cookie de solo lectura de 30 min). — Depende de: 2.1 · Talla: L · Rol: backend — Verificar: una ventana fuera de 7:00–20:00 → 422; un PATCH de baja se respeta en el siguiente aviso; enlace manipulado, vencido o de otra tienda → `404 not_found` y la web pide iniciar sesión.

## 9. Datos de otras tiendas (E9)

- [x] 9.1 Prior de la red en el motor: peso `n/(n+3)` solo en «historial corto», con entidad resuelta (≥ 0,8) y ≥ 3 comercios; texto neutro. — Depende de: 1.1 · Talla: M · Rol: backend — Verificar: `app/__tests__/engine.receivables.test.ts`.
- [ ] 9.2 `EntityLink` y resolución de entidad: NIT > teléfono verificado > nombre normalizado + ciudad (similitud ≥ 0,92), con `confidence`. — Depende de: 2.1 · Talla: L · Rol: backend — Verificar: «Hotel Brisas» y «Hotel Las Brisas S.A.S.» sin NIT quedan ambiguas y la señal se ignora; con el mismo NIT enlazan.
- [ ] 9.3 Job `CounterpartyNetworkProfile` (K ≥ 3 comercios, ≥ 10 facturas, atraso redondeado a 2 días, supresión si un comercio aporta > 50 %, republicación por umbral) que baja al dispositivo como agregado y texto neutro, con auditoría de consultas (límite de 1.000 por tienda y día), autorización y exclusión efectiva en 24 h. — Depende de: 2.3, 8.5, 9.2 · Talla: XL · Rol: backend — Verificar: K < 3 ⇒ sin documento; un comercio con 60 % ⇒ suprimido; ninguna fila sincronizada trae `entityId`, nombres ni montos de terceros; una tienda excluida deja de aportar y de usar la señal.
- [ ] 9.4 Revisión legal (Ley 1581 de 2012; Ley 1266 de 2008), texto de autorización y política de tratamiento; la señal no se enciende en producción sin este visto bueno. — Depende de: — · Talla: L · Rol: legal — Verificar: concepto escrito y texto aprobado; sin él, la bandera de la señal sigue apagada y el lanzamiento continúa sin ella.

## 10. Costo, créditos y operación (E10)

- [ ] 10.1 Telemetría de costo por tienda (jobs, WhatsApp por plantilla, PowerSync, voz e IA) y política de créditos: el pronóstico no consume créditos; voz e IA sí, como hoy; N mensajes de WhatsApp al mes incluidos, el resto en créditos o desactivado; push y correo gratis. — Depende de: 2.4, 5.1, 8.4, 8.5 · Talla: L · Rol: plataforma — Verificar: panel mensual por tienda; el GET del pronóstico deja los créditos intactos, la voz los descuenta y el mensaje N+1 consume créditos o se bloquea.
- [ ] 10.2 Backtesting a 7 y 14 días por `rulesVersion` (`BacktestAggregate`: MAE, falsos positivos y negativos de avisos, calibración de p ≥ 0,8) y procedimiento de calibración: una versión nueva corre 14 días en sombra y se promueve solo si no empeora el error y pasa las pruebas de referencia. — Depende de: 1.6, 2.1, 8.1 · Talla: L · Rol: backend — Verificar: panel por versión; MAE contra la meta < 15 % de las salidas del horizonte.
- [ ] 10.3 Dashboards y alertas (OpenTelemetry, Sentry): p95 del GET < 300 ms, snapshot > 24 h, retraso de sincronización > 5 min, tasa de `409` (todo `client_mutation_conflict` abre revisión), push con recibo < 90 %; y tablero de las métricas de éxito (pagos vencidos sin pagar −30 %, conversión de avisos ≥ 25 %, ≥ 95 % de abonos sin señal sincronizados sin intervención, `alignmentDelta` −40 %, MAE < 15 %). — Depende de: 2.4, 5.1, 6.8, 8.4, 10.2 · Talla: L · Rol: plataforma — Verificar: cada alerta se dispara a propósito en staging y llega a quien está de guardia; el tablero calcula cada métrica con datos del piloto.
- [ ] 10.4 Vista y endpoints internos de soporte, con auditoría de acceso en `CashflowAuditEvent` (TTL 24 meses): pronóstico emitido con su `rulesVersion`, por qué salió cada aviso y por qué canal (`GET /internal/v1/cashflow/notifications/:id`) y recálculo forzado. — Depende de: 2.5, 8.4 · Talla: M · Rol: backend — Verificar: soporte ve el `ForecastIssued` que disparó un aviso y cada canal intentado; con el token de una dueña → 403; cada consulta queda registrada.
- [ ] 10.5 Runbooks y guardia de soporte: sin pronóstico, pronóstico viejo, «no me llegó el aviso», conflicto 409, celular nuevo, forzar recálculo, apagar la bandera, desconectar PowerSync. — Depende de: 5.8, 10.4 · Talla: M · Rol: plataforma — Verificar: soporte resuelve un simulacro de cada caso solo con el runbook.
- [ ] 10.6 Retención y borrado: TTL de recibos (90 días) y de `ForecastIssued` (13 meses), un snapshot por tienda y eliminación de una cuenta borrada en ≤ 15 días hábiles (sus compromisos, snapshot, pronósticos, ritmo, preferencias, perfiles y `EntityLink`). — Depende de: 4.1, 9.4 · Talla: M · Rol: backend — Verificar: los TTL existen; borrar una tienda de prueba no deja filas en colecciones derivadas ni en su bucket.

## 11. Calidad, seguridad y cumplimiento (E11)

- [ ] 11.1 Plan de pruebas por capa con criterios de salida por fase (motor: propiedades; backend: contrato y concurrencia; sincronización: contrato de reglas y caos; app: Jest y Maestro; web: Playwright; avisos: reloj simulado) y compuertas en CI. — Depende de: 1.5 · Talla: M · Rol: QA — Verificar: plan aprobado; cada compuerta bloquea el merge.
- [ ] 11.2 Pruebas de carga con k6: 100 solicitudes por segundo al GET durante 5 minutos, pico de las 7:00 (5.000 tiendas abriendo la app en 10 minutos) y job nocturno de 5.000 tiendas. — Depende de: 2.4, 5.1, 8.2 · Talla: L · Rol: QA — Verificar: p95 del GET < 300 ms y < 1 % de errores; job en < 15 min; sin degradar `POST /v2/receivables/:id/payments`.
- [ ] 11.3 Revisión de seguridad: `storeId` solo del token (`403 store_forbidden`), límites de uso, ningún dato personal en logs ni telemetría, enlaces firmados, secretos y JWKS, y cifrado en reposo de la base local (SQLCipher, clave en Keychain/Keystore). — Depende de: 5.5, 8.5 · Talla: L · Rol: plataforma — Verificar: pruebas negativas automáticas en verde (otra tienda en cuerpo, ruta y parámetros); 0 hallazgos críticos abiertos; el archivo local no se lee sin la clave.
- [ ] 11.4 Revisión de textos sin jerga (el chequeo de lenguaje de 1.3 se amplía a avisos, plantilla, correo, estados vacíos y de error y web; lectura con dueñas reales) y auditoría final de accesibilidad de app y web (VoiceOver, TalkBack, axe). — Depende de: 6.10, 7.1, 7.4, 8.3 · Talla: L · Rol: QA — Verificar: cero términos prohibidos; ≥ 8 de cada 10 dueñas explican con sus palabras el titular y la primera acción; 0 hallazgos críticos de accesibilidad.
- [ ] 11.5 Revisión de privacidad y cumplimiento: inventario de datos, base legal, autorización y finalidad, retención, solicitudes de supresión, proveedores como encargados (PowerSync, Meta, Expo) y Registro Nacional de Bases de Datos. — Depende de: 9.4, 10.6 · Talla: L · Rol: legal — Verificar: concepto escrito y política de tratamiento de datos actualizada.

## 12. Despliegue y lanzamiento (E12)

- [ ] 12.1 CI: typecheck, pruebas de motor, backend, app y web, contrato OpenAPI, contrato de sync rules y bench. — Depende de: 1.4 · Talla: M · Rol: plataforma — Verificar: el pipeline en verde es obligatorio para fusionar; un cambio que rompe el contrato lo hace fallar.
- [ ] 12.2 Despliegue del backend en contenedor (sin plataforma definida: ECS Fargate o Render/Railway para el piloto) con Atlas, Redis para BullMQ y PowerSync, y de la web estática bajo el mismo dominio; staging y producción. — Depende de: 12.1 · Talla: L · Rol: plataforma — Verificar: prueba de humo tras cada despliegue; la sesión por cookies funciona en la web.
- [ ] 12.3 EAS Build (development build con los módulos nativos de PowerSync), EAS Submit y EAS Update por canal y versión de runtime, con versión mínima de la app. — Depende de: 12.1 · Talla: L · Rol: mobile — Verificar: build interno instalable en iOS y Android; una corrección de JS llega con EAS Update sin pasar por tienda.
- [ ] 12.4 Bandera `cashflow_forecast` por tienda con interruptor general (backend, app y web): sin ella la API responde 404 a `/v1/cashflow/*`; apagarla detiene jobs y avisos y conserva los datos. — Depende de: 12.2 · Talla: M · Rol: plataforma — Verificar: encender o apagar una tienda se refleja en app y web en la siguiente apertura; encendida, baja su bucket y entra al job de esa noche.
- [ ] 12.5 Piloto interno (tiendas del equipo y aliadas) tras la bandera, con build interno de EAS y criterios de parada (errores, abonos duplicados, quejas). — Depende de: 2.5, 6.6, 6.7, 6.8, 12.4 · Talla: M · Rol: producto — Verificar: una semana con cero abonos duplicados y ≥ 95 % de los abonos sin señal sincronizados sin revisión.
- [ ] 12.6 Plan de reversión por fase, ensayado: apagar la bandera, detener avisos, revertir sync rules, retirar PowerSync (los datos siguen en Mongo y la API no cambia) y migraciones reversibles. — Depende de: 5.4, 12.4 · Talla: M · Rol: plataforma — Verificar: ensayo en staging de cada reversión sin perder datos ni abonos en cola.
- [ ] 12.7 Documentación y capacitación para soporte, y comunicación a usuarias (anuncio en la app y por correo, sin jerga). — Depende de: 10.5, 11.4 · Talla: M · Rol: producto — Verificar: soporte resuelve el simulacro de 10.5; los textos aprobados salen solo a tiendas con la bandera encendida.
- [ ] 12.8 Despliegue por etapas con la versión nativa publicada: 50 tiendas durante 90 días, luego 10 % (hash estable del `storeId`) y 100 %; cada etapa exige una semana sin abonos duplicados ni alertas críticas y con ≥ 95 % de abonos sin señal sincronizados sin revisión; antes del 10 %, calibración final de avisos y costo y nueva auditoría de seguridad y carga (los 90 días de observación son calendario, no esfuerzo: ver la propuesta). — Depende de: 2.5, 6.11, 11.2, 11.3, 11.4, 11.5, 12.5, 12.6, 12.7 · Talla: XL · Rol: producto — Verificar: informe firmado de cada etapa antes de avanzar; las 50 tiendas con MAE < 15 %; el 100 % con snapshot de menos de 24 h.
- [ ] 12.9 Revisión post-lanzamiento a 30 y 90 días: métricas de éxito, backtesting, costo por tienda, incidentes y calibración. — Depende de: 10.3, 12.8 · Talla: M · Rol: producto — Verificar: informes a 30 y 90 días con decisiones registradas.

## Resumen

|Épica|Total|Hechas|Pendientes|Talla pendiente (persona-semanas)|
|:--|--:|--:|--:|--:|
|1. Motor compartido (E1)|6|3|3|1,5|
|2. Backend de pronóstico (E2)|5|0|5|6,5|
|3. Captura (E3)|6|0|6|5,0|
|4. Escrituras idempotentes (E4)|4|0|4|2,5|
|5. Sincronización (E5)|8|0|8|7,0|
|6. App (E6)|11|3|8|7,5|
|7. Web (E7)|4|0|4|4,0|
|8. Avisos (E8)|5|0|5|5,5|
|9. Otras tiendas (E9)|4|1|3|4,0|
|10. Costo y operación (E10)|6|0|6|4,5|
|11. Calidad y seguridad (E11)|5|0|5|4,5|
|12. Despliegue y lanzamiento (E12)|9|0|9|7,0|
|**Total**|**73**|**7**|**66**|**59,5**|

Suma de tallas con S = 1, M = 2,5, L = 5 y XL = 10 días (5 días = 1 persona-semana), sin revisión, integración ni esperas; el calendario y los equipos están en la sección «Fases» de este archivo.

## Workflow follow-up

- Archivar el cambio con `openspec archive caja-a-14-dias` solo cuando las 73 tareas estén `[x]` y el despliegue al 100 % (12.8) lleve su semana de observación; el archivo crea los seis `openspec/specs/cashflow-*/spec.md` con su Purpose y sus requisitos (33 en total).
- Antes de archivar, mover a un cambio propio lo que se posponga (por ejemplo, la señal de otras tiendas si el concepto legal no llega), para que los specs vigentes describan solo lo que existe en producción.
- Tras archivar, correr `openspec validate --specs --strict` y crear los specs base de los sistemas existentes que esta función tocó (abonos, bancos, notificaciones), para que los próximos cambios usen deltas MODIFIED.
