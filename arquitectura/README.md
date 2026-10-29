# Diagrama de arquitectura · «Caja a 14 días»

Un solo diagrama, en Excalidraw, con todo el flujo: qué corre en el teléfono, en la web y en el servidor; PowerSync como capa de sincronización; los datos; las integraciones; qué pasa cuando algo falla; y el recorrido de un abono registrado sin señal. Acompaña a `design.md` (§1, §2, §5.5 y §9), donde cada zona se explica con sus decisiones.

| Archivo | Para qué |
| :--- | :--- |
| `caja-a-14-dias.excalidraw` | Fuente editable. Abrir en [excalidraw.com](https://excalidraw.com) (menú → *Open*) o en la extensión de VS Code. |
| `caja-a-14-dias.svg` | Vectorial, para incrustar en documentos o en el video. |
| `caja-a-14-dias.png` | Exportación a 2× (3200 × 3000) para mostrar en pantalla. |
| `mcp-elements.json` | Los mismos elementos en el formato que consume el MCP de Excalidraw (`create_view`), por si se quiere volver a dibujar en una conversación. |

## Cómo leerlo

- **Borde verde continuo ✓:** prototipo existente (`app/`: motor compartido y pantalla, con pruebas Jest y verificado en el simulador iOS). El prototipo simula la cola de sincronización en memoria; el diagrama lo dice en cada caja afectada.
- **Borde gris punteado:** por construir según el plan OpenSpec (`design.md` y `tasks.md`). Backend, PowerSync, web y avisos no existen todavía: están especificados sus contratos, sync rules, colecciones, jobs y fallas.
- **Zonas:** Teléfono (azul), Web (morado), Servidor con el PowerSync Service (verde), Datos (verde agua), Integraciones externas (naranja), Flujo sin señal (amarillo) y Fallas y respuesta (rojo).
- **Flechas:** verde = subida de escrituras desde la app (`uploadData` → API); azul punteado = bajada de datos (change streams de MongoDB → PowerSync → SQLite local) y lectura del pronóstico; naranja = avisos; gris punteado = por construir.

## Qué muestra, en una frase por zona

- **Teléfono:** la pantalla, el estado optimista, el motor compartido, la SQLite local gestionada por PowerSync (tablas de la tienda), la cola de escrituras con ids generados en el cliente, `uploadData` hacia la API y las salidas (WhatsApp, deep links, push). PowerSync solo vive aquí.
- **Web:** panel de tres bandas con muro y dependencias, simulador que corre el mismo motor en el navegador sobre la respuesta del `GET`; sin datos locales ni PowerSync.
- **Servidor:** API con token/cookie y `x-client-platform`; `GET/POST /v1/cashflow/forecast`; abonos idempotentes por el id del cliente (`clientMutationId`); cuadre rápido; compromisos; el mismo motor como respuesta oficial; orquestador de avisos; jobs (nocturno, eventos, backtesting); idempotencia y conflictos; señal de otras tiendas con K ≥ 3; y el PowerSync Service (cloud o propio) que lee los change streams de MongoDB y replica a cada tienda su bucket.
- **Datos:** MongoDB Atlas (replica set con post-images) con las colecciones existentes y las nuevas (`CashflowForecastSnapshot`, `MutationReceipt`, `CashCommitment`, perfiles y `ForecastIssued`).
- **Integraciones:** Expo Push (ticket → recibo), mensajería de Necta (WhatsApp con plantilla aprobada, correo) y voz (`extract-schema`, con confirmación).
- **Flujo sin señal:** los siete pasos de un abono de $300.000 de Hotel Brisas, desde la hoja de abono hasta «Abono guardado» o la revisión local ante un 409, sin bloquear la cola.
- **Fallas:** sin señal, reenvío de la cola tras cerrar la app, mismo id con otro contenido, abono mayor al pendiente, push no entregado, snapshot sucio, cola de jobs caída, voz sin créditos, PowerSync caído, JWT vencido o stream atrasado, sync rules incompletas y celular nuevo; con la respuesta del sistema en cada caso.

El diagrama se generó con un script de apoyo (no incluido en el repo) para que las cajas, las flechas y el archivo Excalidraw salgan de una sola fuente y no se desalineen al editar.
