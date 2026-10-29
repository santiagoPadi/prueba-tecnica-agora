import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatCOP, formatDayShort, type ForecastResponse } from '../engine';
import { useTheme } from '../theme/ThemeContext';
import { radius, space, type } from '../theme/tokens';
import { Card, Txt } from './ui';

function answerFor(status: ForecastResponse['verdict']['status']): { word: string; tone: 'negative' | 'warn' | 'positive' } {
  if (status === 'faltante') return { word: 'No', tone: 'negative' };
  if (status === 'ajustado') return { word: 'Sí, pero justo', tone: 'warn' };
  return { word: 'Sí', tone: 'positive' };
}

export function HeroCard({ forecast }: { forecast: ForecastResponse }) {
  const { p } = useTheme();
  const answer = answerFor(forecast.verdict.status);
  const answerColor = answer.tone === 'positive' ? p.positive : answer.tone === 'warn' ? '#FFD166' : p.negative;
  const ob = forecast.openingBalance;
  const wall = forecast.verdict.criticalWindow;
  const hinge = forecast.verdict.hinges[0];
  return (
    <Card tone="hero" testID="hero-card">
      <Txt weight="semibold" size={type.small} color={p.heroMuted}>¿Te alcanza para lo que debes pagar?</Txt>
      <Txt weight="extrabold" size={type.hero} color={answerColor} testID="hero-answer" style={{ marginTop: 2 }}>{answer.word}</Txt>
      <Txt weight="bold" size={type.h2} color={p.heroText} testID="hero-headline" style={{ marginTop: space.sm }}>{forecast.verdict.headline}</Txt>
      {hinge && (
        <View style={[styles.hinge, { backgroundColor: p.heroInner }]}>
          <Txt weight="semibold" size={type.small} color={p.heroMuted}>Depende de un cobro</Txt>
          <Txt weight="bold" size={type.body} color={p.heroText}>
            El {hinge.label} alcanza solo si {hinge.counterpartyName} paga el {formatDayShort(hinge.countedDate)}; sin ese cobro faltarían {formatCOP(-hinge.balanceWithout)}.
          </Txt>
        </View>
      )}
      <View style={styles.panels}>
        <View style={[styles.panel, { backgroundColor: p.heroInner }]}>
          <Txt weight="semibold" size={type.small} color={p.heroMuted}>Plata hoy</Txt>
          <Txt weight="extrabold" size={type.amount} color={p.positive} fit>{formatCOP(ob.opening.prudente)}</Txt>
          {ob.alignmentDelta !== 0 && <Txt weight="semibold" size={type.small} color={p.heroMuted}>{formatCOP(Math.abs(ob.alignmentDelta))} por confirmar</Txt>}
        </View>
        {wall && (
          <View style={[styles.panel, { backgroundColor: p.heroInner }]}>
            <Txt weight="semibold" size={type.small} color={p.heroMuted}>Sale en 4 días</Txt>
            <Txt weight="extrabold" size={type.amount} color={p.negative} fit>{formatCOP(wall.outflows)}</Txt>
            <Txt weight="semibold" size={type.small} color={p.heroMuted}>{formatDayShort(wall.from)} – {formatDayShort(wall.to)}</Txt>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  hinge: { marginTop: space.md, borderRadius: radius.inner, padding: space.md },
  panels: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  panel: { flex: 1, borderRadius: radius.inner, padding: space.md },
});
