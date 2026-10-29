# cashflow-capture · Captura de ritmo, pagos fijos y cuadre

## Purpose

`cashflow-capture` es cómo Necta obtiene de la dueña, con un toque o por voz y siempre con confirmación, lo que no tiene registrado y el pronóstico necesita: el ritmo de ventas de contado, los pagos fijos que no pasan por la app y el saldo real cuando no cuadra.

## ADDED Requirements

### Requirement: Ritmo de ventas declarado y actualizado
La tienda SHALL poder declarar su ritmo de ventas al activar la función (ventas de contado típicas por día de la semana, con 0 = cerrado; gasto por día abierto; subida de quincena) y corregirlo con `GET` y `PATCH /v1/cashflow/rhythm`; el sistema SHALL reemplazarlo por el derivado del historial (`source = historial`) cuando la tienda registre lo suficiente, y SHALL NOT inventar cifras de ventas cuando no hay ritmo.

#### Scenario: Declarar el ritmo al activar
- **WHEN** la dueña declara 260.000 de lunes a jueves, 520.000 viernes y sábado, 0 el domingo, 90.000 de gasto por día abierto y 30 % de subida de quincena (ejemplo: caso Carmen)
- **THEN** `PATCH /v1/cashflow/rhythm` SHALL guardarlo con `source = declarado` y el primer pronóstico SHALL usarlo (en el ejemplo, los 14 días suman 2.248.000 prudente y 3.704.000 probable)

#### Scenario: Corregir el ritmo con o sin señal
- **WHEN** una tienda baja las ventas típicas del sábado de 400.000 a 300.000 sin señal
- **THEN** la app SHALL recalcular en el acto y enviar el `PATCH` con su `clientMutationId` al volver la señal
- **AND** el servidor SHALL rechazar con `422 validation_error` y `details.field` una venta negativa o una subida de quincena mayor a 100 %, sin guardar nada de ese cambio

#### Scenario: El historial reemplaza lo declarado
- **WHEN** una tienda llega a 8 semanas de ventas registradas y registra al menos el 70 % de sus movimientos (umbrales iniciales, versionados con las reglas)
- **THEN** el job nocturno SHALL derivar el ritmo de su historial, `source` SHALL pasar a `historial` y la nota del ritmo SHALL decir que las cifras salen de sus registros

#### Scenario: Sin ritmo no hay cifras inventadas
- **WHEN** la tienda activó la función y aún no declaró su ritmo ni tiene historial suficiente
- **THEN** `GET /v1/cashflow/forecast` SHALL responder `422 validation_error` con `details.field = operatingRhythm`, y la pantalla y la tarjeta de inicio SHALL pedir «Cuéntanos cuánto vendes en un día normal para calcular tu caja.» sin veredicto, barras ni ventas supuestas

### Requirement: Pagos que Necta no tiene registrados
El sistema SHALL permitir capturar pagos fijos (nómina, arriendo, cuotas) por chips, voz o a mano, con origen y estado de confirmación; lo confirmado SHALL entrar en las tres bandas y lo sugerido sin confirmar SHALL descontarse en prudente y probable.

#### Scenario: Ayudantes y arriendo confirmados
- **WHEN** la dueña confirma 1.400.000 de ayudantes el sábado 30 y 1.300.000 de arriendo el lunes 1 (ejemplo: caso Carmen)
- **THEN** ambos SHALL descontarse en las tres bandas y las salidas del horizonte SHALL sumar 6.900.000 (4.200.000 del proveedor + 2.700.000 fuera de Necta)

#### Scenario: La cuota del préstamo
- **WHEN** la cuota de 650.000 vence el día 10, fuera de los 14 días
- **THEN** SHALL quedar registrada como compromiso mensual, SHALL NOT descontarse en este horizonte y SHALL aparecer cuando el horizonte la alcance

#### Scenario: Compromiso sugerido sin confirmar
- **WHEN** el arriendo entra como `sugerido-por-patron` sin confirmar
- **THEN** SHALL descontarse en prudente y probable, SHALL NOT descontarse en favorable (cierre 5.604.000), la primera acción SHALL ser «Confirmar: ¿el arriendo de la bodega por $1.300.000 el lunes 1 de junio?» y la certeza SHALL bajar a baja

#### Scenario: Sin pagos fijos anotados
- **WHEN** una tienda no tiene ningún compromiso
- **THEN** la banda favorable SHALL mostrar el espejismo ingenuo (7.004.000 para Carmen), la certeza SHALL incluir «sin compromisos capturados» y el detalle SHALL advertir que faltan pagos fijos por anotar

### Requirement: Captura de compromisos
La app y la web SHALL permitir anotar un pago fijo con chips de un toque cuando falten 7 días o menos para la quincena (15 y 30) o el inicio de mes, por voz con confirmación obligatoria o a mano, con recurrencia única, quincenal o mensual; SHALL crear como `sugerido-por-patron` y sin confirmar lo que detecte en el historial; y el servidor SHALL exponer `POST`, `GET`, `PATCH …/:id` (editar), `PATCH …/:id/confirm` y `DELETE` en `/v1/cashflow/commitments`.

#### Scenario: Chips de un toque antes de quincena
- **WHEN** faltan 7 días o menos para el 15, el 30 o el día 1 y no hay un pago fijo anotado para esa fecha
- **THEN** la app SHALL mostrar chips de los pagos comunes (ayudantes, arriendo, cuota) con su último monto y la próxima fecha; un toque SHALL guardar el compromiso (`source = confirmado-por-usuaria`, `confirmed = true`) y recalcular en el acto, y lo anotado sin señal SHALL subir con su `clientMutationId` al volver la señal

#### Scenario: Voz con confirmación obligatoria
- **WHEN** la dueña dicta un pago fijo y `extract-schema` devuelve `label`, `amount`, `dueDates[]` y `recurrence`
- **THEN** la app SHALL mostrarlos para revisar y guardar con `source = dictado-por-voz` solo cuando ella confirme; sin señal, sin créditos o con una respuesta incompleta, la voz SHALL deshabilitarse y el formulario manual SHALL seguir disponible

#### Scenario: Recurrencia quincenal y mensual
- **WHEN** se confirma un compromiso quincenal (15 y 30) o mensual
- **THEN** el servidor SHALL generar la próxima ocurrencia con fecha al confirmar y otra cada vez que se cumple una, en febrero el día 30 SHALL caer el último día del mes y una ocurrencia posterior al horizonte SHALL NOT descontarse hasta que el horizonte la alcance

#### Scenario: Sugerido por patrón: confirmar o descartar
- **WHEN** el detector (al menos 2 ocurrencias dentro de ±3 días e importe dentro de ±20 %) propone un pago fijo (ejemplo: caso Carmen, «Confirmar: ¿el arriendo de la bodega por $1.300.000 el lunes 1 de junio?»)
- **THEN** `GET /v1/cashflow/commitments` SHALL listarlo `sugerido-por-patron`, sin confirmar y marcado «Por confirmar»; confirmarlo (`PATCH …/:id/confirm`) SHALL descontarlo también en favorable (en el ejemplo, el cierre favorable vuelve a 4.304.000 y la certeza a media, 0,46) y descartarlo (`DELETE …/:id`) SHALL quitarlo sin volver a sugerirlo
