import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatHour } from '../lib/time';
import { useTheme } from '../theme/ThemeContext';
import { radius, space, type } from '../theme/tokens';
import { Txt } from './ui';

export function StatusBanner({ online, confirmedAt, pending, conflicts, message }: { online: boolean; confirmedAt: Date; pending: number; conflicts: number; message: string | null }) {
  const { p } = useTheme();
  if (online && pending === 0 && conflicts === 0 && !message) return null;
  return (
    <View style={styles.wrap} testID="status-banner">
      {!online && (
        <View style={[styles.row, { backgroundColor: p.hero }]}>
          <Txt weight="bold" size={type.small} color={p.heroText}>Sin señal · pronóstico de las {formatHour(confirmedAt)}</Txt>
        </View>
      )}
      {pending > 0 && (
        <View style={[styles.row, { backgroundColor: p.warnSoft, borderColor: p.warn, borderWidth: 1 }]}>
          <Txt weight="bold" size={type.small} color={p.warn}>Pendiente de sincronizar · {pending} {pending === 1 ? 'movimiento' : 'movimientos'}</Txt>
        </View>
      )}
      {conflicts > 0 && (
        <View style={[styles.row, { backgroundColor: p.dangerSoft, borderColor: p.danger, borderWidth: 1 }]}>
          <Txt weight="bold" size={type.small} color={p.danger}>Un abono necesita revisión: ya había otro registrado desde la web</Txt>
        </View>
      )}
      {online && message && (
        <View style={[styles.row, { backgroundColor: p.successSoft, borderColor: p.success, borderWidth: 1 }]}>
          <Txt weight="bold" size={type.small} color={p.success}>{message}</Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: space.md, gap: space.sm },
  row: { borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: 10, alignSelf: 'flex-start' },
});
