# cashflow-forecast · Pronóstico de caja día a día

## Purpose

`cashflow-forecast` es la capacidad con la que Necta le dice a cualquier dueña de negocio, con una semana de anticipación y en lenguaje cotidiano, si su caja cubre lo que debe pagar en los próximos días (14 por defecto, de 1 a 60), qué tan segura es esa respuesta y qué hacer. Cubre el cálculo en tres bandas, la certeza explicada y las acciones; la captura, la pantalla, el trabajo sin señal, los avisos y la operación viven en las capacidades hermanas `cashflow-*`.

## ADDED Requirements

### Requirement: Horizonte y saldo de partida
El sistema SHALL proyectar N días calendario (14 por defecto, entre 1 y 60) desde la fecha base de la tienda, SHALL partir en la banda prudente del menor de los dos saldos (el guardado y el que dan los movimientos, `projectedBalance`), en la probable del que dan los movimientos y en la favorable del mayor, y SHALL mostrar `alignmentDelta` como «plata por confirmar» sin bloquear el pronóstico.

#### Scenario: Horizonte del caso
- **WHEN** una tienda consulta el pronóstico con fecha base lunes 25 de mayo de 2026 y 14 días (ejemplo: caso Carmen)
- **THEN** el horizonte SHALL ir del 25 de mayo al 7 de junio inclusive, con 14 proyecciones etiquetadas en español («lun 25 may» … «dom 7 jun»)

#### Scenario: Los dos saldos
- **WHEN** Necta muestra 1.900.000 guardados y los movimientos dan 1.640.000
- **THEN** prudente y probable SHALL partir de 1.640.000, favorable de 1.900.000, y la pantalla SHALL mostrar «Plata hoy $1.640.000» con «$260.000 por confirmar»

#### Scenario: Descuadre a la inversa
- **WHEN** el saldo guardado es 1.000.000 y los movimientos dan 1.200.000
- **THEN** `alignmentDelta` SHALL ser −200.000, prudente SHALL partir de 1.000.000 y probable y favorable de 1.200.000

#### Scenario: Cuadre en un toque
- **WHEN** la dueña toca «Cuadrar mi caja en un toque» (ejemplo: caso Carmen; equivale a «Tengo $1.300.000» en Caja: `CONFIRM_STORED_BALANCE`)
- **THEN** `alignmentDelta` SHALL quedar en 0, el sábado 30 SHALL quedar cubierto, el titular SHALL pasar a «El lunes 1 de junio te faltan $1.058.000 para el arriendo de la bodega.», la certeza SHALL subir a 0,62 y el chip SHALL dejar de decir «1 dato por confirmar»; en el servidor, el cuadre SHALL registrarse como un ajuste con motivo `conteo-de-caja` sin reescribir movimientos, «Tengo $1.040.000» SHALL corregir el saldo guardado, «Conté otra cifra» SHALL llevar ambos saldos a lo contado y un reintento con el mismo `clientMutationId` SHALL devolver el resultado original

### Requirement: Cualquier tienda, cualquier fecha
El motor SHALL calcular solo a partir de la entrada de la tienda (saldos, cuentas por cobrar con su historial, pagos, pagos fijos, ritmo) y de la fecha base, SHALL derivar de esa fecha el día de la semana, los días cerrados, la semana de quincena y los vencimientos, SHALL NOT tener nombres, montos ni fechas escritos en el código, y SHALL producir la misma salida para la misma entrada con su `rulesVersion`.

#### Scenario: Otra tienda, otro horizonte
- **WHEN** una tienda que cierra los lunes y abre los domingos pide 21 días desde un martes
- **THEN** el horizonte SHALL tener 21 proyecciones, los lunes SHALL tener ventas y gastos en cero, los domingos SHALL contar sus ventas, y la semana que contiene el 15 o el 30 SHALL llevar la subida de quincena en probable y favorable pero no en prudente

#### Scenario: Cualquier fecha base
- **WHEN** la fecha base cae en un año bisiesto, o el horizonte pedido es 0 o mayor a 60, o la fecha es inválida
- **THEN** el 29 de febrero SHALL contarse como un día más, y los otros casos SHALL rechazarse con un error antes de calcular

#### Scenario: Las bandas se comportan
- **WHEN** se calcula cualquier entrada
- **THEN** cada día SHALL cumplir `prudente ≤ probable ≤ favorable`, cada cierre SHALL ser saldo anterior + entradas − salidas, el primer día SHALL partir del saldo inicial y el último SHALL cerrar en `endOfHorizon`

### Requirement: Cobros fechados por comportamiento
El sistema SHALL clasificar cada cuenta por cobrar según vencimiento e historial de pagos (fechas reales de cada pago), SHALL asignar probabilidad y fecha contada por banda, y SHALL NOT contar una factura por valor esperado: entra entera o no entra.

#### Scenario: Hotel Brisas, 6 de 6 a tiempo
- **WHEN** Hotel Brisas debe 2.100.000 con vencimiento jueves 28 y ha pagado a tiempo 6 de 6 veces (ejemplo: caso Carmen)
- **THEN** SHALL ser «confiable» con probabilidad 0,95 y contarse el 28 de mayo en las tres bandas, con la explicación «Ha pagado a tiempo las 6 veces. Cuenta con esta plata el jue 28 may.»

#### Scenario: Minimercado Sol, vencida más de lo habitual
- **WHEN** Minimercado Sol debe 1.200.000, venció hace 20 días, pagó a tiempo 1 de 4 veces y se atrasa 18 días en promedio
- **THEN** SHALL quedar fuera de prudente y probable (solo favorable, 3 días después de gestionarla) y la explicación SHALL sugerir pedir hoy un abono de al menos 600.000

#### Scenario: Tienda La Esquina, irregular
- **WHEN** Tienda La Esquina debe 850.000, vence el martes 26, pagó a tiempo 2 de 5 veces y se atrasa 12 días
- **THEN** SHALL ser «irregular» con probabilidad 0,7, contarse en probable el 7 de junio y en favorable el 26 de mayo, y SHALL NOT contarse en prudente

#### Scenario: Tienda Doña Fina, 4 de 4
- **WHEN** Tienda Doña Fina debe 600.000 con vencimiento viernes 29 y ha pagado a tiempo 4 de 4
- **THEN** SHALL contarse el 29 de mayo en las tres bandas

#### Scenario: Las otras 9 tiendas, 22 de 31
- **WHEN** 850.000 vencen en las próximas dos semanas en dos tramos (viernes 29 y viernes 5) con 22 de 31 pagos a tiempo y atraso medio de 7 días
- **THEN** el primer tramo SHALL contarse el 5 de junio en las tres bandas (p 0,85) con la explicación «La plata segura la cuenta el vie 5 jun, no el vie 29 may», y el segundo SHALL contarse solo en favorable porque su fecha típica (12 de junio) sale del horizonte

#### Scenario: Cliente sin historial
- **WHEN** un cliente tiene menos de 3 ventas a crédito con desenlace conocido
- **THEN** SHALL ser «historial corto» con probabilidad 0,5 (mezclada con la señal de otras tiendas solo si hay ≥ 3 comercios y entidad resuelta), SHALL NOT contarse en prudente y la acción SHALL ser confirmar con el cliente la fecha de pago

### Requirement: Ventas de contado por día de la semana
El sistema SHALL modelar las ventas de contado por día de la semana (0 = cerrado), con subida de quincena y gastos de contado por día abierto; la banda prudente SHALL contar el 80 % de las ventas sin la subida de quincena; la fracción de movimientos registrados en Necta SHALL penalizar la certeza y SHALL NOT recortar las bandas.

#### Scenario: El ritmo de Carmen
- **WHEN** vende 260.000 de lunes a jueves y 520.000 viernes y sábado, no abre domingos, sube 30 % en semana de quincena y gasta 90.000 por día abierto (ejemplo: caso Carmen)
- **THEN** el lunes 25 (semana del 30) SHALL netear 118.000 prudente y 248.000 probable, el lunes 1 118.000 y 170.000, el domingo 31 cero, y los 14 días SHALL sumar 2.248.000 prudente y 3.704.000 probable

#### Scenario: Registro parcial
- **WHEN** la dueña registra en Necta cerca del 25 % de sus movimientos
- **THEN** la certeza SHALL incluir el factor «registro parcial» con penalización 0,38 y la nota del ritmo SHALL decir que las cifras salen de lo que ella cuenta, no de sus registros

### Requirement: Veredicto, dependencias y margen de error
El sistema SHALL calcular cada día como saldo anterior + entradas − salidas en tres bandas, SHALL responder primero qué pasa y cuándo, SHALL nombrar los días de pago que dependen de un solo cobro, y SHALL exponer el muro de 4 días con más salidas.

#### Scenario: La pregunta del viernes
- **WHEN** el viernes 29 vencen 4.200.000 del proveedor principal
- **THEN** la plata segura SHALL cerrar ese día en 938.000 (alcanza) y `hinges` SHALL indicar que depende de Hotel Brisas (sin ese cobro, −1.162.000); la pantalla SHALL decir «El viernes 29 de mayo alcanza solo si Hotel Brisas paga el jue 28 may; sin ese cobro faltarían $1.162.000.»

#### Scenario: El hueco real
- **WHEN** se lee la banda prudente del sábado 30 y del lunes 1
- **THEN** el titular SHALL ser «El sábado 30 de mayo te faltan $136.000 para el pago de tus ayudantes.», el hueco máximo SHALL ser 1.318.000 el lunes 1 (arriendo) y el cierre SHALL ser 113.000 prudente, 2.419.000 probable y 4.304.000 favorable

#### Scenario: El muro de 4 días
- **WHEN** se buscan los 4 días consecutivos con más salidas
- **THEN** `criticalWindow` SHALL ser del viernes 29 al lunes 1 con 6.900.000, y la pantalla SHALL mostrar «Sale en 4 días $6.900.000 · vie 29 may – lun 1 jun»

#### Scenario: Espejismo ingenuo
- **WHEN** alguien suma 1.900.000 + 5.600.000 + 3.704.000 − 4.200.000
- **THEN** obtiene 7.004.000 y ninguna banda SHALL mostrar ese cierre con los compromisos capturados

#### Scenario: Cuando sí alcanza
- **WHEN** la plata segura cubre todas las salidas con margen ≥ 10 % y ningún día depende de un solo cobro
- **THEN** el estado SHALL ser «cubierto» («Sí» en la pantalla), sin dependencias ni acciones de plazo, y las acciones de cobro SHALL seguir disponibles

#### Scenario: Cuando alcanza muy justo
- **WHEN** ningún día cierra en rojo pero el mínimo de la plata segura es menor al 10 % de las salidas del horizonte
- **THEN** el estado SHALL ser «ajustado» («Sí, pero justo» en la pantalla) con el día y el monto del punto más bajo en el titular

### Requirement: Certeza explicada
El sistema SHALL expresar la certeza como alta / media / baja a partir de factores observables con su peso, SHALL decir qué dato la subiría y SHALL mantener las acciones aunque sea baja.

#### Scenario: Certeza de Carmen
- **WHEN** la dueña registra el 25 % de sus movimientos y hay 260.000 sin cuadrar (ejemplo: caso Carmen)
- **THEN** la certeza SHALL ser media (0,46) con esos dos factores (0,38 y 0,16), `ifConfirmed` SHALL ser 0,62 (media) con la nota de que sigue media mientras registre solo una parte, la acción de cuadrar SHALL traer `certaintyAfter` 0,62 y el chip de la pantalla SHALL decir «Certeza media: 1 dato por confirmar»

#### Scenario: Las razones al tocar el chip
- **WHEN** la dueña toca el chip de certeza
- **THEN** la tarjeta SHALL desplegar las razones en lenguaje cotidiano («Registras en Necta cerca del 25 % …», «… $260.000 que no cuadran …»), lo que subiría la certeza y el enlace «Cuadrar mi caja en un toque»

### Requirement: Qué hacer: cobrar, pedir abono y pedir plazo
El sistema SHALL rankear acciones con `cubreHueco × probabilidad × urgencia + 0,1 × amplitud`, SHALL devolver los factores, SHALL proponer pedir plazo al proveedor cuando un pago depende de un solo cobro, y SHALL entregar como máximo 3 acciones a la vista principal de la app.

#### Scenario: A quién cobrarle primero
- **WHEN** se calcula el caso de Carmen
- **THEN** las acciones SHALL ser, en orden: recordarle a Hotel Brisas (0,85, con el efecto «sin este cobro el viernes 29 de mayo te faltarían $1.162.000»), cobrarle a Tienda La Esquina antes del martes 26 (0,72), recordarle a Tienda Doña Fina (0,72), cobrar el primer tramo de las otras tiendas (0,64), pedirle hoy un abono de 600.000 a Minimercado Sol (0,55), cuadrar el saldo (0,52), pedir plazo al proveedor por si Brisas no paga (0,48) y cobrar el segundo tramo antes del 5 de junio (0,18)

#### Scenario: Pedir plazo por si acaso
- **WHEN** el viernes depende de Hotel Brisas
- **THEN** SHALL existir la acción `pedir-plazo` para el proveedor principal con fecha límite jueves 28, borrador de WhatsApp y el efecto «Si el cobro llega, no usas el plazo; si no llega, ya está acordado»

#### Scenario: Auditabilidad
- **WHEN** se lee cualquier acción
- **THEN** SHALL incluir `score`, factores en 0..1, `deepLink` `necta://` y, si el canal es WhatsApp, un borrador en lenguaje cotidiano

### Requirement: Nivel de inteligencia artificial
El sistema SHALL calcular cifras, fechas, probabilidades y prioridades con reglas deterministas versionadas; MAY usar un modelo de lenguaje para captura por voz y borradores de mensajes con confirmación humana; y SHALL NOT usar un modelo estadístico de pronóstico mientras solo existan 6 meses de datos de una tienda.

#### Scenario: Mismos datos, misma respuesta
- **WHEN** se calcula dos veces con la misma entrada (en el teléfono o en `POST /v1/cashflow/forecast`)
- **THEN** la respuesta SHALL ser idéntica salvo `computedAt` y SHALL indicar `rulesVersion`

#### Scenario: Compromiso dictado
- **WHEN** la dueña dicta «pago un millón cuatrocientos a los ayudantes el 30 y el 15»
- **THEN** `extract-schema` SHALL devolver importe, fechas y periodicidad para revisar, SHALL consumir créditos como hoy y el compromiso SHALL entrar solo tras confirmar

### Requirement: Lenguaje sin jerga
Todo texto para la dueña SHALL usar lenguaje cotidiano y SHALL NOT contener jerga contable, financiera ni estadística.

#### Scenario: Revisión automática
- **WHEN** se serializan titular, detalle, notas, factores, explicaciones y acciones del caso
- **THEN** SHALL NOT aparecer «cuentas por cobrar», «cuentas por pagar», «conciliación», «cartera», «pasivo», «liquidez», «percentil», «intervalo de confianza», «desviación», «asiento», «transacción» ni «flujo de caja»

#### Scenario: Errores, avisos y plantillas
- **WHEN** se serializan el `message` de cada código de error, los textos de push, correo y plantilla de WhatsApp, y los banners de la app y la web
- **THEN** la misma lista de términos SHALL NOT aparecer en ninguno

### Requirement: Datos de otras tiendas con privacidad
El sistema MAY usar la señal agregada de otras tiendas solo como prior interno con entidad resuelta (confianza ≥ 0,8) y al menos 3 comercios independientes, y SHALL NOT exponer nombres, montos ni historiales de terceros.

#### Scenario: Umbral cumplido
- **WHEN** un cliente nuevo (1 venta) tiene señal de 4 comercios con atraso agregado 5 días y puntualidad 0,7
- **THEN** el motor SHALL mezclar con peso 0,25 propio / 0,75 red y el texto SHALL ser «en negocios similares de tu zona suele tardar entre 4 y 6 días más de lo pactado», sin nombres ni montos

#### Scenario: Umbral no cumplido o entidad ambigua
- **WHEN** la señal viene de 2 comercios o la coincidencia es solo por nombre con confianza 0,5
- **THEN** SHALL ignorarse y usarse solo el historial propio
- **AND** una entidad con menos de 3 comercios o de 10 facturas, o donde un comercio aporta más del 50 %, SHALL NOT tener perfil agregado publicado, y el atraso publicado SHALL ir redondeado a 2 días

#### Scenario: Consentimiento antes de aportar o usar la señal
- **WHEN** una tienda activa la función
- **THEN** la app SHALL pedir su autorización con una casilla sin marcar y el texto «¿Nos dejas usar, sin nombres ni montos, cómo pagan los clientes en las tiendas de Necta para mejorar tu pronóstico?», guardarla con `PUT /v1/cashflow/network-consent` (`participates`, `textVersion`; responde `effectiveFrom`), y sin ella las facturas de la tienda SHALL NOT entrar en ningún perfil agregado ni su pronóstico usar la señal (un solo interruptor)

#### Scenario: Exclusión voluntaria
- **WHEN** la dueña desactiva esa opción en sus ajustes (`PUT /v1/cashflow/network-consent` con `participates = false`)
- **THEN** sus facturas SHALL dejar de contar en el siguiente cálculo de perfiles (máximo 24 horas), los perfiles que queden con menos de 3 comercios o 10 facturas SHALL retirarse y su pronóstico SHALL seguir con su historial propio

#### Scenario: Auditoría y límite de consultas
- **WHEN** el motor consulta el perfil agregado de una entidad para un cliente de una tienda
- **THEN** SHALL registrarse tienda, entidad, hora y resultado (usada o ignorada por pocos comercios, confianza baja, falta de autorización o límite), sin nombres ni montos de terceros, con un límite de 1.000 consultas por tienda y día; superado, la señal SHALL ignorarse y SHALL abrirse una revisión
