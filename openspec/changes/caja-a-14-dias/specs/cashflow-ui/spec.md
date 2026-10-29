# cashflow-ui · La pantalla, la tarjeta y la web

## Purpose

`cashflow-ui` es cómo la dueña ve y usa el pronóstico: la pantalla «Caja a 14 días» y la tarjeta resumen en la app, legibles al sol y usables con una mano, accesibles, y el panel web con las mismas cifras y acciones.

## ADDED Requirements

### Requirement: La pantalla «Caja a 14 días» en la app
La app SHALL responder primero qué pasa y cuándo, en una sola columna con el titular arriba, la certeza, la plata segura día a día y tres acciones con sus botones; SHALL seguir la identidad visual de Necta; SHALL pintar cualquier pronóstico del motor sin depender de la tienda ni de la fecha; y SHALL permitir registrar un abono y cuadrar la caja desde la misma pantalla.

#### Scenario: Lo primero que ve la dueña
- **WHEN** abre la pantalla (ejemplo: Carmen, el lunes 25, con los datos del caso)
- **THEN** SHALL ver «¿Te alcanza para lo que debes pagar?» con la respuesta del veredicto (en el ejemplo, «No»), el titular del primer día en rojo, el panel «Depende de un cobro» si existe una dependencia (en el ejemplo, Hotel Brisas), «Plata hoy» con lo que haya por confirmar y «Sale en N días» con el muro (en el ejemplo, $1.640.000 · $260.000 por confirmar y $6.900.000)

#### Scenario: Plata segura día a día
- **WHEN** mira la tarjeta «Plata segura, día a día»
- **THEN** SHALL ver una barra por día del horizonte con la letra del día y la fecha, en rojo los días en negativo y el texto del punto más bajo (en el ejemplo: sáb 30 a vie 5 en rojo y «El punto más bajo es el lunes 1 de junio: te faltarían $1.318.000 si no entra más plata.»)

#### Scenario: Tres acciones y el resto
- **WHEN** mira «¿Qué hago hoy?»
- **THEN** SHALL ver las tres primeras acciones del ranking con su distintivo, lo que deben, por qué, el efecto, la fecha límite, el botón «Escribir por WhatsApp» y el enlace «Registrar cobro»; «Ver las N acciones» SHALL mostrar el resto (en el ejemplo: «1. Hotel Brisas · Asegura el viernes», «2. Tienda La Esquina · Puede demorar», «3. Tienda Doña Fina · Cumplida», y «7. tu proveedor principal» al ver las 8)

#### Scenario: Escribir por WhatsApp
- **WHEN** toca «Escribir por WhatsApp» en una acción de cobro
- **THEN** la app SHALL abrir `https://wa.me/…?text=` con el borrador del motor (en el ejemplo, «Hola, Hotel Brisas …») y, si hay número registrado, dirigido a ese número
- **AND** si WhatsApp no está instalado, SHALL abrirse en el navegador y el borrador SHALL quedar copiado

#### Scenario: Registrar un abono desde la pantalla
- **WHEN** toca «Registrar cobro» en una cuenta, escribe un monto y elige el bolsillito
- **THEN** la hoja SHALL mostrar «Te deben {pendiente}. Anota lo que te pagaron hoy.», SHALL guardar el abono con un `clientMutationId` nuevo y SHALL recalcular al instante (en el ejemplo, 300.000 de Hotel Brisas: «Plata hoy» sube en 300.000 y la dependencia del viernes baja en 300.000, a $602.000 tras el cuadre o a $862.000 sin cuadre)

### Requirement: Tarjeta resumen en inicio
La app SHALL mostrar en el inicio una tarjeta resumen con el veredicto, el chip de certeza y la primera acción (los campos `mobile` del pronóstico), SHALL llevar a la pantalla «Caja a 14 días» con un toque y SHALL mantenerla al día con el pronóstico oficial que baja por sincronización y con los cambios locales.

#### Scenario: Qué dice la tarjeta
- **WHEN** la dueña abre el inicio con el pronóstico del caso (ejemplo: caso Carmen, lunes 25 de mayo)
- **THEN** la tarjeta SHALL mostrar el veredicto («No»), el titular «El sábado 30 de mayo te faltan $136.000 para el pago de tus ayudantes.», el chip «Certeza media: 1 dato por confirmar» y la primera acción, «Recordarle a Hotel Brisas el pago de $2.100.000 del jueves 28 de mayo»

#### Scenario: Un toque lleva a la pantalla
- **WHEN** toca la tarjeta
- **THEN** la app SHALL abrir «Caja a 14 días» con el mismo pronóstico, sin esperar la red, y emitir `forecast_viewed` con `origin = home_card`

#### Scenario: La tarjeta se actualiza sola
- **WHEN** baja un pronóstico oficial nuevo o la dueña registra un abono en el teléfono (ejemplo: 300.000 de Minimercado Sol)
- **THEN** la tarjeta SHALL recalcular desde los datos locales sin recargar y, en el ejemplo, su titular SHALL pasar a «El lunes 1 de junio te faltan $1.018.000 para el arriendo de la bodega.»

### Requirement: Legible al sol y usable con una mano
La pantalla SHALL mantener contraste ≥ 7:1 en las parejas donde van cifras, SHALL colocar los controles principales al final de cada tarjeta con objetivos ≥ 48 dp y SHALL NOT depender de gestos ni de información solo por color.

#### Scenario: Contraste verificado
- **WHEN** se calcula el contraste WCAG de las parejas reales de la paleta de Necta (cifras verde y naranja claro sobre azul marino; tinta sobre blanco y sobre lavanda)
- **THEN** todas SHALL superar 7:1, y el botón principal, con texto grande en negrita, SHALL superar 3:1

#### Scenario: Una mano
- **WHEN** se recorre la pantalla
- **THEN** todo SHALL estar en una columna, el botón principal de cada tarjeta SHALL ir al final, la hoja de abono SHALL abrirse desde abajo y ningún objetivo táctil SHALL medir menos de 48 dp

### Requirement: Accesibilidad
La pantalla, la tarjeta resumen y el panel web SHALL poder usarse con lector de pantalla (VoiceOver y TalkBack) y, en la web, con teclado, con etiquetas que lean completas las cifras y los botones; SHALL respetar el tamaño de fuente del sistema sin romper la columna; y SHALL NOT comunicar nada solo con color, además de lo que exige «Legible al sol y usable con una mano».

#### Scenario: Cifras y botones que se leen completos
- **WHEN** el lector de pantalla enfoca «Plata hoy $1.640.000 · $260.000 por confirmar», la barra del sábado 30 o «Escribir por WhatsApp» de la primera acción (ejemplo: caso Carmen)
- **THEN** SHALL leer «Plata hoy: 1.640.000 pesos; 260.000 pesos por confirmar», «sábado 30 de mayo: te faltarían 136.000 pesos» y «Escribir por WhatsApp a Hotel Brisas», y anunciar «Abono guardado» al terminar un abono

#### Scenario: Fuente del sistema al 200 %
- **WHEN** el tamaño de fuente del sistema está al 200 %
- **THEN** el texto SHALL escalar sin recortar el titular ni las cifras, la pantalla SHALL seguir en una columna sin desplazamiento horizontal y los botones SHALL crecer manteniendo al menos 48 dp

#### Scenario: Nada solo por color
- **WHEN** se mira la pantalla en escala de grises
- **THEN** los días en negativo SHALL distinguirse además por el signo «−» y su monto, el veredicto por palabras («No», «Sí, pero justo», «Sí») y la certeza por «alta», «media» o «baja»

#### Scenario: Panel web con teclado
- **WHEN** la dueña recorre el panel web solo con el teclado
- **THEN** los controles SHALL alcanzarse con Tab en orden lógico y con foco visible, y las tres bandas SHALL tener una tabla equivalente para el lector de pantalla

### Requirement: Dónde más ve la respuesta
La app SHALL llevar a la pantalla desde una tarjeta resumen en inicio y tras el aviso de la mañana; la web SHALL mostrar el panel «Caja a 14 días» al iniciar sesión con calendario, dependencias, simulador y cuadre, leyendo el pronóstico de la API y escribiendo a los mismos endpoints idempotentes con un `clientMutationId` generado en el navegador; ambos SHALL leer el mismo pronóstico.

#### Scenario: Panel en la web
- **WHEN** la dueña entra a la web el domingo por la noche
- **THEN** SHALL ver la línea de tiempo de las tres bandas, el muro de 4 días, las dependencias, un simulador que recalcula en el navegador (un cliente se atrasa; agrego un pago; cuadro el saldo) y el cuadre del descuadre; un reintento desde la web con el mismo `clientMutationId` SHALL devolver 200 `replayed`
- **AND** si la misma tienda abre la app, ambas SHALL mostrar el mismo titular, `computedAt` y `rulesVersion`

#### Scenario: Rutas de la web
- **WHEN** la dueña inicia sesión en la web o abre el enlace firmado de un aviso
- **THEN** `/caja` SHALL mostrar el panel y `/caja/compromisos` la lista y el alta de pagos fijos; el enlace firmado SHALL canjearse con `POST /v1/cashflow/links/exchange` por una cookie de solo lectura de 30 minutos y abrir `/caja` solo en lectura (un token inválido, vencido, revocado o de otra tienda SHALL responder `404 not_found` y la web SHALL pedir iniciar sesión), sin sesión SHALL ir al inicio de sesión y volver a la ruta pedida, y sin la bandera SHALL responder 404

#### Scenario: Cuadre y compromisos desde la web
- **WHEN** la dueña toca «Tengo $1.300.000» (ejemplo: caso Carmen) o anota, edita o elimina un pago fijo
- **THEN** la web SHALL llamar `POST /v2/banks/:id/reconcile-quick` con `mode = CONFIRM_STORED_BALANCE`, o `POST`, `PATCH` o `DELETE` en `/v1/cashflow/commitments`, con un `clientMutationId` generado en el navegador, y mostrar el pronóstico recalculado (en el ejemplo, «El lunes 1 de junio te faltan $1.058.000 para el arriendo de la bodega.»); un reintento con el mismo id SHALL devolver 200 `replayed`

#### Scenario: API caída en la web
- **WHEN** `GET /v1/cashflow/forecast` falla después de que el panel ya cargó
- **THEN** la web SHALL conservar en memoria el último pronóstico con «No pudimos actualizar. Estás viendo el pronóstico de las HH:MM.» y un botón para reintentar, SHALL NOT guardar nada en el navegador ni encolar escrituras, y si falla un guardado SHALL decir «No se guardó. Inténtalo de nuevo.» conservando lo escrito
