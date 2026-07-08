import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Image, Linking,
  Clipboard, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { ordersAPI, settingsAPI } from '../api';
import { SHADOW } from '../utils/theme';

// Real UPI app logos from assets
const UPI_APPS = [
  { name: 'PhonePe', logo: require('../../assets/phonepe.png'), scheme: 'phonepe://' },
  { name: 'GPay', logo: require('../../assets/gpay.png'), scheme: 'tez://' },
  { name: 'Paytm', logo: require('../../assets/paytm.png'), scheme: 'paytmmp://' },
  { name: 'BHIM', logo: require('../../assets/bhim.png'), scheme: 'bhim://' },
];

export default function PaymentScreen({ route, navigation }) {
  const { order, paymentMethods } = route.params;
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [settings, setSettings] = useState(null);
  const [expandUpi, setExpandUpi] = useState(true);
  const [expandQr, setExpandQr] = useState(true);
  const [expandBank, setExpandBank] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    settingsAPI.getSettings().then(d => { if (d.success) setSettings(d.settings); }).catch(() => {});

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
  const upiId = settings?.admin_upi_id || '';
  const qrUrl = settings?.admin_qr_url || '';
  const telegramLink = settings?.telegram_support || settings?.support_telegram || '';
  const bankMethods = (paymentMethods || []).filter(m => m.type === 'bank' && m.is_active);

  const openUpiApp = (scheme) => {
    // Just open the UPI app — user copies UPI ID and pays manually
    // Pre-filling amount causes risk alerts and ₹2000 limits
    Linking.openURL(scheme).catch(() => {
      Alert.alert(
        'App not installed',
        'This UPI app is not installed. Please copy the UPI ID below and use any other UPI app.',
        [{ text: 'OK' }]
      );
    });
  };

  const copyText = (text, label) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const openTelegram = () => {
    if (!telegramLink) { Alert.alert('Support', 'Please contact admin for support.'); return; }
    const url = telegramLink.startsWith('http') ? telegramLink : `https://t.me/${telegramLink.replace('@', '')}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Telegram'));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // DO NOT crop
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) setScreenshot(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!utrNumber.trim()) { Alert.alert('Required', 'Please enter UTR / transaction reference number'); return; }
    if (utrNumber.trim().length < 8) { Alert.alert('Invalid UTR', 'UTR number must be at least 8 characters'); return; }
    if (!screenshot) { Alert.alert('Required', 'Please upload your payment screenshot'); return; }
    setLoading(true);
    try {
      const result = await ordersAPI.submitProof(token, order.orderId, utrNumber.trim(), screenshot.uri, screenshot.mimeType || 'image/jpeg');
      if (result.success) {
        navigation.replace('MainTabs', { screen: 'Orders' });
        setTimeout(() => Alert.alert('✅ Submitted!', 'Payment proof submitted. USDT will be credited after admin verification.'), 300);
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
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try { await ordersAPI.cancelOrder(token, order.orderId); } catch {}
        navigation.goBack();
      }}
    ]);
  };

  const SectionHeader = ({ icon, title, subtitle, expanded, onToggle }) => (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionHeaderSub}>{subtitle}</Text>}
      </View>
      <Text style={[styles.chevron, { transform: [{ rotate: expanded ? '180deg' : '0deg' }] }]}>⌄</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EEF2FF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
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
            <TouchableOpacity style={styles.stepItem} onPress={() => setStep(1)}>
              <View style={[styles.stepNum, step === 1 && styles.stepNumActive]}>
                <Text style={[styles.stepNumText, step === 1 && styles.stepNumTextActive]}>1</Text>
              </View>
              <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>Pay via UPI</Text>
            </TouchableOpacity>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={[styles.stepNum, step === 2 && styles.stepNumActive]}>
                <Text style={[styles.stepNumText, step === 2 && styles.stepNumTextActive]}>2</Text>
              </View>
              <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Upload proof</Text>
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.orderCard}>
            <View style={styles.orderIdRow}>
              <View>
                <Text style={styles.orderIdLabel}>ORDER ID</Text>
                <Text style={styles.orderId}>{order.orderId}</Text>
              </View>
              <TouchableOpacity style={styles.copyBtn} onPress={() => copyText(order.orderId, 'Order ID')}>
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
            <View style={[styles.timerRow, isExpiringSoon && styles.timerRowRed]}>
              <Text style={styles.timerIcon}>⏰</Text>
              <Text style={[styles.timerLabel, isExpiringSoon && styles.timerLabelRed]}>Rate locked — pay within</Text>
              <Text style={[styles.timerValue, isExpiringSoon && styles.timerValueRed]}>{formatTime(timeLeft)}</Text>
            </View>
          </View>

          {step === 1 ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Payment options</Text>

                {/* Pay with UPI App */}
                <View style={styles.section}>
                  <SectionHeader icon="📱" title="Pay with an app" subtitle="PhonePe, GPay, Paytm, BHIM" expanded={expandUpi} onToggle={() => setExpandUpi(!expandUpi)} />
                  {expandUpi && (
                    <View style={{ paddingTop: 14 }}>
                      <View style={styles.upiInstructions}>
                    <Text style={styles.upiInstructionsTitle}>How to pay:</Text>
                    <Text style={styles.upiInstructionsText}>1. Copy the UPI ID below  2. Open any UPI app  3. Go to "Pay to UPI ID"  4. Paste UPI ID  5. Enter ₹{parseInt(order.amountInr).toLocaleString('en-IN')} and pay</Text>
                  </View>

                  {/* UPI ID Copy — most prominent */}
                  <View style={styles.upiIdBigBox}>
                    <Text style={styles.upiIdBigLabel}>UPI ID — Copy and paste in any app</Text>
                    <View style={styles.upiIdCopyRow}>
                      <Text style={styles.upiIdText} selectable numberOfLines={1}>{upiId || 'Not configured by admin'}</Text>
                      {upiId ? (
                        <TouchableOpacity style={styles.copyBtnBlue} onPress={() => copyText(upiId, 'UPI ID')}>
                          <Text style={styles.copyBtnBlueText}>📋 Copy</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  <Text style={styles.upiAppsLabel}>Quick open app (then paste UPI ID manually):</Text>
                  <View style={styles.upiGrid}>
                    {UPI_APPS.map(app => (
                      <TouchableOpacity key={app.name} style={styles.upiApp} onPress={() => openUpiApp(app.scheme)} activeOpacity={0.7}>
                        <View style={styles.upiIconWrapper}>
                          <Image source={app.logo} style={styles.upiLogo} resizeMode="contain" />
                        </View>
                        <Text style={styles.upiName}>{app.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                    </View>
                  )}
                </View>

                {/* QR Code */}
                <View style={[styles.section, { marginTop: 10 }]}>
                  <SectionHeader icon="⊞" title="Scan QR code" subtitle="Scan with any UPI app" expanded={expandQr} onToggle={() => setExpandQr(!expandQr)} />
                  {expandQr && (
                    <View style={{ paddingTop: 14, alignItems: 'center' }}>
                      {qrUrl ? (
                        <>
                          <View style={styles.qrWrapper}>
                            <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
                          </View>
                          <Text style={styles.qrCaption}>Scan to pay ₹{parseInt(order.amountInr).toLocaleString('en-IN')}</Text>
                        </>
                      ) : (
                        <View style={styles.qrPlaceholder}>
                          <Text style={{ color: '#9CA3AF', fontSize: 14 }}>QR code not configured by admin</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Bank Transfer */}
                {bankMethods.length > 0 && (
                  <View style={[styles.section, { marginTop: 10 }]}>
                    <SectionHeader icon="🏦" title="Bank transfer" subtitle="NEFT / IMPS / RTGS" expanded={expandBank} onToggle={() => setExpandBank(!expandBank)} />
                    {expandBank && bankMethods.map(bank => (
                      <View key={bank.id} style={styles.bankBox}>
                        {[
                          ['Bank Name', bank.bank_name],
                          ['Account Number', bank.account_number],
                          ['IFSC Code', bank.ifsc_code],
                          ['Account Holder', bank.account_holder],
                        ].map(([label, value]) => value ? (
                          <View key={label} style={styles.bankRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.bankLabel}>{label}</Text>
                              <Text style={styles.bankValue}>{value}</Text>
                            </View>
                            <TouchableOpacity style={styles.copyBtnSmall} onPress={() => copyText(value, label)}>
                              <Text style={styles.copyBtnSmallText}>Copy</Text>
                            </TouchableOpacity>
                          </View>
                        ) : null)}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={() => setStep(2)} activeOpacity={0.85} style={styles.nextBtnWrapper}>
                <LinearGradient colors={['#1E3A8A', '#1D4ED8']} style={styles.nextBtn}>
                  <Text style={styles.nextBtnText}>I've paid — Upload Proof →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
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
                    <Image source={{ uri: screenshot.uri }} style={styles.screenshotPreview} resizeMode="contain" />
                  ) : (
                    <>
                      <Text style={styles.screenshotUploadIcon}>⬆</Text>
                      <Text style={styles.screenshotUploadText}>Tap to upload payment screenshot</Text>
                      <Text style={styles.screenshotUploadHint}>JPG / PNG / WEBP · Max 5MB · Full image (no crop)</Text>
                    </>
                  )}
                </TouchableOpacity>
                {screenshot && (
                  <TouchableOpacity onPress={pickImage} style={{ marginTop: 8, alignSelf: 'center' }}>
                    <Text style={{ color: '#1D4ED8', fontSize: 13, fontWeight: '600' }}>↩ Change photo</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85} style={styles.submitWrapper}>
                  <LinearGradient colors={loading ? ['#93C5FD', '#93C5FD'] : ['#1E3A8A', '#1D4ED8']} style={styles.submitBtn}>
                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>✓ Submit order</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>✕  Cancel order</Text>
              </TouchableOpacity>

              {/* Telegram support - blue */}
              <TouchableOpacity style={styles.telegramBtn} onPress={openTelegram}>
                <Text style={styles.telegramBtnText}>✈️  Trouble paying? Chat with us on Telegram</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...SHADOW.sm },
  backText: { fontSize: 22, color: '#374151', marginTop: -2 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  section: { borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, padding: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionHeaderIcon: { fontSize: 20 },
  sectionHeaderTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sectionHeaderSub: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  chevron: { fontSize: 18, color: '#9CA3AF', marginLeft: 'auto' },
  upiGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  upiApp: { flex: 1, alignItems: 'center', gap: 6 },
  upiIconWrapper: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  upiLogo: { width: 44, height: 44 },
  upiName: { fontSize: 11, fontWeight: '600', color: '#374151' },
  upiInstructions: { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' },
  upiInstructionsTitle: { fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  upiInstructionsText: { fontSize: 12, color: '#78350F', lineHeight: 18 },
  upiIdBigBox: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#BFDBFE' },
  upiIdBigLabel: { fontSize: 11, fontWeight: '700', color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  upiIdCopyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  upiIdText: { flex: 1, fontSize: 16, fontWeight: '800', color: '#111827', fontFamily: 'monospace' },
  upiAppsLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
  copyBtnBlue: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: '#1D4ED8' },
  copyBtnBlueText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  qrWrapper: { width: 200, height: 200, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF', padding: 8 },
  qrImage: { width: '100%', height: '100%' },
  qrCaption: { marginTop: 10, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  qrPlaceholder: { width: 200, height: 140, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  bankBox: { marginTop: 12, borderRadius: 10, backgroundColor: '#F9FAFB', overflow: 'hidden' },
  bankRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bankLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  bankValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  copyBtnSmall: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: '#DBEAFE', backgroundColor: '#EFF6FF' },
  copyBtnSmallText: { fontSize: 12, color: '#1D4ED8', fontWeight: '700' },
  nextBtnWrapper: { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  nextBtn: { height: 52, justifyContent: 'center', alignItems: 'center' },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  uploadSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  uploadSectionIcon: { fontSize: 18 },
  uploadSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  proofLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  utrInput: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB' },
  utrHint: { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
  screenshotBox: { borderWidth: 2, borderColor: '#E5E7EB', borderStyle: 'dashed', borderRadius: 12, minHeight: 140, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', overflow: 'hidden' },
  screenshotPreview: { width: '100%', height: 200 },
  screenshotUploadIcon: { fontSize: 28, color: '#93C5FD', marginBottom: 8 },
  screenshotUploadText: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  screenshotUploadHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 20 },
  submitWrapper: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  submitBtn: { height: 52, justifyContent: 'center', alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelBtn: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FFF7F7', paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  cancelBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  telegramBtn: { marginHorizontal: 16, borderRadius: 14, backgroundColor: '#EFF6FF', paddingVertical: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  telegramBtnText: { color: '#1D4ED8', fontSize: 14, fontWeight: '600' },
});
