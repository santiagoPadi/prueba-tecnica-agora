# App · Pantalla «Caja a 14 días» (React Native + Expo)

Una sola pantalla que le responde a Carmen con los datos del caso, pensada para leerse con el sol encima, con una mano y con poca señal, y construida con la identidad visual de Necta (tokens del design system público de `necta-app.com` y las capturas de la app en App Store).

## Correr

```bash
npm install
npx expo start          # «i» para el simulador iOS (Expo Go) · «a» para Android · escanea el QR con Expo Go
npm test                # 66 pruebas: Jest + Testing Library (motor con los datos del caso, outbox, contraste, pantalla)
npm run typecheck       # tsc --noEmit
```

Requiere Node ≥ 22 y Expo SDK 58 (instalado por el scaffold).

## Qué responde

1. **¿Te alcanza?** Tarjeta héroe azul marino: «No» en naranja claro y el titular del motor: *El sábado 30 de mayo te faltan $136.000 para el pago de tus ayudantes.* Debajo, de qué cobro depende el viernes («alcanza solo si Hotel Brisas paga el jue 28 may; sin ese cobro faltarían $1.162.000»), la plata de hoy ($1.640.000, con $260.000 por confirmar) y el muro de 4 días ($6.900.000).
2. **¿Qué tan seguro es?** Tarjeta lavanda con el chip «Certeza media: 1 dato por confirmar»; al tocarla, las razones en lenguaje cotidiano y el enlace «Cuadrar mi caja en un toque ›».
3. **Plata segura día a día:** 14 barras (verde = alcanza, rojo = no) con el punto más bajo (lunes 1, −$1.318.000).
4. **¿Qué hago hoy?** Tres tarjetas de acción como las de «Por cobrar»: Hotel Brisas («Asegura el viernes»), Tienda La Esquina («Puede demorar»), Tienda Doña Fina («Cumplida»), con **Escribir por WhatsApp** (botón naranja de 52 dp, abre `wa.me` con el borrador del motor) y **Registrar cobro ›** (hoja inferior con monto y bolsillito). «Ver las 8 acciones ›» muestra el resto, incluido «Pedirle plazo a tu proveedor principal por si Hotel Brisas no paga».

## Para la calle

- **Una mano:** todo es una columna; los botones van al final de cada tarjeta y la hoja de abono sale desde abajo; objetivos de toque ≥ 48 dp (botones 52 dp).
- **Sol:** cifras siempre ≥ 7:1 sobre la paleta real de Necta (verde y naranja claro sobre azul marino; tinta sobre blanco y sobre lavanda); `__tests__/contrast.test.ts` lo verifica.
- **Poca señal:** interruptor «Simular sin señal» → «Sin señal · pronóstico de las 7:02 a. m.»; un abono registrado sin señal recalcula al instante con **el mismo motor** y queda «Pendiente de sincronizar»; al volver la señal se confirma («Abono guardado»). Un abono mayor al pendiente se rechaza con la misma regla que tendrá el servidor; un 409 deja el ítem en revisión.

## Estructura

```
App.tsx                         carga Manrope (sin bloquear) y monta la pantalla con los datos del caso
src/engine/                     motor determinista (puro, sin IO) + datos de Carmen; el mismo que correría el servidor
src/state/applyPayment.ts       validación y aplicación local de abonos y cuadre (misma regla que el backend)
src/state/forecastReducer.ts    estado confirmado, outbox con clientMutationId y proyección optimista
src/state/useForecast.ts        hook: reducer + sincronización simulada al tener señal
src/theme/tokens.ts             tokens de marca Necta y la paleta de la pantalla
src/components/                 HeroCard, CertaintyCard, DayStrip, ActionCard, RegisterPaymentSheet, StatusBanner, DemoControls, BottomTabs, ui
src/screens/CajaScreen.tsx      la pantalla
__tests__/                      motor (4 archivos), outbox, abonos, contraste, pantalla
```

## Supuestos y límites de la demo
- Los datos vienen de la fixture del caso; en la app real la pantalla lee `GET /v1/cashflow/forecast` y guarda la respuesta y sus entradas compactas en SQLite.
- La outbox vive en memoria y el «servidor» se simula con 0,9 s de espera; en producción la base local y la cola son de PowerSync y cada ítem llega a la API como un `POST` idempotente por el id que generó el cliente (ver `design.md` §5.5 y §9).
- El caso no trae teléfonos: `wa.me/?text=…` abre WhatsApp con el mensaje listo y Carmen elige el contacto.
- La barra inferior es solo visual (Mi diario · Resumen · Registrar · Negocio · Metas), para que la pantalla se vea dentro de la app.
