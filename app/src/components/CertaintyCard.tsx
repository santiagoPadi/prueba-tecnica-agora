import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { ForecastResponse } from '../engine';
import { useTheme } from '../theme/ThemeContext';
import { space, tap, type } from '../theme/tokens';
import { Card, LinkRow, Pill, Txt } from './ui';

export function CertaintyCard({ forecast, onReconcile }: { forecast: ForecastResponse; onReconcile: () => void }) {
  const { p } = useTheme();
  const [open, setOpen] = useState(false);
  const c = forecast.certainty;
  const tone = c.level === 'alta' ? 'success' : c.level === 'media' ? 'warn' : 'danger';
  const hasDelta = c.factors.some((f) => f.code === 'descuadre');
  return (
    <Card tone="info" testID="certainty-card">
      <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={styles.head} testID="certainty-toggle">
        <View style={{ flex: 1 }}>
          <Txt weight="semibold" size={type.small} color={p.infoText}>¿Qué tan seguro es este cálculo?</Txt>
          <View style={{ marginTop: 6 }}><Pill label={forecast.mobile.certainty} tone={tone} /></View>
        </View>
        <Txt weight="bold" size={type.h2} color={p.infoAccent}>{open ? '–' : '+'}</Txt>
      </Pressable>
      {open && (
        <View style={{ marginTop: space.md, gap: 6 }}>
          {c.factors.map((f) => (
            <Txt key={f.code} size={type.body} color={p.infoText}>• {f.label}</Txt>
          ))}
          {c.ifConfirmed && <Txt weight="semibold" size={type.body} color={p.infoText} style={{ marginTop: 4 }}>{c.ifConfirmed.note}</Txt>}
        </View>
      )}
      {hasDelta && <LinkRow label="Cuadrar mi caja en un toque" onPress={onReconcile} testID="reconcile-link" />}
    </Card>
  );
}

const styles = StyleSheet.create({ head: { flexDirection: 'row', alignItems: 'center', minHeight: tap.min } });
