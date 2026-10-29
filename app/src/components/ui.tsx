import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, space, tap, type } from '../theme/tokens';

type Weight = 'regular' | 'semibold' | 'bold' | 'extrabold';

export function Txt({ children, weight = 'regular', size = type.body, color, style, testID, numberOfLines, fit }: {
  children: React.ReactNode; weight?: Weight; size?: number; color?: string; style?: StyleProp<TextStyle>; testID?: string; numberOfLines?: number;
  /** Una sola línea: encoge la fuente hasta el 70 % antes de partir una cifra. */
  fit?: boolean;
}) {
  const { p, f } = useTheme();
  return (
    <Text
      testID={testID}
      numberOfLines={fit ? 1 : numberOfLines}
      adjustsFontSizeToFit={fit}
      minimumFontScale={fit ? 0.7 : undefined}
      style={[{ fontFamily: f(weight), fontSize: size, lineHeight: Math.round(size * 1.3), color: color ?? p.text }, style]}
    >
      {children}
    </Text>
  );
}

export function Card({ children, style, testID, tone = 'white' }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string; tone?: 'white' | 'info' | 'hero' }) {
  const { p } = useTheme();
  const bg = tone === 'hero' ? p.hero : tone === 'info' ? p.info : p.card;
  return (
    <View testID={testID} style={[styles.card, { backgroundColor: bg }, style]}>
      {children}
    </View>
  );
}

export function Pill({ label, tone = 'info', testID }: { label: string; tone?: 'info' | 'danger' | 'success' | 'warn' | 'dark'; testID?: string }) {
  const { p } = useTheme();
  const map = {
    info: { bg: p.card, fg: p.infoAccent, border: p.infoAccent },
    danger: { bg: p.dangerSoft, fg: p.danger, border: p.danger },
    success: { bg: p.successSoft, fg: p.success, border: p.success },
    warn: { bg: p.warnSoft, fg: p.warn, border: p.warn },
    dark: { bg: p.hero, fg: p.heroText, border: p.hero },
  } as const;
  const c = map[tone];
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Txt weight="bold" size={type.small} color={c.fg}>{label}</Txt>
    </View>
  );
}

export function BigButton({ label, onPress, testID, variant = 'primary' }: { label: string; onPress: () => void; testID?: string; variant?: 'primary' | 'ghost' }) {
  const { p } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: primary ? p.primaryBtn : 'transparent', borderColor: primary ? p.primaryBtn : p.link, opacity: pressed ? 0.85 : 1 }]}
    >
      <Txt weight="bold" size={type.body} color={primary ? p.primaryBtnText : p.link}>{label}</Txt>
    </Pressable>
  );
}

export function LinkRow({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  const { p } = useTheme();
  return (
    <Pressable testID={testID} accessibilityRole="link" onPress={onPress} hitSlop={8} style={styles.link}>
      <Txt weight="bold" size={type.body} color={p.link}>{label} ›</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: space.lg, marginBottom: space.md, shadowColor: '#12163E', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  button: { minHeight: tap.button, borderRadius: radius.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  link: { minHeight: tap.min, justifyContent: 'center' },
});
