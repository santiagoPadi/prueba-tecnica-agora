import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { formatCOP, type ForecastInput } from '../engine';
import { useTheme } from '../theme/ThemeContext';
import { radius, space, tap, type } from '../theme/tokens';
import { BigButton, Txt } from './ui';

export function RegisterPaymentSheet({ input, receivableId, onSave, onClose }: {
  input: ForecastInput; receivableId: string | null; onSave: (payment: { receivableId: string; bankId: string; amount: number }) => string | null; onClose: () => void;
}) {
  const { p, f } = useTheme();
  const [amount, setAmount] = useState('');
  const [bankId, setBankId] = useState(input.pockets[0]?.bankId ?? 'bank_caja');
  const [error, setError] = useState<string | null>(null);
  const receivable = input.receivables.find((r) => r.id === receivableId);
  if (!receivable) return null;

  const save = () => {
    const value = Number(amount.replace(/\D/g, ''));
    const err = onSave({ receivableId: receivable.id, bankId, amount: value });
    if (err) setError(err);
    else { setAmount(''); setError(null); onClose(); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <View style={[styles.sheet, { backgroundColor: p.card }]} testID="payment-sheet">
        <View style={styles.handle} />
        <Txt weight="bold" size={type.h2}>Registrar cobro de {receivable.counterpartyName}</Txt>
        <Txt size={type.small} color={p.textMuted}>Te deben {formatCOP(receivable.pendingAmount)}. Anota lo que te pagaron hoy.</Txt>
        <TextInput
          testID="payment-amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          placeholder="Monto"
          placeholderTextColor={p.textFaint}
          style={[styles.input, { borderColor: error ? p.danger : p.cardBorder, color: p.text, fontFamily: f('bold') }]}
        />
        <View style={styles.pockets}>
          {input.pockets.map((pk) => {
            const selected = pk.bankId === bankId;
            return (
              <Pressable key={pk.bankId} testID={`pocket-${pk.bankId}`} accessibilityRole="button" onPress={() => setBankId(pk.bankId)} style={[styles.pocket, { backgroundColor: selected ? p.hero : p.info, borderColor: selected ? p.hero : p.cardBorder }]}>
                <Txt weight="bold" size={type.body} color={selected ? p.heroText : p.infoText}>{pk.name}</Txt>
              </Pressable>
            );
          })}
        </View>
        {error && <Txt weight="semibold" size={type.small} color={p.danger} testID="payment-error">{error}</Txt>}
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <BigButton label="Guardar abono" onPress={save} testID="payment-save" />
          <BigButton label="Cancelar" onPress={onClose} variant="ghost" testID="payment-cancel" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(18,22,62,0.45)' },
  sheet: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: space.xl, paddingBottom: 40, gap: space.sm },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: '#D9D9D9', marginBottom: space.sm },
  input: { minHeight: tap.button, borderWidth: 1.5, borderRadius: radius.inner, paddingHorizontal: space.lg, fontSize: 22, marginTop: space.sm },
  pockets: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  pocket: { minHeight: tap.min, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1.5, justifyContent: 'center' },
});
