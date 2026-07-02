import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, RefreshControl, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../api';
import { SHADOW } from '../utils/theme';

const STATUS_MAP = {
  pending: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  processing: { bg: '#DBEAFE', color: '#1E40AF', label: 'Processing' },
  approved: { bg: '#D1FAE5', color: '#065F46', label: 'Approved' },
  rejected: { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' },
  expired: { bg: '#F3F4F6', color: '#6B7280', label: 'Expired' },
};

const StatusBadge = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.pending;
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
      <Text style={{ color: s.color, fontSize: 12, fontWeight: '700' }}>{s.label}</Text>
    </View>
  );
};

export default function OrdersScreen({ navigation }) {
  const { token } = useAuth();
  const [tab, setTab] = useState('purchases');
  const [purchases, setPurchases] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [withdrawalCount, setWithdrawalCount] = useState(0);

  const fetchOrders = async () => {
    try {
      const [pData, wData] = await Promise.all([
        ordersAPI.getPurchases(token),
        ordersAPI.getWithdrawals(token),
      ]);
      if (pData.success) { setPurchases(pData.orders); setPurchaseCount(pData.total); }
      if (wData.success) { setWithdrawals(wData.orders); setWithdrawalCount(wData.total); }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { fetchOrders(); }, []));

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  const PurchaseItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderItemLeft}>
        <View style={styles.orderItemIcon}>
          <Text style={{ fontSize: 20 }}>↓</Text>
        </View>
        <View style={styles.orderItemInfo}>
          <Text style={styles.orderItemTitle}>Buy USDT</Text>
          <Text style={styles.orderItemId}>{item.order_id}</Text>
          <Text style={styles.orderItemDate}>
            {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      <View style={styles.orderItemRight}>
        <Text style={styles.orderItemUSDT}>+{parseFloat(item.amount_usdt).toFixed(2)} USDT</Text>
        <Text style={styles.orderItemINR}>₹{parseInt(item.amount_inr).toLocaleString('en-IN')}</Text>
        <StatusBadge status={item.status} />
      </View>
    </View>
  );

  const WithdrawalItem = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderItemLeft}>
        <View style={[styles.orderItemIcon, { backgroundColor: '#FEF3C7' }]}>
          <Text style={{ fontSize: 20 }}>↑</Text>
        </View>
        <View style={styles.orderItemInfo}>
          <Text style={styles.orderItemTitle}>Withdrawal</Text>
          <Text style={styles.orderItemId}>{item.order_id}</Text>
          <Text style={styles.orderItemDate} numberOfLines={1}>
            {item.wallet_address.substring(0, 10)}...{item.wallet_address.slice(-6)}
          </Text>
          <Text style={styles.orderItemDate}>
            {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>
      <View style={styles.orderItemRight}>
        <Text style={[styles.orderItemUSDT, { color: '#F59E0B' }]}>-{parseFloat(item.amount_usdt).toFixed(2)} USDT</Text>
        {item.fee_usdt > 0 && (
          <Text style={styles.feeText}>Fee: {item.fee_usdt} USDT</Text>
        )}
        {item.is_free_withdrawal && (
          <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>🎁 Free</Text></View>
        )}
        <StatusBadge status={item.status} />
      </View>
    </View>
  );

  const EmptyState = ({ type }) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🛒</Text>
      <Text style={styles.emptyTitle}>No {type} yet</Text>
      <Text style={styles.emptySub}>
        {type === 'purchases'
          ? 'Buy USDT with UPI and it\'ll show up here, credited in minutes.'
          : 'Withdraw USDT to your wallet and track status here.'
        }
      </Text>
      {type === 'purchases' && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Buy')}
          activeOpacity={0.85}
          style={styles.emptyBtn}
        >
          <LinearGradient colors={['#1E3A8A', '#1D4ED8']} style={styles.emptyBtnGrad}>
            <Text style={styles.emptyBtnText}>↓  Buy your first USDT</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  const data = tab === 'purchases' ? purchases : withdrawals;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tab, tab === 'purchases' && styles.tabActive]}
          onPress={() => setTab('purchases')}
        >
          <Text style={[styles.tabText, tab === 'purchases' && styles.tabTextActive]}>
            Purchases  {purchaseCount > 0 && <Text style={styles.tabCount}>{purchaseCount}</Text>}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'withdrawals' && styles.tabActive]}
          onPress={() => setTab('withdrawals')}
        >
          <Text style={[styles.tabText, tab === 'withdrawals' && styles.tabTextActive]}>
            Withdrawals  {withdrawalCount > 0 && <Text style={styles.tabCount}>{withdrawalCount}</Text>}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1D4ED8" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          renderItem={({ item }) =>
            tab === 'purchases' ? <PurchaseItem item={item} /> : <WithdrawalItem item={item} />
          }
          ListEmptyComponent={<EmptyState type={tab} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1D4ED8" />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...SHADOW.sm },
  backText: { fontSize: 22, color: '#374151', marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  tabSwitcher: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#FFF', borderRadius: 14, padding: 4, marginBottom: 12, ...SHADOW.sm },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#1D4ED8' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#FFF' },
  tabCount: { fontSize: 11 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  orderItem: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...SHADOW.sm },
  orderItemLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  orderItemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' },
  orderItemInfo: { flex: 1 },
  orderItemTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  orderItemId: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 2 },
  orderItemDate: { fontSize: 11, color: '#9CA3AF' },
  orderItemRight: { alignItems: 'flex-end', gap: 4 },
  orderItemUSDT: { fontSize: 15, fontWeight: '700', color: '#10B981' },
  orderItemINR: { fontSize: 12, color: '#6B7280' },
  feeText: { fontSize: 11, color: '#9CA3AF' },
  freeBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  freeBadgeText: { fontSize: 10, color: '#065F46', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { borderRadius: 14, overflow: 'hidden', width: '100%' },
  emptyBtnGrad: { paddingVertical: 14, alignItems: 'center' },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
