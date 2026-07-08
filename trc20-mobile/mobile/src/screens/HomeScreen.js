import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api';
import { COLORS, SHADOW } from '../utils/theme';
import AppLogo from '../components/AppLogo';

export default function HomeScreen({ navigation }) {
  const { user, token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const data = await userAPI.getDashboard(token);
      if (data.success) setDashboard(data.data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { fetchDashboard(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchDashboard(); };
  const fmt = (n, dec = 2) => parseFloat(n || 0).toFixed(dec);

  const StatusBadge = ({ status }) => {
    const map = {
      pending: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
      processing: { bg: '#DBEAFE', color: '#1E40AF', label: 'Processing' },
      approved: { bg: '#D1FAE5', color: '#065F46', label: 'Approved' },
      rejected: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
    };
    const s = map[status] || map.pending;
    return (
      <View style={{ backgroundColor: s.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
        <Text style={{ color: s.color, fontSize: 11, fontWeight: '600' }}>{s.label}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const settings = dashboard?.settings || {};
  const stats = dashboard?.stats || {};
  const activity = dashboard?.recentActivity || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EEF2FF' }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Top Bar - NO chat icon */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>
              {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'},
            </Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.iconEmoji}>🔔</Text>
            <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>•</Text></View>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <LinearGradient colors={['#1E3A8A', '#1D4ED8', '#2563EB']} style={styles.balanceCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceAmount}>${fmt(stats.availableBalance, 2)}</Text>
          <Text style={styles.balanceTagline}>⚡ Instant credit  ·  24/7 support  ·  Best rates</Text>
          <View style={styles.balanceBtns}>
            <TouchableOpacity style={styles.balanceBtnBlue} onPress={() => navigation.navigate('Buy')} activeOpacity={0.85}>
              <Text style={styles.balanceBtnText}>↓  Buy USDT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.balanceBtnOutline} onPress={() => navigation.navigate('Withdraw')} activeOpacity={0.85}>
              <Text style={styles.balanceBtnOutlineText}>↑  Withdraw</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Rate Card */}
        <View style={styles.rateCard}>
          <View>
            <Text style={styles.rateLabel}>BUY RATE</Text>
            <Text style={styles.rateValue}>₹{fmt(settings.usdtBuyRate, 2)}</Text>
            <Text style={styles.rateSub}>1 USDT = ₹{fmt(settings.usdtBuyRate, 2)}</Text>
          </View>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
              <Text style={styles.sectionLink}>View all ›</Text>
            </TouchableOpacity>
          </View>

          {activity.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>Make your first purchase to get started.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Buy')} activeOpacity={0.85}>
                <LinearGradient colors={['#1E3A8A', '#1D4ED8']} style={styles.emptyBtnGrad}>
                  <Text style={styles.emptyBtnText}>↓  Buy USDT Now</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            activity.map((item, idx) => (
              <View key={idx} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: item.orderType === 'purchase' ? '#DBEAFE' : '#FEF3C7' }]}>
                  <Text style={{ fontSize: 18 }}>{item.orderType === 'purchase' ? '↓' : '↑'}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{item.orderType === 'purchase' ? 'Buy USDT' : 'Withdrawal'}</Text>
                  <Text style={styles.activityDate}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </View>
                <View style={styles.activityRight}>
                  <Text style={[styles.activityAmount, { color: item.orderType === 'purchase' ? '#10B981' : '#F59E0B' }]}>
                    {item.orderType === 'purchase' ? '+' : '-'}{fmt(item.amount_usdt)} USDT
                  </Text>
                  <StatusBadge status={item.status} />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Refer & Earn — FULL WIDTH, no install app */}
        <TouchableOpacity style={styles.referCard} onPress={() => navigation.navigate('Referral')} activeOpacity={0.9}>
          <LinearGradient colors={['#1E3A8A', '#1D4ED8', '#3B82F6']} style={styles.referCardInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.referTag}>REFER & EARN</Text>
              <Text style={styles.referTitle}>Invite friends, earn USDT</Text>
              <Text style={styles.referSub}>Get bonus USDT for every friend who deposits</Text>
            </View>
            <Text style={{ fontSize: 36 }}>👥</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  greeting: { fontSize: 13, color: '#6B7280' },
  userName: { fontSize: 22, fontWeight: '700', color: '#111827' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...SHADOW.sm, position: 'relative' },
  iconEmoji: { fontSize: 18 },
  notifBadge: { position: 'absolute', top: 4, right: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  notifBadgeText: { color: '#FFF', fontSize: 6, fontWeight: '700' },
  balanceCard: { marginHorizontal: 16, borderRadius: 20, padding: 20, marginBottom: 12, ...SHADOW.blue },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  balanceAmount: { color: '#FFF', fontSize: 42, fontWeight: '700', marginBottom: 8 },
  balanceTagline: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 16 },
  balanceBtns: { flexDirection: 'row', gap: 10 },
  balanceBtnBlue: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  balanceBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  balanceBtnOutline: { flex: 1, backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  balanceBtnOutlineText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  rateCard: { marginHorizontal: 16, borderRadius: 16, backgroundColor: '#FFF', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, ...SHADOW.sm },
  rateLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  rateValue: { fontSize: 26, fontWeight: '700', color: '#111827' },
  rateSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  liveTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  liveText: { color: '#065F46', fontSize: 13, fontWeight: '600' },
  section: { marginHorizontal: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionLink: { color: '#1D4ED8', fontSize: 13, fontWeight: '600' },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', ...SHADOW.sm },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  emptyBtn: { borderRadius: 12, overflow: 'hidden', width: '100%' },
  emptyBtnGrad: { paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 8, ...SHADOW.sm, gap: 12 },
  activityIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  activityInfo: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  activityDate: { fontSize: 12, color: '#9CA3AF' },
  activityRight: { alignItems: 'flex-end', gap: 4 },
  activityAmount: { fontSize: 14, fontWeight: '700' },
  referCard: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden', ...SHADOW.blue },
  referCardInner: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
  referTag: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  referTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  referSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
});
