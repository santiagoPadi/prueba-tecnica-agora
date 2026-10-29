import React from 'react';
import { StyleSheet, View } from 'react-native';
import { formatCOP, type ForecastResponse } from '../engine';
import { useTheme } from '../theme/ThemeContext';
import { space, type } from '../theme/tokens';
import { Card, Txt } from './ui';

const LETTER: Record<string, string> = { mon: 'L', tue: 'M', wed: 'M', thu: 'J', fri: 'V', sat: 'S', sun: 'D' };

/** 14 barras: la plata segura al cierre de cada día. Rojo = ese día no alcanza. */
export function DayStrip({ forecast }: { forecast: ForecastResponse }) {
  const { p } = useTheme();
  const max = Math.max(1, ...forecast.days.map((d) => Math.abs(d.balance.prudente)));
  const worst = forecast.verdict.worstGap;
  return (
    <Card testID="day-strip">
      <Txt weight="bold" size={type.h2}>Plata segura, día a día</Txt>
      <Txt size={type.small} color={p.textMuted}>Lo que te queda al cierre de cada día si solo entran los cobros seguros.</Txt>
      <View style={styles.row}>
        {forecast.days.map((d, i) => {
          const negative = d.balance.prudente < 0;
          const h = Math.max(6, Math.round((Math.abs(d.balance.prudente) / max) * 56));
          const weekday = forecast.operatingRhythm.days[i]?.weekday ?? 'mon';
          return (
            <View key={d.date} style={styles.col} testID={`day-${d.date}`}>
              <View style={styles.barBox}>
                <View style={{ height: h, width: 14, borderRadius: 4, backgroundColor: negative ? p.danger : p.success, alignSelf: 'center' }} />
              </View>
              <Txt weight="bold" size={12} color={negative ? p.danger : p.textMuted} style={{ textAlign: 'center' }}>{LETTER[weekday]}</Txt>
              <Txt size={11} color={negative ? p.danger : p.textFaint} style={{ textAlign: 'center' }}>{Number(d.date.slice(8, 10))}</Txt>
            </View>
          );
        })}
      </View>
      {worst && (
        <Txt size={type.body} color={p.textMuted} style={{ marginTop: space.sm }}>
          El punto más bajo es el {worst.label}: te faltarían {formatCOP(worst.amount)} si no entra más plata.
        </Txt>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md },
  col: { width: 20, alignItems: 'center' },
  barBox: { height: 60, justifyContent: 'flex-end' },
});
