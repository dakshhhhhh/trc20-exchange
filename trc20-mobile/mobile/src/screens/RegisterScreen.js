import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { SHADOW } from '../utils/theme';
import AppLogo from '../components/AppLogo';

// ⚠️ Field MUST be outside RegisterScreen to prevent keyboard dismissal on re-render
const Field = React.memo(({ label, value, onChangeText, placeholder, keyboard, secure, showPwd, togglePwd, optional, autoComplete, textContentType, autoCapitalize }) => (
  <View style={s.fieldGroup}>
    <Text style={s.label}>{label}{optional && <Text style={s.optional}> (Optional)</Text>}</Text>
    <View style={s.inputWrapper}>
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboard || 'default'}
        secureTextEntry={secure && !showPwd}
        autoCapitalize={autoCapitalize || 'none'}
        autoCorrect={false}
        autoComplete={autoComplete || 'off'}
        textContentType={textContentType || 'none'}
        importantForAutofill="no"
      />
      {secure && (
        <TouchableOpacity onPress={togglePwd} style={{ padding: 4 }}>
          <Text style={{ fontSize: 16 }}>{showPwd ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
));

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!name.trim()) { Alert.alert('Error', 'Full name is required'); return false; }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { Alert.alert('Error', 'Valid email required'); return false; }
    if (!phone.trim() || !/^\d{10}$/.test(phone.trim())) { Alert.alert('Error', 'Enter 10-digit phone number'); return false; }
    if (!password || password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return false; }
    if (password !== confirm) { Alert.alert('Error', 'Passwords do not match'); return false; }
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await register(name.trim(), email.trim(), phone.trim(), password, referralCode.trim() || null);
      if (!result.success) Alert.alert('Registration Failed', result.message || 'Please try again');
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EEF2FF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header */}
          <LinearGradient colors={['#1E3A8A', '#1D4ED8', '#3B82F6']} style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <AppLogo size="md" variant="light" />
            <Text style={s.headerSub}>Create your account</Text>
          </LinearGradient>

          <View style={s.card}>
            <Text style={s.cardTitle}>Get Started</Text>
            <Text style={s.cardSub}>Fill in your details to create account</Text>

            <Field label="Full Name" value={name} onChangeText={setName} placeholder="Your full name"
              autoCapitalize="words" autoComplete="off" textContentType="none" />

            <Field label="Email Address" value={email} onChangeText={setEmail}
              placeholder="you@example.com" keyboard="email-address" autoComplete="off" textContentType="none" />

            <Field label="Phone Number" value={phone} onChangeText={setPhone}
              placeholder="10-digit mobile number" keyboard="phone-pad" autoComplete="off" textContentType="none" />

            <Field label="Password" value={password} onChangeText={setPassword}
              placeholder="Min 6 characters" secure showPwd={showPwd} togglePwd={() => setShowPwd(p => !p)}
              autoComplete="off" textContentType="none" />

            <Field label="Confirm Password" value={confirm} onChangeText={setConfirm}
              placeholder="Re-enter password" secure showPwd={showPwd} togglePwd={() => setShowPwd(p => !p)}
              autoComplete="off" textContentType="none" />

            <Field label="Referral Code" value={referralCode} onChangeText={t => setReferralCode(t.toUpperCase())}
              placeholder="Enter referral code" optional autoComplete="off" textContentType="none" />

            <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}
              style={{ borderRadius: 14, overflow: 'hidden', marginTop: 8 }}>
              <LinearGradient colors={loading ? ['#93C5FD', '#93C5FD'] : ['#1E3A8A', '#1D4ED8']}
                style={s.btn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>Create Account →</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.loginRow}>
              <Text style={s.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={s.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 36, paddingHorizontal: 24 },
  backBtn: { marginBottom: 16 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8 },
  card: { margin: 16, borderRadius: 20, backgroundColor: '#FFF', padding: 24, ...SHADOW.lg, marginTop: -16 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  optional: { fontWeight: '400', color: '#9CA3AF' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#F9FAFB', paddingHorizontal: 14, height: 50 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  btn: { height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  loginText: { color: '#6B7280', fontSize: 14 },
  loginLink: { color: '#1D4ED8', fontSize: 14, fontWeight: '600' },
});
