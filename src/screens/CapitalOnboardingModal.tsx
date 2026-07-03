import { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button, Field, Label, Title } from '../components/UI';
import { supabase } from '../lib/supabase';
import { fonts } from '../theme';

export function CapitalOnboardingModal({ visible, onSaved }: { visible: boolean; onSaved: () => Promise<void> }) {
  const { session } = useAuth(); const { palette } = useTheme(); const [amount, setAmount] = useState(''); const [busy, setBusy] = useState(false);
  const capital = Number(amount.replace(/,/g, '').trim());
  async function save() {
    if (!session || !Number.isFinite(capital) || capital < 0) return Alert.alert('Enter a valid starting capital');
    setBusy(true);
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, initial_capital: capital, updated_at: new Date().toISOString() }).select().single();
    setBusy(false);
    if (error) return Alert.alert('Could not save capital', `${error.message}\n\nRun the add_initial_capital migration if this field is missing.`);
    await onSaved();
  }
  return <Modal visible={visible} animationType="fade" transparent><View style={styles.overlay}><View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}><View style={[styles.icon, { backgroundColor: palette.primarySoft }]}><Ionicons name="wallet-outline" size={38} color={palette.primary} /></View><Title style={{ textAlign: 'center' }}>Set your starting capital</Title><Text style={[styles.description, { color: palette.muted }]}>Enter the money you currently have. Clarity Finance will use this as the opening balance, then add income and subtract expenses.</Text><Label>STARTING CAPITAL • MMK</Label><Field value={amount} onChangeText={setAmount} placeholder="e.g. 2500000" keyboardType="numeric" autoFocus /><Button title={busy ? 'Saving…' : 'Start tracking'} onPress={save} disabled={busy || !Number.isFinite(capital) || capital < 0 || !amount.trim()} /><Label style={{ textAlign: 'center' }}>YOU CAN CHANGE THIS LATER IN PROFILE</Label></View></View></Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(2,10,30,.72)', alignItems: 'center', justifyContent: 'center', padding: 24 }, card: { width: '100%', maxWidth: 500, borderRadius: 20, borderWidth: 1, padding: 26, gap: 16 }, icon: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, textAlign: 'center' } });
