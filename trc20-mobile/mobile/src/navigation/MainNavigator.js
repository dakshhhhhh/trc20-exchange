import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import BuyScreen from '../screens/BuyScreen';
import WithdrawScreen from '../screens/WithdrawScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PaymentScreen from '../screens/PaymentScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const BLUE = '#1D4ED8';
const GRAY = '#9CA3AF';
const BG = '#FFFFFF';

// Custom Tab Bar Icon components
const HomeIcon = ({ color }) => (
  <View style={{ alignItems: 'center' }}>
    <View style={{ width: 22, height: 22 }}>
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, borderWidth: 2, borderColor: color, borderRadius: 2 }} />
      <View style={{ position: 'absolute', top: 0, left: 3, right: 3, height: 12, borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 2, borderColor: color, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
    </View>
  </View>
);

const OrdersIcon = ({ color }) => (
  <View style={{ width: 22, height: 22, borderWidth: 2, borderColor: color, borderRadius: 3, justifyContent: 'center', padding: 3, gap: 2 }}>
    <View style={{ height: 2, backgroundColor: color, borderRadius: 1, width: '70%' }} />
    <View style={{ height: 2, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ height: 2, backgroundColor: color, borderRadius: 1, width: '80%' }} />
  </View>
);

const BuyIcon = ({ focused }) => (
  <View style={{
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: focused ? '#1E40AF' : BLUE,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
    marginBottom: 10
  }}>
    <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '300', marginTop: -2 }}>+</Text>
  </View>
);

const WithdrawIcon = ({ color }) => (
  <View style={{ alignItems: 'center', width: 22, height: 22 }}>
    <View style={{ width: 2, height: 14, backgroundColor: color, marginBottom: 2 }} />
    <View style={{ borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 8, borderColor: 'transparent', borderTopColor: color }} />
    <View style={{ height: 2, width: 16, backgroundColor: color, marginTop: 1 }} />
  </View>
);

const ProfileIcon = ({ color }) => (
  <View style={{ alignItems: 'center', width: 22, height: 22 }}>
    <View style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: color, marginBottom: 1 }} />
    <View style={{ width: 20, height: 8, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderWidth: 2, borderBottomWidth: 0, borderColor: color }} />
  </View>
);

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: BG,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: GRAY,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color }) => <OrdersIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Buy"
        component={BuyScreen}
        options={{
          tabBarLabel: 'Buy',
          tabBarIcon: ({ focused }) => <BuyIcon focused={focused} />,
          tabBarItemStyle: { marginTop: -8 },
        }}
      />
      <Tab.Screen
        name="Withdraw"
        component={WithdrawScreen}
        options={{
          tabBarIcon: ({ color }) => <WithdrawIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
}
