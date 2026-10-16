// ערכת רכיבים — כל המסכים בנויים מזה
import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT, R, SP, FONT } from '../lib/theme';
import Icon from './Icon';

const tap = () => { try { Haptics.selectionAsync(); } catch {} };

export function T({ style, v = 'body', c, children, ...p }) {
  const t = useT();
  return <Text style={[FONT[v], { color: c ? t[c] || c : t.ink, writingDirection: 'rtl' }, style]} {...p}>{children}</Text>;
}

export function Card({ style, children, tone, onPress }) {
  const t = useT();
  const bg = tone === 'navy' ? t.navy : tone === 'gold' ? t.goldSoft : tone === 'warn' ? t.warnSoft
    : tone === 'ok' ? t.okSoft : tone === 'sunk' ? t.sunk : t.surface;
  const body = (
    <View style={[{ backgroundColor: bg, borderRadius: R.lg, padding: SP.lg,
      borderWidth: tone ? 0 : StyleSheet.hairlineWidth, borderColor: t.hair }, style]}>
      {children}
    </View>
  );
  return onPress ? <Pressable onPress={() => { tap(); onPress(); }}>{body}</Pressable> : body;
}

export function Btn({ title, onPress, kind = 'primary', icon, style, disabled, small }) {
  const t = useT();
  const bg = kind === 'primary' ? t.navy : kind === 'gold' ? t.gold : kind === 'ok' ? t.ok
    : kind === 'danger' ? t.bad : 'transparent';
  const fg = kind === 'ghost' || kind === 'line' ? t.ink : kind === 'primary' ? t.onNavy : '#FFFFFF';
  return (
    <Pressable disabled={disabled} onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => [{
        backgroundColor: bg, borderRadius: R.pill,
        paddingVertical: small ? 9 : 15, paddingHorizontal: small ? 14 : 22,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: kind === 'line' ? 1.5 : 0, borderColor: t.hair,
        opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}>
      {icon && <Icon name={icon} size={small ? 16 : 20} color={fg} />}
      <Text style={{ color: fg, fontSize: small ? 14 : 17, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

export function IconBtn({ name, onPress, size = 40, tone }) {
  const t = useT();
  return (
    <Pressable onPress={() => { tap(); onPress?.(); }} hitSlop={8}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: tone === 'sunk' ? t.sunk : 'transparent', opacity: pressed ? 0.6 : 1 })}>
      <Icon name={name} size={size * 0.5} />
    </Pressable>
  );
}

export function Check({ label, checked, onPress, sub, right }) {
  const t = useT();
  return (
    <Pressable onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: SP.md,
        paddingVertical: SP.md, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 26, height: 26, borderRadius: 9, borderWidth: 2,
        borderColor: checked ? t.ok : t.faint, backgroundColor: checked ? t.ok : 'transparent',
        alignItems: 'center', justifyContent: 'center' }}>
        {checked && <Icon name="check" size={16} color="#fff" stroke={3} />}
      </View>
      <View style={{ flex: 1 }}>
        <T v="body" style={checked ? { color: t.faint, textDecorationLine: 'line-through' } : null}>{label}</T>
        {!!sub && <T v="small" c="sub">{sub}</T>}
      </View>
      {right}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, tone }) {
  const t = useT();
  const bg = active ? t.navy : tone === 'warn' ? t.warnSoft : tone === 'ok' ? t.okSoft : t.sunk;
  const fg = active ? t.onNavy : tone === 'warn' ? t.warn : tone === 'ok' ? t.ok : t.ink;
  return (
    <Pressable onPress={() => { tap(); onPress?.(); }}
      style={{ backgroundColor: bg, borderRadius: R.pill, paddingVertical: 7, paddingHorizontal: 13 }}>
      <Text style={{ color: fg, fontSize: 14, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ value, onChangeText, placeholder, multiline, style, keyboardType, autoFocus, onSubmitEditing }) {
  const t = useT();
  return (
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={t.faint} multiline={multiline} keyboardType={keyboardType}
      autoFocus={autoFocus} onSubmitEditing={onSubmitEditing}
      style={[{ backgroundColor: t.sunk, color: t.ink, borderRadius: R.md, paddingHorizontal: SP.lg,
        paddingVertical: 12, fontSize: 16, textAlign: 'right', writingDirection: 'rtl',
        minHeight: multiline ? 96 : undefined, textAlignVertical: multiline ? 'top' : 'center' }, style]} />
  );
}

/** טבעת התקדמות — p בין 0 ל-1 */
export function Ring({ size = 220, p = 0, stroke = 10, color, children }) {
  const t = useT();
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, p));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.ring} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color || t.gold} strokeWidth={stroke} fill="none"
          strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - clamped)} strokeLinecap="round" />
      </Svg>
      {children}
    </View>
  );
}

export function Section({ title, children, style, right }) {
  return (
    <View style={[{ marginTop: SP.xl }, style]}>
      {!!title && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm, paddingHorizontal: 4 }}>
          <T v="tiny" c="sub">{title}</T>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export function Divider() {
  const t = useT();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.hair, marginVertical: 2 }} />;
}

/** גיליון תחתון */
export function Sheet({ visible, onClose, title, children }) {
  const t = useT();
  const ins = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(8,12,24,0.45)' }} onPress={onClose} />
      <View style={{ backgroundColor: t.bg, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
        maxHeight: '88%', paddingBottom: ins.bottom + SP.lg }}>
        <View style={{ alignItems: 'center', paddingTop: 10 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: t.hair }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: SP.xl, paddingTop: SP.md }}>
          <T v="h2">{title}</T>
          <IconBtn name="x" onPress={onClose} size={36} tone="sunk" />
        </View>
        <ScrollView contentContainerStyle={{ padding: SP.xl, paddingTop: SP.md }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** עורך רשימת מחרוזות */
export function ListEditor({ items = [], onChange, placeholder = 'פריט חדש' }) {
  const [draft, setDraft] = useState('');
  const add = () => { const v = draft.trim(); if (!v) return; onChange([...items, v]); setDraft(''); };
  return (
    <View>
      {items.map((it, i) => (
        <View key={i + it} style={{ flexDirection: 'row', alignItems: 'center', gap: SP.sm, paddingVertical: 6 }}>
          <T style={{ flex: 1 }}>{it}</T>
          <IconBtn name="trash" size={34} onPress={() => onChange(items.filter((_, j) => j !== i))} />
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: SP.sm, marginTop: SP.sm }}>
        <Field value={draft} onChangeText={setDraft} placeholder={placeholder} style={{ flex: 1 }} onSubmitEditing={add} />
        <Btn title="הוסף" small onPress={add} />
      </View>
    </View>
  );
}
