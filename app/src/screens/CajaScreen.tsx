import React, { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionCard } from '../components/ActionCard';
import { BottomTabs } from '../components/BottomTabs';
import { CertaintyCard } from '../components/CertaintyCard';
import { DayStrip } from '../components/DayStrip';
import { DemoControls } from '../components/DemoControls';
import { HeroCard } from '../components/HeroCard';
import { RegisterPaymentSheet } from '../components/RegisterPaymentSheet';
import { StatusBanner } from '../components/StatusBanner';
import { LinkRow, Txt } from '../components/ui';
import { formatDayShort, RULES, type ForecastInput, type RecommendedAction } from '../engine';
import { newMutationId } from '../lib/time';
import { buildWhatsAppLink } from '../lib/whatsapp';
import { validateMutation } from '../state/applyPayment';
import { projectedInput } from '../state/forecastReducer';
import { useForecast } from '../state/useForecast';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { space, type } from '../theme/tokens';

export interface CajaScreenProps {
  input: ForecastInput;
  confirmedAt: Date;
  fontsReady?: boolean;
  startOnline?: boolean;
  openUrl?: (url: string) => void;
}

/** Pantalla «Caja a 14 días»: una sola vista, pensada para leerse al sol, con una mano y con poca señal. */
export function CajaScreen(props: CajaScreenProps) {
  const { state, forecast, dispatch, pending, enqueue } = useForecast(props.input, props.confirmedAt, props.startOnline ?? true);
  return (
    <ThemeProvider fontsReady={props.fontsReady ?? false}>
      <Body {...props} state={state} forecast={forecast} dispatch={dispatch} pending={pending} enqueue={enqueue} />
    </ThemeProvider>
  );
}

type BodyProps = CajaScreenProps & ReturnType<typeof useForecast>;

function Body({ state, forecast, dispatch, pending, enqueue, openUrl }: BodyProps) {
  const { p } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const [registerFor, setRegisterFor] = useState<string | null>(null);
  const input = useMemo(() => projectedInput(state), [state]);
  const actions = showAll ? forecast.actions : forecast.actions.slice(0, RULES.maxMobileActions);
  const hingeNames = forecast.verdict.hinges.map((h) => h.counterpartyName);
  const conflicts = state.outbox.filter((o) => o.status === 'conflicto').length;
  const open = openUrl ?? ((url: string) => { void Linking.openURL(url); });

  const onWhatsApp = (a: RecommendedAction) => open(buildWhatsAppLink(null, a.whatsappDraft ?? a.title));
  const onRegister = (a: RecommendedAction) => setRegisterFor(a.refId);
  const onReconcile = () => enqueue({ kind: 'reconcile', clientMutationId: newMutationId(), bankId: 'bank_caja', mode: 'CONFIRM_STORED_BALANCE', clientTimestamp: new Date().toISOString() });
  const onSavePayment = (pay: { receivableId: string; bankId: string; amount: number }): string | null => {
    const mutation = { kind: 'payment' as const, clientMutationId: newMutationId(), receivableId: pay.receivableId, bankId: pay.bankId, amount: pay.amount, paymentDate: forecast.asOf, clientTimestamp: new Date().toISOString() };
    const error = validateMutation(input, mutation);
    if (error) return error;
    enqueue(mutation);
    return null;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: p.bg }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} testID="caja-scroll">
        <Txt weight="semibold" size={type.small} color={p.textMuted}>‹ Mi diario</Txt>
        <Txt weight="extrabold" size={type.title} style={{ marginTop: 2 }}>Caja a 14 días</Txt>
        <Txt size={type.body} color={p.textMuted} style={{ marginBottom: space.md }}>
          Si te alcanza para lo que debes pagar, del {formatDayShort(forecast.horizonStart)} al {formatDayShort(forecast.horizonEnd)}.
        </Txt>
        <DemoControls online={state.online} onOnline={(v) => dispatch({ type: 'SET_ONLINE', online: v })} />
        <StatusBanner online={state.online} confirmedAt={state.confirmedAt} pending={pending} conflicts={conflicts} message={state.lastSyncMessage} />
        <HeroCard forecast={forecast} />
        <CertaintyCard forecast={forecast} onReconcile={onReconcile} />
        <DayStrip forecast={forecast} />
        <View style={styles.sectionHead}>
          <Txt weight="extrabold" size={type.h2}>¿Qué hago hoy?</Txt>
          <Txt size={type.small} color={p.textMuted}>{actions.length} de {forecast.actions.length}</Txt>
        </View>
        {actions.map((a) => (
          <ActionCard key={a.rank} action={a} hingeNames={hingeNames} onWhatsApp={onWhatsApp} onRegister={onRegister} onReconcile={onReconcile} />
        ))}
        <LinkRow label={showAll ? 'Ver solo las 3 primeras' : `Ver las ${forecast.actions.length} acciones`} onPress={() => setShowAll((v) => !v)} testID="toggle-all-actions" />
        <Txt size={12} color={p.textFaint} style={{ marginTop: space.md }}>Reglas {forecast.rulesVersion} · calculado en tu celular con los mismos pasos que el servidor.</Txt>
      </ScrollView>
      <BottomTabs />
      {registerFor && <RegisterPaymentSheet input={input} receivableId={registerFor} onSave={onSavePayment} onClose={() => setRegisterFor(null)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: space.lg, paddingBottom: 96 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: space.sm, marginBottom: space.md },
});
