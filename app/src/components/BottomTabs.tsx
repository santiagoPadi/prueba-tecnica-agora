import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { brand } from '../theme/tokens';
import { Txt } from './ui';

/** Barra inferior de la app (solo visual): Mi diario · Resumen · Registrar · Negocio · Metas. */
export function BottomTabs() {
  const { p } = useTheme();
  const items = [
    { key: 'diario', label: 'Mi diario', glyph: '▤', active: true },
    { key: 'resumen', label: 'Resumen', glyph: '▥', active: false },
    { key: 'registrar', label: 'Registrar', glyph: '+', active: false, fab: true },
    { key: 'negocio', label: 'Negocio', glyph: '⌂', active: false },
    { key: 'metas', label: 'Metas', glyph: '⚑', active: false },
  ];
  return (
    <View style={[styles.bar, { backgroundColor: p.card, borderTopColor: p.cardBorder }]} testID="bottom-tabs">
      {items.map((it) => (
        <View key={it.key} style={styles.item}>
          {it.fab ? (
            <View style={styles.fab}><Txt weight="bold" size={26} color={brand.white}>+</Txt></View>
          ) : (
            <Txt size={20} color={it.active ? p.text : p.textFaint}>{it.glyph}</Txt>
          )}
          <Txt weight={it.active ? 'bold' : 'semibold'} size={11} color={it.active ? p.text : p.textFaint}>{it.label}</Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', borderTopWidth: 1, paddingTop: 8, paddingBottom: 6, paddingHorizontal: 8 },
  item: { alignItems: 'center', minWidth: 56, gap: 2 },
  fab: { width: 52, height: 52, borderRadius: 26, backgroundColor: brand.orange, alignItems: 'center', justifyContent: 'center', marginTop: -26, shadowColor: brand.orange, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
});
