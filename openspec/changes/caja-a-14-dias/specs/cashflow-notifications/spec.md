# cashflow-notifications · Avisos a tiempo

## Purpose

`cashflow-notifications` define cuándo y por qué canal Necta avisa a la dueña de un faltante o de un cobro del que depende un pago (push y, si no hay app o permiso, WhatsApp con plantilla o correo), con preferencias y consentimiento expreso.

## ADDED Requirements

### Requirement: Avisos a tiempo con fallback
El sistema SHALL avisar solo ante cambios materiales y dependencias incumplidas, SHALL verificar la entrega push con ticket y recibo (a los 15 minutos), y SHALL usar WhatsApp con plantilla aprobada o correo cuando no hay app o no permitió notificaciones.

#### Scenario: Aviso del lunes
- **WHEN** el lunes a las 7:00 hora local el pronóstico muestra un hueco a ≤ 5 días (ejemplo: Carmen, lunes 25)
- **THEN** SHALL enviarse un push con el titular y la dependencia (en el ejemplo: «El viernes alcanza solo si Hotel Brisas paga el jueves; el sábado te faltan $136.000 para los ayudantes»)

#### Scenario: Dependencia incumplida
- **WHEN** a las 18:00 del día contado el cobro del que depende un pago no ha llegado (ejemplo: jueves 28, Hotel Brisas)
- **THEN** SHALL enviarse un aviso crítico con la acción de pedir plazo y el borrador de WhatsApp listo (en el ejemplo: «Hotel Brisas no ha pagado: pídele plazo hoy al proveedor»)

#### Scenario: Sin app o sin notificaciones
- **WHEN** no hay token, el recibo indica `DeviceNotRegistered`, las notificaciones están bloqueadas o un aviso crítico no se abre en 4 horas
- **THEN** SHALL enviarse WhatsApp con plantilla aprobada, consentimiento vigente y enlace web autenticado de alcance limitado; si tampoco es posible, correo

#### Scenario: Sin fatiga
- **WHEN** dos recálculos seguidos no cambian la severidad ni aparece una dependencia incumplida, o el aviso se genera a las 23:00
- **THEN** SHALL NOT repetirse el aviso, y el de las 23:00 SHALL diferirse a las 7:00

#### Scenario: Un aviso operativo al día
- **WHEN** ya se envió un aviso operativo hoy y aparece otro cambio material que no es una dependencia incumplida
- **THEN** el segundo SHALL esperar al día siguiente y quedar visible en la app, y una dependencia incumplida SHALL enviarse igual

#### Scenario: Abrir el aviso
- **WHEN** la dueña toca un push
- **THEN** la app SHALL abrir «Caja a 14 días» con el último pronóstico, también sin señal, emitir `notification_opened` y registrar la apertura con `POST /v1/cashflow/notifications/:id/events` (`event = opened`, con `clientMutationId`; `action_taken` si toca una acción desde el aviso), que pasa el aviso a `abierto`; sin señal, ese evento SHALL esperar en la cola de subida

#### Scenario: Plantilla de WhatsApp con variables
- **WHEN** un aviso escala a WhatsApp con opt-in vigente
- **THEN** el servicio de mensajería SHALL recibir `{ phone, template: "caja_alerta_v1", params, deepLink }` y enviar solo esa plantilla aprobada, con tres variables de una línea: nombre de pila, titular y enlace web firmado (ejemplo: «Hola Carmen, esto es lo que viene en tu caja: El sábado 30 de mayo te faltan $136.000 para el pago de tus ayudantes. Míralo aquí: …»); sin plantilla aprobada ni opt-in, SHALL NOT enviarse nada y el aviso SHALL quedar en la app (y en el correo, si está activado)

#### Scenario: Resumen semanal por correo
- **WHEN** la tienda tiene activado el resumen semanal y llega el lunes a las 7:00 hora local
- **THEN** SHALL recibir un correo con el titular, la certeza, las tres primeras acciones y el enlace web firmado, aunque no haya cambios; si rebota, la dirección SHALL marcarse como inválida

#### Scenario: Preferencia «solo en el celular»
- **WHEN** la dueña eligió avisos solo por push (WhatsApp y correo desactivados) y el recibo indica `DeviceNotRegistered`
- **THEN** el sistema SHALL dar de baja el token, SHALL NOT escalar a WhatsApp ni a correo, el aviso SHALL quedar visible en la tarjeta y la entrega fallida SHALL contarse en las métricas

### Requirement: Preferencias de avisos y consentimiento
La dueña SHALL poder elegir por dónde y cuándo recibe sus avisos (push, WhatsApp, correo, ventana horaria y resumen semanal) con `GET` y `PATCH /v1/cashflow/notification-preferences`; el sistema SHALL NOT enviar ninguna plantilla de WhatsApp sin un opt-in expreso y vigente, y SHALL permitir darse de baja de cualquier canal con un toque.

#### Scenario: Valores por defecto
- **WHEN** una tienda activa la función y pide sus preferencias
- **THEN** SHALL recibir push activado, WhatsApp desactivado hasta que acepte, correo y resumen semanal activados si hay correo verificado, y la ventana de 7:00 a 20:00 de su zona horaria

#### Scenario: Elegir canales y horario
- **WHEN** la dueña acorta la ventana a 8:00–18:00 y apaga el correo
- **THEN** `PATCH` SHALL guardarlo, ningún aviso SHALL salir fuera de ese horario, el resumen del lunes SHALL salir a las 8:00, y una ventana que se salga de 7:00–20:00 SHALL rechazarse con `422 validation_error`

#### Scenario: Opt-in de WhatsApp antes de la primera plantilla
- **WHEN** un aviso podría escalar a WhatsApp y la tienda nunca aceptó
- **THEN** SHALL NOT enviarse la plantilla y la app SHALL ofrecer «¿Quieres recibir tus avisos por WhatsApp?» con una casilla sin marcar; al aceptar, `PATCH` SHALL guardar el opt-in con su fecha y responder `422 validation_error` si la tienda no tiene un teléfono verificado

#### Scenario: Baja con un toque
- **WHEN** la dueña toca «No más avisos por WhatsApp» en el mensaje o «Darme de baja» en un correo
- **THEN** el canal SHALL desactivarse en esa misma acción (la respuesta de WhatsApp que recibe el servicio de mensajería SHALL aplicarse en minutos), el opt-in SHALL marcarse revocado con su fecha y SHALL NOT enviarse otra plantilla a ese número
