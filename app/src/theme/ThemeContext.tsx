import React, { createContext, useContext, useMemo } from 'react';
import { font, palette, type Palette } from './tokens';

type Weight = keyof typeof font;
interface Theme {
  p: Palette;
  /** Familia tipográfica Manrope si ya cargó; si no, la del sistema (nunca bloqueamos la pantalla). */
  f: (weight: Weight) => string | undefined;
}

const ThemeCtx = createContext<Theme>({ p: palette, f: () => undefined });

export function ThemeProvider({ fontsReady, children }: { fontsReady: boolean; children: React.ReactNode }) {
  const value = useMemo<Theme>(() => ({ p: palette, f: (w) => (fontsReady ? font[w] : undefined) }), [fontsReady]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeCtx);
}
