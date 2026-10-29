import React from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { brand, space, tap, type } from '../theme/tokens';
import { Txt } from './ui';

/** Control de demostración: simular «sin señal» para ver la cola y el recálculo local. */
export function DemoControls({ online, onOnline }: { online: boolean; onOnline: (v: boolean) => void }) {
  const { p } = useTheme();
  return (
    <View style={styles.row}>
      <Pressable style={styles.switchRow} accessibilityRole="switch" accessibilityState={{ checked: !online }} onPress={() => onOnline(!online)} testID="demo-offline-row">
        <Switch testID="demo-offline" value={!online} onValueChange={(v) => onOnline(!v)} trackColor={{ true: brand.navy, false: '#D9D9D9' }} />
        <Txt weight="semibold" size={type.small} color={p.textMuted}>Simular sin señal</Txt>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: tap.min },
});
