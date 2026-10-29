/**
 * Tokens de marca de Necta, tomados del design system público de necta-app.com
 * (variables --color-primary-*, --color-secondary-*, --color-success-*, --color-danger-*,
 * --color-app-surface) y de las capturas de la app en App Store: fondo lavanda, tarjeta
 * héroe azul marino con cifra verde, naranja para la acción principal, chips lavanda.
 */
export const brand = {
  surface: '#F6F4F9',      // --color-app-surface
  white: '#FFFFFF',
  navy: '#12163E',         // secondary-900: tarjeta héroe
  navyInner: '#22264A',    // paneles dentro de la tarjeta héroe
  navyLine: '#2E3358',
  ink: '#1F1F21',          // texto base
  inkMuted: '#666666',     // gray-700
  inkFaint: '#999999',     // gray-500
  line: '#E9E4F2',
  lavender: '#EAEAF6',     // secondary-100: tarjetas informativas y chips
  lavenderDeep: '#D5DFF3', // secondary-200
  indigo: '#4147A4',       // secondary-500: texto sobre lavanda
  indigoDeep: '#2B2F62',   // secondary-700
  orange: '#F26938',       // primary-500: botón principal, enlaces
  orangeDeep: '#E15D2F',   // primary-700
  orangeSoft: '#FFE7D1',   // primary-100
  orangeLight: '#FCAD75',  // primary-300: cifras negativas sobre azul marino
  green: '#238E45',        // success-500
  greenBright: '#49E68C',  // success-300: cifras positivas sobre azul marino
  greenSoft: '#D7F5E1',
  red: '#E23F24',          // danger-500
  redSoft: '#FDE3DE',
  amber: '#B45309',        // ámbar legible sobre claro (la web usa #EFB732 solo en fondos oscuros)
  amberSoft: '#FFF3C4',
} as const;

/** Paleta de la pantalla: la identidad de Necta con contraste ≥ 7:1 en todo lo que lleva cifras. */
export const palette = {
  bg: brand.surface,
  card: brand.white,
  cardBorder: brand.line,
  text: brand.ink,
  textMuted: brand.inkMuted,
  textFaint: brand.inkFaint,
  hero: brand.navy,
  heroInner: brand.navyInner,
  heroText: brand.white,
  heroMuted: '#C9CBE0',
  positive: brand.greenBright,
  negative: brand.orangeLight,
  info: brand.lavender,
  infoText: brand.indigoDeep,
  infoAccent: brand.indigo,
  primaryBtn: brand.orange,
  primaryBtnText: brand.white,
  link: brand.orange,
  danger: brand.red,
  dangerSoft: brand.redSoft,
  success: brand.green,
  successSoft: brand.greenSoft,
  warn: brand.amber,
  warnSoft: brand.amberSoft,
} as const;
export type Palette = typeof palette;

export const font = {
  regular: 'Manrope_400Regular',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
} as const;

export const radius = { pill: 999, card: 20, inner: 14, chip: 10 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
/** Objetivos de toque: 48 dp mínimo (contexto del caso), 52 dp en botones principales. */
export const tap = { min: 48, button: 52 } as const;
export const type = { hero: 38, title: 28, h2: 20, body: 16, small: 14, amount: 24 } as const;
