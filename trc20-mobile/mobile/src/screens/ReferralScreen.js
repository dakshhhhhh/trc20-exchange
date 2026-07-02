import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Clipboard, Alert, Share
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { referralAPI } from '../api';
import { SHADOW } from '../utils/theme';

export default function ReferralScreen({ navigation }) {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    referralAPI.getStats(token)
      .then(r => { if (r.success) setData(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const copyCode = () => {
    Clipboard.setString(user?.referralCode || '');
    Alert.alert('Copied!', 'Referral code copied to clipboard');
  };

  const shareCode = () => {
    Share.share({
      message: `Join TRC20 — Buy USDT instantly with UPI!\nUse my referral code: ${user?.referralCode}\n\nSign up and get started today.`,
      title: 'Invite to TRC20',
    });
  };

  const stats = data?.stats || {};
  const referredUsers = data?.referredUsers || [];

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EEF2FF' }} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Referral Hub</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Hero Banner */}
        <LinearGradient colors={['#1E3A8A', '#1D4ED8', '#3B82F6']} style={s.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={s.heroEmoji}>👥</Text>
          <Text style={s.heroTitle}>Invite friends, earn USDT</Text>
          <Text style={s.heroSub}>
            Earn <Text style={{ fontWeight: '800', color: '#FFF' }}>{stats.commissionPerReferral} USDT</Text> for every friend who joins and makes their first deposit.
          </Text>

          {/* Referral Code */}
          <View style={s.codeBox}>
            <View style={s.codeInner}>
              <Text style={s.codeLabel}>YOUR CODE</Text>
              <Text style={s.codeText}>{user?.referralCode || '—'}</Text>
            </View>
            <TouchableOpacity style={s.copyBtn} onPress={copyCode} activeOpacity={0.7}>
              <Text style={s.copyBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.shareBtn} onPress={shareCode} activeOpacity={0.85}>
            <Text style={s.shareBtnText}>↑  Share Referral Code</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{stats.totalReferred || 0}</Text>
            <Text style={s.statLabel}>Total Referred</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { color: '#10B981' }]}>{stats.qualifiedReferrals || 0}</Text>
            <Text style={s.statLabel}>Deposited ✅</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { color: '#F59E0B' }]}>{stats.pendingReferrals || 0}</Text>
            <Text style={s.statLabel}>Pending ⏳</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statNum, { color: '#1D4ED8' }]}>{parseFloat(stats.totalEarned || 0).toFixed(1)}</Text>
            <Text style={s.statLabel}>USDT Earned</Text>
          </View>
        </View>

        {/* How it works */}
        <View style={s.card}>
          <Text style={s.cardTitle}>How it works</Text>
          {[
            { step: '1', title: 'Share your code', desc: `Share your referral code ${user?.referralCode} with friends.` },
            { step: '2', title: 'Friend registers', desc: 'Your friend signs up using your referral code.' },
            { step: '3', title: 'Friend deposits', desc: `When they make their first deposit (min ₹${stats.minDepositInr || 500}), you earn your commission.` },
            { step: '4', title: `Earn ${stats.commissionPerReferral} USDT`, desc: 'Commission is instantly added to your available balance.' },
          ].map((item) => (
            <View key={item.step} style={s.howStep}>
              <View style={s.howNum}><Text style={s.howNumText}>{item.step}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.howTitle}>{item.title}</Text>
                <Text style={s.howDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Referred Users List */}
        {referredUsers.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Your Referrals ({referredUsers.length})</Text>
            {referredUsers.map((u, i) => (
              <View key={i} style={s.referredUser}>
                <View style={s.referredAvatar}>
                  <Text style={s.referredAvatarText}>{u.name?.[0]?.toUpperCase() || 'U'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.referredName}>{u.name}</Text>
                  <Text style={s.referredDate}>Joined {new Date(u.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </View>
                <View style={[s.referredStatus, { backgroundColor: u.hasDeposited ? '#D1FAE5' : '#FEF3C7' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: u.hasDeposited ? '#065F46' : '#92400E' }}>
                    {u.hasDeposited ? '✅ Earned' : '⏳ Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {referredUsers.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>👋</Text>
            <Text style={s.emptyTitle}>No referrals yet</Text>
            <Text style={s.emptySub}>Share your code and start earning USDT for every friend who joins!</Text>
            <TouchableOpacity style={s.shareBtn2} onPress={shareCode}>
              <LinearGradient colors={['#1E3A8A', '#1D4ED8']} style={s.shareBtn2Inner}>
                <Text style={s.shareBtnText}>↑  Share Your Code</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Terms */}
        <View style={s.termsCard}>
          <Text style={s.termsTitle}>📋 Terms & Conditions</Text>
          <Text style={s.termsText}>{stats.terms || 'Commission is credited only when your referred friend makes their first successful deposit. You must use a valid referral code at signup. Commission is credited instantly upon admin approval of the referred user\'s first deposit.'}</Text>
          <View style={s.termsList}>
            {[
              `Earn ${stats.commissionPerReferral} USDT per qualified referral`,
              `Referred friend must deposit minimum ₹${stats.minDepositInr || 500}`,
              'Commission credited only on FIRST deposit of referred user',
              'Referral must be registered before first deposit',
              'No limit on number of referrals you can make',
              'Commission is added directly to your available balance',
            ].map((t, i) => (
              <View key={i} style={s.termItem}>
                <Text style={s.termDot}>•</Text>
                <Text style={s.termText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...SHADOW.sm },
  backText: { fontSize: 22, color: '#374151', marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  hero: { marginHorizontal: 16, borderRadius: 20, padding: 22, ...SHADOW.blue, marginBottom: 16 },
  heroEmoji: { fontSize: 36, marginBottom: 8 },
  heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, marginBottom: 12, gap: 12 },
  codeInner: { flex: 1 },
  codeLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 },
  codeText: { color: '#FFF', fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  copyBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  copyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  shareBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
  shareBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 12, alignItems: 'center', ...SHADOW.sm },
  statNum: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#6B7280', fontWeight: '600', textAlign: 'center' },
  card: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 14, ...SHADOW.sm },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  howStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  howNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  howNumText: { fontSize: 14, fontWeight: '800', color: '#1D4ED8' },
  howTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 3 },
  howDesc: { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  referredUser: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  referredAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  referredAvatarText: { fontSize: 16, fontWeight: '700', color: '#1D4ED8' },
  referredName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  referredDate: { fontSize: 11, color: '#9CA3AF' },
  referredStatus: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  emptyCard: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 28, alignItems: 'center', ...SHADOW.sm, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  shareBtn2: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  shareBtn2Inner: { paddingVertical: 14, alignItems: 'center' },
  termsCard: { marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 18, marginBottom: 14, ...SHADOW.sm, borderLeftWidth: 4, borderLeftColor: '#1D4ED8' },
  termsTitle: { fontSize: 14, fontWeight: '700', color: '#1E3A8A', marginBottom: 10 },
  termsText: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 14 },
  termsList: { gap: 8 },
  termItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  termDot: { color: '#1D4ED8', fontWeight: '700', fontSize: 16, lineHeight: 20 },
  termText: { flex: 1, fontSize: 12, color: '#374151', lineHeight: 18 },
});
