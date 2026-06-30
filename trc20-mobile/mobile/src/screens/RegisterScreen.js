import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { COLORS, SHADOW } from '../utils/theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', referralCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const setField = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(form.phone.trim())) e.phone = 'Enter 10-digit phone number';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Min 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await register(form.name.trim(), form.email.trim(), form.phone.trim(), form.password, form.referralCode.trim() || null);
      if (!result.success) {
        Alert.alert('Registration Failed', result.message || 'Please try again');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, icon, keyName, placeholder, keyboard, secure, extra }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, errors[keyName] && styles.inputError]}>
        <Text style={styles.inputIcon}>{icon}</Text>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={form[keyName]}
          onChangeText={t => setField(keyName, t)}
          keyboardType={keyboard || 'default'}
          secureTextEntry={secure ? !showPassword : false}
          autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          {...extra}
        />
        {secure && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Text style={{ fontSize: 16 }}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {errors[keyName] && <Text style={styles.errorText}>{errors[keyName]}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#EEF2FF' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1E3A8A', '#1D4ED8', '#3B82F6']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>⟨⟩</Text></View>
            <Text style={styles.logoText}>TRC20</Text>
          </View>
          <Text style={styles.headerSub}>Create your account</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Get Started</Text>
          <Text style={styles.cardSub}>Fill in your details to create account</Text>

          <Field label="Full Name" icon="👤" keyName="name" placeholder="Daksh Prajapat" extra={{ autoCapitalize: 'words' }} />
          <Field label="Email Address" icon="✉️" keyName="email" placeholder="you@example.com" keyboard="email-address" extra={{ autoCapitalize: 'none' }} />
          <Field label="Phone Number" icon="📱" keyName="phone" placeholder="10-digit mobile number" keyboard="phone-pad" />
          <Field label="Password" icon="🔒" keyName="password" placeholder="Min 6 characters" secure extra={{ autoCapitalize: 'none' }} />

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Re-enter password"
                placeholderTextColor="#9CA3AF"
                value={form.confirmPassword}
                onChangeText={t => setField('confirmPassword', t)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Referral Code <Text style={styles.optional}>(Optional)</Text></Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🎁</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter referral code"
                placeholderTextColor="#9CA3AF"
                value={form.referralCode}
                onChangeText={t => setField('referralCode', t.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 8 }}>
            <LinearGradient
              colors={loading ? ['#93C5FD', '#93C5FD'] : ['#1E3A8A', '#1D4ED8']}
              style={styles.loginBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginBtnText}>Create Account →</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 50, paddingBottom: 36, paddingHorizontal: 24 },
  backBtn: { marginBottom: 12 },
  backText: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  logoBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  logoText: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  card: { margin: 16, borderRadius: 20, backgroundColor: '#FFF', padding: 24, ...SHADOW.lg, marginTop: -16 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  optional: { fontWeight: '400', color: '#9CA3AF' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#F9FAFB', paddingHorizontal: 14, height: 50 },
  inputError: { borderColor: '#EF4444' },
  inputIcon: { fontSize: 15, marginRight: 8 },
  input: { fontSize: 15, color: '#111827' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  loginBtn: { height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  loginText: { color: '#6B7280', fontSize: 14 },
  loginLink: { color: '#1D4ED8', fontSize: 14, fontWeight: '600' },
});
