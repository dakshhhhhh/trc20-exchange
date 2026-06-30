import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, settingsAPI } from '../api';
import { SHADOW } from '../utils/theme';

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000];

export default function BuyScreen({ navigation }) {
  const { token } = useAuth();
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState(97.44);
  const [loading, setLoading] = useState(false);
  const [fetchingSettings, setFetchingSettings] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const data = await settingsAPI.getSettings();
        if (data.success) setRate(parseFloat(data.settings.usdt_buy_rate));
      } catch {}
      setFetchingSettings(false);
    })();
  }, []));

  const usdtAmount = amount ? (parseFloat(amount) / rate).toFixed(2) : '0.00';
  const isValid = amount && parseFloat(amount) >= 500;

  const handleContinue = async () => {
    if (!isValid) {
      Alert.alert('Invalid Amount', 'Minimum purchase is ₹500');
      return;
    }
    setLoading(true);
    try {
      const data = await ordersAPI.createOrder(token, parseFloat(amount));
      if (data.success) {
        navigation.navigate('Payment', { order: data.order, paymentMethods: data.paymentMethods });
      } else {
        Alert.alert('Error', data.message || 'Failed to create order');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (n) => {
    if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
    return `₹${n}`;
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Buy USDT</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Live Rate Banner */}
          <View style={styles.rateBanner}>
            <View>
              <Text style={styles.rateBannerLabel}>LIVE BUY RATE</Text>
              <Text style={styles.rateBannerValue}>
                {fetchingSettings ? '...' : `₹${rate.toFixed(2)}`} <Text style={styles.rateBannerSub}>/ USDT</Text>
              </Text>
            </View>
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>

          {/* Amount Input */}
          <Text style={styles.inputLabel}>Enter amount</Text>
          <View style={styles.amountInputWrapper}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor="#CBD5E1"
              value={amount}
              onChangeText={t => setAmount(t.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={7}
            />
          </View>

          {/* Quick Select */}
          <View style={styles.quickRow}>
            {QUICK_AMOUNTS.map(a => (
              <TouchableOpacity
                key={a}
                style={[styles.quickBtn, amount === String(a) && styles.quickBtnActive]}
                onPress={() => setAmount(String(a))}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, amount === String(a) && styles.quickBtnTextActive]}>
                  {formatINR(a)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* You Pay → You Receive */}
          <View style={styles.conversionRow}>
            <View style={styles.conversionBox}>
              <Text style={styles.conversionLabel}>YOU PAY</Text>
              <Text style={styles.conversionPayAmount}>₹{amount ? parseInt(amount).toLocaleString('en-IN') : '0'}</Text>
            </View>
            <View style={styles.arrowBox}>
              <Text style={styles.arrow}>→</Text>
            </View>
            <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={styles.conversionReceiveBox}>
              <Text style={styles.conversionLabel}>YOU RECEIVE</Text>
              <Text style={styles.conversionReceiveAmount}>${usdtAmount}</Text>
            </LinearGradient>
          </View>

          {/* Rate info */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rate</Text>
            <Text style={styles.infoValue}>₹{rate.toFixed(2)} / USDT</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Network fee</Text>
            <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '600' }]}>Free</Text>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            onPress={handleContinue}
            disabled={loading || !isValid}
            activeOpacity={0.85}
            style={styles.continueWrapper}
          >
            <LinearGradient
              colors={(!isValid || loading) ? ['#93C5FD', '#93C5FD'] : ['#1E3A8A', '#1D4ED8']}
              style={styles.continueBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.continueBtnText}>Continue to payment →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* How it works */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How buying works</Text>
          {[
            'Enter how much you want to buy, then continue.',
            'Pay the shown amount to our UPI ID.',
            'Upload your payment screenshot and UTR number.',
            'Your USDT is credited within 5–10 minutes of approval.',
          ].map((step, i) => (
            <View key={i} style={styles.howStep}>
              <View style={styles.howNum}>
                <Text style={styles.howNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.howStepText}>{step}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2FF' },
  header: { paddingTop: 54, paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  card: { marginHorizontal: 16, borderRadius: 20, backgroundColor: '#FFF', padding: 20, ...SHADOW.md, marginBottom: 12 },
  rateBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rateBannerLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  rateBannerValue: { fontSize: 26, fontWeight: '700', color: '#111827', marginTop: 2 },
  rateBannerSub: { fontSize: 14, fontWeight: '400', color: '#6B7280' },
  liveChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  liveText: { color: '#065F46', fontSize: 13, fontWeight: '600' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  amountInputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, marginBottom: 14, height: 60 },
  currencySymbol: { fontSize: 22, fontWeight: '600', color: '#6B7280', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', color: '#111827' },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: '#DBEAFE', backgroundColor: '#F0F9FF', alignItems: 'center' },
  quickBtnActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  quickBtnText: { fontSize: 12, fontWeight: '600', color: '#1D4ED8' },
  quickBtnTextActive: { color: '#FFF' },
  conversionRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginBottom: 16 },
  conversionBox: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 },
  conversionReceiveBox: { flex: 1, borderRadius: 12, padding: 12 },
  arrowBox: { justifyContent: 'center', alignItems: 'center', width: 28 },
  arrow: { fontSize: 18, color: '#9CA3AF' },
  conversionLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  conversionPayAmount: { fontSize: 18, fontWeight: '700', color: '#111827' },
  conversionReceiveAmount: { fontSize: 20, fontWeight: '700', color: '#10B981' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 14, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  continueWrapper: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  continueBtn: { height: 52, justifyContent: 'center', alignItems: 'center' },
  continueBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  howCard: { marginHorizontal: 16, borderRadius: 16, backgroundColor: '#FFF', padding: 18, ...SHADOW.sm },
  howTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  howStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  howNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },
  howNumText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  howStepText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 20 },
});
