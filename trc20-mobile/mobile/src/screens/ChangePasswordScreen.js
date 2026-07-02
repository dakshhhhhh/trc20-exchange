import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { authAPI, settingsAPI } from '../api';
import { SHADOW } from '../utils/theme';

export default function ChangePasswordScreen({ navigation }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [telegramLink, setTelegramLink] = useState('');

  React.useEffect(() => {
    settingsAPI.getSettings().then(d => {
      if (d.success) setTelegramLink(d.settings?.telegram_support || d.settings?.support_telegram || '');
    }).catch(() => {});
  }, []);

  const setField = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: null })); };

  const validate = () => {
    const e = {};
    if (!form.current) e.current = 'Current password is required';
    if (!form.newPass || form.newPass.length < 6) e.newPass = 'Minimum 6 characters';
    if (form.newPass !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handle = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = await authAPI.changePassword(token, { currentPassword: form.current, newPassword: form.newPass });
      if (data.success) {
        Alert.alert('✅ Success', 'Password changed successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('Error', data.message || 'Failed to change password');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const openTelegram = () => {
    if (!telegramLink) { Alert.alert('Support', 'Contact admin for support.'); return; }
    const url = telegramLink.startsWith('http') ? telegramLink : `https://t.me/${telegramLink.replace('@', '')}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open Telegram'));
  };

  const Field = ({ label, field, placeholder }) => (
    <View style={cpStyles.field}>
      <Text style={cpStyles.label}>{label}</Text>
      <View style={[cpStyles.inputRow, errors[field] && cpStyles.inputError]}>
        <TextInput
          style={cpStyles.input}
          placeholder={placeholder || '••••••••'}
          placeholderTextColor="#9CA3AF"
          value={form[field]}
          onChangeText={t => setField(field, t)}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
      </View>
      {errors[field] && <Text style={cpStyles.error}>{errors[field]}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EEF2FF' }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={cpStyles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={cpStyles.backBtn}>
              <Text style={cpStyles.backText}>‹</Text>
            </TouchableOpacity>
            <Text style={cpStyles.title}>Change Password</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={cpStyles.card}>
            <Text style={cpStyles.cardTitle}>Update your password</Text>
            <Text style={cpStyles.cardSub}>Choose a strong password with at least 6 characters.</Text>

            <Field label="Current Password" field="current" />
            <Field label="New Password" field="newPass" />
            <Field label="Confirm New Password" field="confirm" />

            <TouchableOpacity onPress={() => setShow(!show)} style={cpStyles.showBtn}>
              <Text style={cpStyles.showBtnText}>{show ? '🙈 Hide passwords' : '👁 Show passwords'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handle} disabled={loading} activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 16 }}>
              <LinearGradient
                colors={loading ? ['#93C5FD', '#93C5FD'] : ['#1E3A8A', '#1D4ED8']}
                style={cpStyles.btn}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={cpStyles.btnText}>Update Password</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Telegram support button — blue */}
          <TouchableOpacity style={cpStyles.telegramBtn} onPress={openTelegram} activeOpacity={0.8}>
            <Text style={cpStyles.telegramBtnText}>✈️  Need Help? Chat with us on Telegram</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const cpStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...SHADOW.sm },
  backText: { fontSize: 22, color: '#374151', marginTop: -2 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  card: { margin: 16, borderRadius: 20, backgroundColor: '#FFF', padding: 24, ...SHADOW.md },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#6B7280', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, height: 50, backgroundColor: '#F9FAFB', justifyContent: 'center' },
  inputError: { borderColor: '#EF4444' },
  input: { fontSize: 15, color: '#111827' },
  error: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  showBtn: { alignSelf: 'flex-start', marginTop: 4 },
  showBtnText: { color: '#1D4ED8', fontSize: 13, fontWeight: '500' },
  btn: { height: 52, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  telegramBtn: { marginHorizontal: 16, borderRadius: 14, backgroundColor: '#EFF6FF', paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  telegramBtnText: { color: '#1D4ED8', fontSize: 14, fontWeight: '700' },
});
