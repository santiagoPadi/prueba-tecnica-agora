import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatCOP, formatDayShort, type RecommendedAction } from '../engine';
import { useTheme } from '../theme/ThemeContext';
import { space, type } from '../theme/tokens';
import { BigButton, Card, LinkRow, Pill, Txt } from './ui';

function badge(a: RecommendedAction, hingeNames: string[]): { label: string; tone: 'info' | 'danger' | 'success' | 'warn' } {
  if (a.type === 'abono-parcial') return { label: 'Vencida', tone: 'danger' };
  if (a.type === 'pedir-plazo') return { label: 'Por si acaso', tone: 'info' };
  if (a.type === 'confirmar-saldo') return { label: 'Un toque', tone: 'info' };
  if (a.type === 'confirmar-fecha') return { label: 'Cliente nuevo', tone: 'warn' };
  if (a.type === 'confirmar-compromiso') return { label: 'Por confirmar', tone: 'warn' };
  if (a.counterpartyName && hingeNames.includes(a.counterpartyName)) return { label: 'Asegura el viernes', tone: 'info' };
  if (a.factors.probability >= 0.8) return { label: 'Cumplida', tone: 'success' };
  return { label: 'Puede demorar', tone: 'warn' };
}

export function ActionCard({ action, hingeNames, onWhatsApp, onRegister, onReconcile }: {
  action: RecommendedAction; hingeNames: string[]; onWhatsApp: (a: RecommendedAction) => void; onRegister: (a: RecommendedAction) => void; onReconcile: () => void;
}) {
  const { p } = useTheme();
  const b = badge(action, hingeNames);
  const isReceivable = action.type === 'cobrar' || action.type === 'abono-parcial' || action.type === 'confirmar-fecha';
  const amountLabel = isReceivable ? (action.type === 'abono-parcial' ? 'Pide al menos' : 'Te deben') : action.type === 'pedir-plazo' ? 'Pago del viernes' : 'Sin cuadrar';
  return (
    <Card testID={`action-${action.rank}`}>
      <View style={styles.head}>
        <Txt weight="bold" size={type.h2} style={{ flex: 1, marginRight: space.sm }} numberOfLines={2}>
          {action.rank}. {action.counterpartyName ?? 'Tu caja'}
        </Txt>
        <Pill label={b.label} tone={b.tone} />
      </View>
      <Txt size={type.small} color={p.textMuted} style={{ marginTop: space.sm }}>{amountLabel}</Txt>
      <Txt weight="extrabold" size={type.amount}>{formatCOP(action.amount)}</Txt>
      <Txt size={type.body} color={p.textMuted} style={{ marginTop: space.sm }}>{action.why}</Txt>
      <Txt weight="semibold" size={type.body} style={{ marginTop: space.sm }}>{action.effect}</Txt>
      <View style={styles.footer}>
        <Txt size={type.small} color={p.textMuted}>Antes del {formatDayShort(action.deadline)}</Txt>
      </View>
      <View style={{ marginTop: space.md, gap: space.sm }}>
        {action.channel === 'whatsapp' ? (
          <BigButton label="Escribir por WhatsApp" onPress={() => onWhatsApp(action)} testID={`whatsapp-${action.rank}`} />
        ) : (
          <BigButton label="Cuadrar en un toque" onPress={onReconcile} testID={`reconcile-${action.rank}`} />
        )}
        {isReceivable && <LinkRow label="Registrar cobro" onPress={() => onRegister(action)} testID={`register-${action.refId ?? action.rank}`} />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  footer: { marginTop: space.sm, borderTopWidth: 1, borderTopColor: '#E9E4F2', paddingTop: space.sm },
});
