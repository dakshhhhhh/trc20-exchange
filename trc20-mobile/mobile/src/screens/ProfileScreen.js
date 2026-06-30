import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Clipboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api';
import { SHADOW } from '../utils/theme';

export default function ProfileScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const data = await userAPI.getDashboard(token);
        if (data.success) setDashboard(data.data);
      } catch {}
    })();
  }, []));

  const stats = dashboard?.stats || {};
  const settings = dashboard?.settings || {};
  const freeLeft = stats.freeWithdrawalsRemaining ?? 3;

  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '';

  const lastLogin = user?.lastLogin
    ? new Date(user.lastLogin).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}><Text style={styles.logoIcon}>⟨⟩</Text></View>
          <Text style={styles.logoText}>TRC20</Text>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text style={{ fontSize: 18 }}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Card */}
      <LinearGradient colors={['#1E3A8A', '#1D4ED8', '#2563EB']} style={styles.profileCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileEmail}>{user?.email || ''}</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phoneIcon}>📞</Text>
              <Text style={styles.profilePhone}>{user?.phone || ''}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statusRow}>
          <View style={styles.activeIndicator} />
          <Text style={styles.activeText}>Account active</Text>
          <Text style={styles.memberSince}>  Member since {memberSince}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.userIdRow}>
          <View>
            <Text style={styles.userIdLabel}>USER ID</Text>
            <Text style={styles.userId}>{user?.userCode || ''}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => copyToClipboard(user?.userCode || '', 'User ID')}
          >
            <Text style={styles.copyBtnText}>⎘ Copy</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💳</Text>
          <Text style={styles.statValue}>${parseFloat(stats.availableBalance || 0).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Available balance</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>↓</Text>
          <Text style={styles.statValue}>${parseFloat(stats.pendingPurchases || 0).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Pending purchases</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>↑</Text>
          <Text style={styles.statValue}>${parseFloat(stats.pendingWithdrawals || 0).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Pending withdrawals</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🎁</Text>
          <Text style={styles.statValue}>{parseFloat(user?.referralEarned || 0).toFixed(0)} USDT</Text>
          <Text style={styles.statLabel}>Referral earned</Text>
        </View>
      </View>

      {/* Free Withdrawals Banner */}
      <View style={styles.freeBanner}>
        <Text style={styles.freeBannerIcon}>🎁</Text>
        <View>
          <Text style={styles.freeBannerTitle}>{freeLeft} free withdrawals remaining</Text>
          <Text style={styles.freeBannerSub}>Your first {dashboard?.settings?.freeWithdrawalsCount || 3} withdrawals carry no network fee.</Text>
        </View>
      </View>

      {/* Order History */}
      <Text style={styles.sectionTitle}>ORDER HISTORY</Text>
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => { navigation.navigate('Orders'); }}>
          <View style={[styles.menuItemIcon, { backgroundColor: '#ECFDF5' }]}>
            <Text style={{ fontSize: 18 }}>↓</Text>
          </View>
          <Text style={styles.menuItemText}>Purchase history</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menuItem} onPress={() => { navigation.navigate('Orders'); }}>
          <View style={[styles.menuItemIcon, { backgroundColor: '#FEF3C7' }]}>
            <Text style={{ fontSize: 18 }}>↑</Text>
          </View>
          <Text style={styles.menuItemText}>Withdrawal history</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Referral Card */}
      <LinearGradient colors={['#1E3A8A', '#1D4ED8', '#3B82F6']} style={styles.referralCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <Text style={styles.referralTag}>REFER & EARN</Text>
        <Text style={styles.referralTitle}>Invite friends, earn USDT</Text>
        <Text style={styles.referralSub}>
          You've earned <Text style={styles.referralBold}>{parseFloat(user?.referralEarned || 0).toFixed(0)} USDT</Text> from 0 active referrals so far.
        </Text>
        <TouchableOpacity
          style={styles.referralCodeBox}
          onPress={() => copyToClipboard(user?.referralCode || '', 'Referral code')}
        >
          <Text style={styles.referralCodeLabel}>CODE  </Text>
          <Text style={styles.referralCode}>{user?.referralCode || ''}</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.referralHubLink}>Open Referral Hub →</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Security */}
      <Text style={styles.sectionTitle}>SECURITY</Text>
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ChangePassword')}>
          <View style={[styles.menuItemIcon, { backgroundColor: '#FEF3C7' }]}>
            <Text style={{ fontSize: 18 }}>🔒</Text>
          </View>
          <Text style={styles.menuItemText}>Change Password</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Support */}
      <Text style={styles.sectionTitle}>SUPPORT</Text>
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuItemIcon, { backgroundColor: '#ECFDF5' }]}>
            <Text style={{ fontSize: 18 }}>💬</Text>
          </View>
          <Text style={styles.menuItemText}>WhatsApp Support</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuItemIcon, { backgroundColor: '#EFF6FF' }]}>
            <Text style={{ fontSize: 18 }}>✈️</Text>
          </View>
          <Text style={styles.menuItemText}>Telegram Support</Text>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* App */}
      <Text style={styles.sectionTitle}>APP</Text>
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuItemIcon, { backgroundColor: '#EFF6FF' }]}>
            <Text style={{ fontSize: 18 }}>📲</Text>
          </View>
          <Text style={styles.menuItemText}>Install TRC20.IN App</Text>
          <View style={styles.installBtn}>
            <Text style={styles.installBtnText}>↓ Install App</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.signOutText}>→  Sign Out</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>TRC20.IN · Version 2.0 · Secure Session</Text>
        <Text style={styles.footerText}>UID: {user?.userCode}  ·  Last login: {lastLogin}</Text>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2FF' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1D4ED8', justifyContent: 'center', alignItems: 'center' },
  logoIcon: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  logoText: { fontSize: 20, fontWeight: '700', color: '#1D4ED8' },
  topBarActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...SHADOW.sm, position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: '700' },
  profileCard: { marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 12, ...SHADOW.blue },
  avatarRow: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  profileEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  phoneIcon: { fontSize: 12 },
  profilePhone: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  activeIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  activeText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  memberSince: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  userIdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userIdLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  userId: { color: '#FFF', fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  copyBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  copyBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, gap: 10, marginBottom: 12 },
  statCard: { width: '47%', backgroundColor: '#FFF', borderRadius: 14, padding: 14, ...SHADOW.sm },
  statIcon: { fontSize: 22, marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#6B7280' },
  freeBanner: { marginHorizontal: 16, backgroundColor: '#ECFDF5', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  freeBannerIcon: { fontSize: 26 },
  freeBannerTitle: { fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 2 },
  freeBannerSub: { fontSize: 12, color: '#047857' },
  sectionTitle: { marginHorizontal: 16, fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  menuCard: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12, ...SHADOW.sm, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuItemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#111827' },
  menuItemArrow: { fontSize: 20, color: '#9CA3AF' },
  menuDivider: { height: 1, backgroundColor: '#F9FAFB', marginHorizontal: 14 },
  installBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1.5, borderColor: '#DBEAFE' },
  installBtnText: { color: '#1D4ED8', fontSize: 12, fontWeight: '600' },
  referralCard: { marginHorizontal: 16, borderRadius: 18, padding: 20, marginBottom: 12, ...SHADOW.blue },
  referralTag: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  referralTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 6 },
  referralSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16, lineHeight: 20 },
  referralBold: { fontWeight: '700', color: '#FFF' },
  referralCodeBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14, alignSelf: 'flex-start' },
  referralCodeLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  referralCode: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  referralHubLink: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  signOutBtn: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FFF7F7', paddingVertical: 16, alignItems: 'center', marginBottom: 14 },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
  footer: { alignItems: 'center', paddingBottom: 10 },
  footerText: { fontSize: 11, color: '#9CA3AF', marginBottom: 2 },
});
