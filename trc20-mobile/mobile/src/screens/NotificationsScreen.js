import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api';
import { SHADOW } from '../utils/theme';

export function NotificationsScreen({ navigation }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const data = await userAPI.getNotifications(token);
      if (data.success) setNotifications(data.notifications);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetch(); userAPI.markNotificationsRead(token); }, []);
  const onRefresh = () => { setRefreshing(true); fetch(); };

  const typeMap = {
    success: { bg: '#D1FAE5', color: '#065F46', icon: '✅' },
    error: { bg: '#FEE2E2', color: '#991B1B', icon: '❌' },
    warning: { bg: '#FEF3C7', color: '#92400E', icon: '⚠️' },
    info: { bg: '#DBEAFE', color: '#1E40AF', icon: 'ℹ️' },
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#EEF2FF' }}>
      <View style={nStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={nStyles.backBtn}>
          <Text style={nStyles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={nStyles.title}>Notifications</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#1D4ED8" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔔</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>No notifications yet</Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>You're all caught up!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const t = typeMap[item.type] || typeMap.info;
            return (
              <View style={[nStyles.notifCard, !item.is_read && nStyles.notifUnread]}>
                <View style={[nStyles.notifIconBox, { backgroundColor: t.bg }]}>
                  <Text style={{ fontSize: 18 }}>{t.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={nStyles.notifTitle}>{item.title}</Text>
                  <Text style={nStyles.notifMessage}>{item.message}</Text>
                  <Text style={nStyles.notifTime}>
                    {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const nStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...SHADOW.sm },
  backText: { fontSize: 22, color: '#374151', marginTop: -2 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  notifCard: { flexDirection: 'row', gap: 12, backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, ...SHADOW.sm },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: '#1D4ED8' },
  notifIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  notifMessage: { fontSize: 13, color: '#374151', lineHeight: 18, marginBottom: 6 },
  notifTime: { fontSize: 11, color: '#9CA3AF' },
});

export default NotificationsScreen;
