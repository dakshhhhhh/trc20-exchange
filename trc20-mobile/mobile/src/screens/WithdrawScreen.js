import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { withdrawalAPI, userAPI } from '../api';
import { SHADOW } from '../utils/theme';

export default function WithdrawScreen({ navigation }) {
  const { token, refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [errors, setErrors] = useState({});

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const data = await userAPI.getDashboard(token);
        if (data.success) setDashboard(data.data);
      } catch {}
    })();
  }, []));

  const balance = parseFloat(dashboard?.stats?.availableBalance || 0);
  const freeLeft = dashboard?.stats?.freeWithdrawalsRemaining || 0;
  const fee = freeLeft > 0 ? 0 : parseFloat(dashboard?.settings?.withdrawalFee || 1);
  const minWithdraw = parseFloat(dashboard?.settings?.minWithdrawUsdt || 10);
  const amountNum = parseFloat(amount) || 0;
  const youReceive = Math.max(0, amountNum - fee);

  const validate = () => {
    const e = {};
    if (!amount || amountNum <= 0) e.amount = 'Enter withdrawal amount';
    else if (amountNum < minWithdraw) e.amount = `Minimum withdrawal is ${minWithdraw} USDT`;
    else if (amountNum > balance) e.amount = 'Insufficient balance';
    if (!walletAddress.trim()) e.wallet = 'Wallet address is required';
    else if (!walletAddress.trim().startsWith('T') || walletAddress.trim().length < 30) {
      e.wallet = 'Invalid TRC20 address (must start with T)';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleWithdraw = async () => {
    if (!validate()) return;
    Alert.alert(
      'Confirm Withdrawal',
      `Withdraw ${amountNum} USDT to:\n${walletAddress.substring(0, 16)}...${walletAddress.slice(-6)}\n\nYou receive: ${youReceive.toFixed(2)} USDT`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: async () => {
            setLoading(true);
            try {
              const data = await withdrawalAPI.create(token, amountNum, walletAddress.trim());
              if (data.success) {
                await refreshUser();
                setAmount('');
                setWalletAddress('');
                Alert.alert(
                  '✅ Withdrawal Submitted',
                  'Your withdrawal is pending admin approval. You will be notified once processed.',
                  [{ text: 'OK', onPress: () => navigation.navigate('Orders') }]
                );
              } else {
                Alert.alert('Error', data.message || 'Withdrawal failed');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Something went wrong');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EEF2FF' }} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Withdraw USDT</Text>
        </View>

        {/* Balance Banner */}
        <LinearGradient colors={['#1E3A8A', '#1D4ED8', '#2563EB']} style={styles.balanceBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceValue}>${balance.toFixed(2)}</Text>
          <View style={styles.freeTag}>
            <Text style={styles.freeTagText}>🎁  {freeLeft} free withdrawals remaining</Text>
          </View>
        </LinearGradient>

        {/* Form Card */}
        <View style={styles.card}>
          {/* Amount */}
          <Text style={styles.fieldLabel}>Amount to withdraw</Text>
          <View style={[styles.inputRow, errors.amount && styles.inputError]}>
            <Text style={styles.usdtSymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              value={amount}
              onChangeText={t => { setAmount(t.replace(/[^0-9.]/g, '')); setErrors(p => ({ ...p, amount: null })); }}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.maxBtn}
              onPress={() => setAmount(balance.toFixed(2))}
            >
              <Text style={styles.maxBtnText}>MAX</Text>
            </TouchableOpacity>
          </View>
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}

          {/* Wallet Address */}
          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Your TRC20 wallet address</Text>
          <View style={[styles.walletInput, errors.wallet && styles.inputError]}>
            <TextInput
              style={styles.walletInputText}
              placeholder="Paste your TRON (TRC20) wallet address"
              placeholderTextColor="#9CA3AF"
              value={walletAddress}
              onChangeText={t => { setWalletAddress(t); setErrors(p => ({ ...p, wallet: null })); }}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
            />
          </View>
          {errors.wallet ? (
            <Text style={styles.errorText}>{errors.wallet}</Text>
          ) : (
            <View style={styles.walletWarning}>
              <Text style={styles.walletWarningIcon}>🛡</Text>
              <Text style={styles.walletWarningText}>
                We send on the TRON (TRC20) network. Double-check your address — transfers can't be reversed.
              </Text>
            </View>
          )}

          {/* Summary */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>You withdraw</Text>
              <Text style={styles.summaryValue}>${amountNum.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Network fee</Text>
              <Text style={[styles.summaryValue, { color: fee === 0 ? '#10B981' : '#F59E0B', fontWeight: '700' }]}>
                {fee === 0 ? 'Free' : `${fee} USDT`}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { fontWeight: '700', color: '#111827' }]}>You receive</Text>
              <Text style={[styles.summaryValue, { color: '#1D4ED8', fontWeight: '800', fontSize: 17 }]}>
                ${youReceive.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity onPress={handleWithdraw} disabled={loading} activeOpacity={0.85} style={styles.withdrawWrapper}>
            <LinearGradient
              colors={loading ? ['#93C5FD', '#93C5FD'] : ['#1E3A8A', '#1D4ED8']}
              style={styles.withdrawBtn}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.withdrawBtnText}>↑  Withdraw USDT</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>Before you withdraw</Text>
          {[
            { icon: '📍', text: 'Send only to a TRC20 (TRON) wallet. Funds sent on any other network can\'t be recovered.' },
            { icon: '⏱', text: 'Withdrawals are processed within 1 to 24 hours of approval.' },
            { icon: '🔒', text: 'Your balance is reserved the moment you submit, and stays safe until the transfer completes.' },
            { icon: '🎁', text: `You have ${freeLeft} free withdrawals left. After that, a 1 USDT fee applies.` },
          ].map((item, i) => (
            <View key={i} style={styles.infoItem}>
              <Text style={styles.infoItemIcon}>{item.icon}</Text>
              <Text style={styles.infoItemText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2FF' },
  header: { paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  balanceBanner: { marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 12, ...SHADOW.blue },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  balanceValue: { color: '#FFF', fontSize: 40, fontWeight: '700', marginBottom: 12 },
  freeTag: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
  freeTagText: { color: '#FFF', fontSize: 13, fontWeight: '500' },
  card: { marginHorizontal: 16, borderRadius: 20, backgroundColor: '#FFF', padding: 20, ...SHADOW.md, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, height: 56 },
  inputError: { borderColor: '#EF4444' },
  usdtSymbol: { fontSize: 20, fontWeight: '600', color: '#6B7280', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '700', color: '#111827' },
  maxBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: '#DBEAFE' },
  maxBtnText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  walletInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F9FAFB' },
  walletInputText: { fontSize: 14, color: '#111827' },
  walletWarning: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'flex-start' },
  walletWarningIcon: { fontSize: 13, marginTop: 1 },
  walletWarningText: { flex: 1, fontSize: 11, color: '#6B7280', lineHeight: 16 },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 6 },
  summaryBox: { marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
  withdrawWrapper: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  withdrawBtn: { height: 52, justifyContent: 'center', alignItems: 'center' },
  withdrawBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  infoCard: { marginHorizontal: 16, borderRadius: 16, backgroundColor: '#FFF', padding: 18, ...SHADOW.sm, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  infoCardTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 14 },
  infoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  infoItemIcon: { fontSize: 16, marginTop: 1 },
  infoItemText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
});
