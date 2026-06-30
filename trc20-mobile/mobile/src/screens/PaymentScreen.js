import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../api';
import { SHADOW } from '../utils/theme';

const UPI_APPS = [
  { name: 'PhonePe', emoji: '💜', color: '#5f259f' },
  { name: 'GPay', emoji: '🔵', color: '#4285F4' },
  { name: 'Paytm', emoji: '🔷', color: '#00BAF2' },
  { name: 'BHIM', emoji: '🟠', color: '#FF6B00' },
];

export default function PaymentScreen({ route, navigation }) {
  const { order, paymentMethods } = route.params;
  const { token } = useAuth();
  const [step, setStep] = useState(1); // 1=pay via UPI, 2=upload proof
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const expiresAt = new Date(order.expiresAt).getTime();
    const calcTime = () => Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    setTimeLeft(calcTime());

    timerRef.current = setInterval(() => {
      const t = calcTime();
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current);
        Alert.alert('Order Expired', 'Your order has expired. Please create a new one.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isExpiringSoon = timeLeft <= 120;

  const primaryMethod = paymentMethods?.find(m => m.type === 'upi' && m.is_active);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setScreenshot(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!utrNumber.trim()) {
      Alert.alert('Required', 'Please enter your UTR / transaction reference number');
      return;
    }
    if (utrNumber.trim().length < 8) {
      Alert.alert('Invalid UTR', 'UTR number must be at least 8 characters');
      return;
    }
    if (!screenshot) {
      Alert.alert('Required', 'Please upload your payment screenshot');
      return;
    }

    setLoading(true);
    try {
      const result = await ordersAPI.submitProof(
        token,
        order.orderId,
        utrNumber.trim(),
        screenshot.uri,
        screenshot.mimeType || 'image/jpeg'
      );

      if (result.success) {
        navigation.replace('MainTabs', { screen: 'Orders' });
        setTimeout(() => {
          Alert.alert(
            '✅ Submitted!',
            'Your payment proof has been submitted. USDT will be credited after admin verification.',
            [{ text: 'Great!' }]
          );
        }, 300);
      } else {
        Alert.alert('Error', result.message || 'Failed to submit');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Order?', 'Are you sure you want to cancel this order?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await ordersAPI.cancelOrder(token, order.orderId);
          } catch {}
          navigation.goBack();
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Payment</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepRow}>
        <TouchableOpacity style={[styles.stepItem, step === 1 && styles.stepActive]} onPress={() => setStep(1)}>
          <View style={[styles.stepNum, step === 1 && styles.stepNumActive]}>
            <Text style={[styles.stepNumText, step === 1 && styles.stepNumTextActive]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Pay via UPI</Text>
        </TouchableOpacity>
        <View style={styles.stepLine} />
        <View style={[styles.stepItem, step === 2 && styles.stepActive]}>
          <View style={[styles.stepNum, step === 2 && styles.stepNumActive]}>
            <Text style={[styles.stepNumText, step === 2 && styles.stepNumTextActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Upload proof</Text>
        </View>
      </View>

      {/* Order Summary Card */}
      <View style={styles.orderCard}>
        <View style={styles.orderIdRow}>
          <View>
            <Text style={styles.orderIdLabel}>ORDER ID</Text>
            <Text style={styles.orderId}>{order.orderId}</Text>
          </View>
          <TouchableOpacity style={styles.copyBtn}>
            <Text style={styles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>YOU PAY</Text>
            <Text style={styles.payAmount}>₹{parseInt(order.amountInr).toLocaleString('en-IN')}</Text>
          </View>
          <Text style={styles.arrowText}>→</Text>
          <LinearGradient colors={['#ECFDF5', '#D1FAE5']} style={styles.receiveBox}>
            <Text style={styles.amountLabel}>YOU RECEIVE</Text>
            <Text style={styles.receiveAmount}>${parseFloat(order.amountUsdt).toFixed(2)}</Text>
          </LinearGradient>
        </View>

        {/* Timer */}
        <View style={[styles.timerRow, isExpiringSoon && styles.timerRowRed]}>
          <Text style={styles.timerIcon}>⏰</Text>
          <Text style={[styles.timerLabel, isExpiringSoon && styles.timerLabelRed]}>
            Rate locked — pay within
          </Text>
          <Text style={[styles.timerValue, isExpiringSoon && styles.timerValueRed]}>
            {formatTime(timeLeft)}
          </Text>
        </View>
      </View>

      {step === 1 ? (
        <>
          {/* Payment Options */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Payment options</Text>

            {/* Pay with App */}
            <View style={styles.paySection}>
              <View style={styles.paySectionHeader}>
                <Text style={styles.paySectionIcon}>📱</Text>
                <View>
                  <Text style={styles.paySectionTitle}>Pay with an app</Text>
                  <Text style={styles.paySectionSub}>PhonePe, GPay, Paytm, BHIM</Text>
                </View>
                <Text style={styles.expandArrow}>∧</Text>
              </View>
              <View style={styles.upiGrid}>
                {UPI_APPS.map(app => (
                  <TouchableOpacity key={app.name} style={styles.upiApp} activeOpacity={0.7}>
                    <View style={[styles.upiIcon, { backgroundColor: app.color + '18' }]}>
                      <Text style={{ fontSize: 26 }}>{app.emoji}</Text>
                    </View>
                    <Text style={styles.upiName}>{app.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.otherUpiBtn}>
                <Text style={styles.otherUpiText}>Other UPI app →</Text>
              </TouchableOpacity>
            </View>

            {/* UPI ID */}
            {primaryMethod && (
              <View style={styles.paySection}>
                <View style={styles.paySectionHeader}>
                  <Text style={styles.paySectionIcon}>🏦</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paySectionTitle}>Pay to UPI ID</Text>
                    <Text style={styles.upiIdValue}>{primaryMethod.upi_id}</Text>
                  </View>
                  <TouchableOpacity style={styles.copyBtnSmall}>
                    <Text style={styles.copyBtnSmallText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* QR Code placeholder */}
            <View style={styles.paySection}>
              <View style={styles.paySectionHeader}>
                <Text style={styles.paySectionIcon}>⊞</Text>
                <View>
                  <Text style={styles.paySectionTitle}>Scan QR code</Text>
                  <Text style={styles.paySectionSub}>Scan with any UPI app</Text>
                </View>
                <Text style={styles.expandArrow}>∧</Text>
              </View>
              <View style={styles.qrBox}>
                {primaryMethod?.qr_image_url ? (
                  <Image source={{ uri: primaryMethod.qr_image_url }} style={styles.qrImage} />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Text style={styles.qrPlaceholderText}>QR Code</Text>
                    <Text style={styles.qrPlaceholderSub}>Set by admin</Text>
                  </View>
                )}
                <Text style={styles.qrCaption}>
                  Scan to pay ₹{parseInt(order.amountInr).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setStep(2)}
            activeOpacity={0.85}
            style={styles.nextBtnWrapper}
          >
            <LinearGradient colors={['#1E3A8A', '#1D4ED8']} style={styles.nextBtn}>
              <Text style={styles.nextBtnText}>I've paid — Upload Proof →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Upload Proof */}
          <View style={styles.card}>
            <View style={styles.uploadSectionHeader}>
              <Text style={styles.uploadSectionIcon}>📋</Text>
              <Text style={styles.uploadSectionTitle}>After paying — upload proof</Text>
            </View>

            <Text style={styles.proofLabel}>UTR / transaction reference number</Text>
            <TextInput
              style={styles.utrInput}
              placeholder="e.g. 408312345678"
              placeholderTextColor="#9CA3AF"
              value={utrNumber}
              onChangeText={setUtrNumber}
              keyboardType="default"
              autoCapitalize="none"
            />
            <Text style={styles.utrHint}>Found in your UPI app → Transaction history → Details</Text>

            <Text style={[styles.proofLabel, { marginTop: 16 }]}>Payment screenshot</Text>
            <TouchableOpacity onPress={pickImage} style={styles.screenshotBox} activeOpacity={0.7}>
              {screenshot ? (
                <Image source={{ uri: screenshot.uri }} style={styles.screenshotPreview} />
              ) : (
                <>
                  <Text style={styles.screenshotUploadIcon}>⬆</Text>
                  <Text style={styles.screenshotUploadText}>Tap to upload payment screenshot</Text>
                  <Text style={styles.screenshotUploadHint}>JPG / PNG / WEBP · Max 5MB</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85} style={styles.submitWrapper}>
              <LinearGradient
                colors={loading ? ['#93C5FD', '#93C5FD'] : ['#1E3A8A', '#1D4ED8']}
                style={styles.submitBtn}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>✓ Submit order</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>✕  Cancel order</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.whatsappBtn}>
            <Text style={styles.whatsappBtnText}>💬  Trouble paying? Chat with us on WhatsApp</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...SHADOW.sm },
  backText: { fontSize: 22, color: '#374151', marginTop: -2 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepActive: {},
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
  stepNumActive: { backgroundColor: '#1D4ED8' },
  stepNumText: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  stepNumTextActive: { color: '#FFF' },
  stepLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  stepLabelActive: { color: '#1D4ED8', fontWeight: '700' },
  stepLine: { flex: 1, height: 1.5, backgroundColor: '#E5E7EB', marginHorizontal: 10 },
  orderCard: { marginHorizontal: 16, borderRadius: 16, backgroundColor: '#FFF', padding: 16, ...SHADOW.sm, marginBottom: 12 },
  orderIdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  orderIdLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  orderId: { fontSize: 16, fontWeight: '700', color: '#111827', letterSpacing: 0.5 },
  copyBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  copyBtnText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  amountBox: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12 },
  receiveBox: { flex: 1, borderRadius: 12, padding: 12 },
  arrowText: { color: '#9CA3AF', fontSize: 18 },
  amountLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  payAmount: { fontSize: 18, fontWeight: '700', color: '#111827' },
  receiveAmount: { fontSize: 20, fontWeight: '700', color: '#10B981' },
  timerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, gap: 6 },
  timerRowRed: { backgroundColor: '#FEE2E2' },
  timerIcon: { fontSize: 14 },
  timerLabel: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '500' },
  timerLabelRed: { color: '#991B1B' },
  timerValue: { fontSize: 16, fontWeight: '800', color: '#D97706' },
  timerValueRed: { color: '#EF4444' },
  card: { marginHorizontal: 16, borderRadius: 16, backgroundColor: '#FFF', padding: 18, ...SHADOW.sm, marginBottom: 12 },
  cardSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  paySection: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, padding: 14, marginBottom: 10 },
  paySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  paySectionIcon: { fontSize: 20 },
  paySectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  paySectionSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  expandArrow: { marginLeft: 'auto', color: '#9CA3AF', fontSize: 16 },
  upiGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  upiApp: { flex: 1, alignItems: 'center', gap: 6 },
  upiIcon: { width: 54, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  upiName: { fontSize: 11, fontWeight: '500', color: '#374151' },
  otherUpiBtn: { marginTop: 12, alignItems: 'center' },
  otherUpiText: { color: '#1D4ED8', fontSize: 13, fontWeight: '600' },
  upiIdValue: { fontSize: 15, fontWeight: '700', color: '#1D4ED8', marginTop: 2 },
  copyBtnSmall: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: '#DBEAFE' },
  copyBtnSmallText: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  qrBox: { marginTop: 14, alignItems: 'center' },
  qrImage: { width: 180, height: 180, borderRadius: 8 },
  qrPlaceholder: { width: 180, height: 180, borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  qrPlaceholderText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  qrPlaceholderSub: { fontSize: 12, color: '#D1D5DB', marginTop: 4 },
  qrCaption: { marginTop: 10, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  nextBtnWrapper: { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  nextBtn: { height: 52, justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  uploadSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  uploadSectionIcon: { fontSize: 18 },
  uploadSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  proofLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  utrInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB' },
  utrHint: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  screenshotBox: { borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 12, height: 140, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', overflow: 'hidden' },
  screenshotPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  screenshotUploadIcon: { fontSize: 28, color: '#93C5FD', marginBottom: 8 },
  screenshotUploadText: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  screenshotUploadHint: { fontSize: 12, color: '#9CA3AF' },
  submitWrapper: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  submitBtn: { height: 52, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelBtn: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FFF7F7', paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  cancelBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  whatsappBtn: { marginHorizontal: 16, borderRadius: 14, backgroundColor: '#ECFDF5', paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  whatsappBtnText: { color: '#065F46', fontSize: 14, fontWeight: '600' },
});
