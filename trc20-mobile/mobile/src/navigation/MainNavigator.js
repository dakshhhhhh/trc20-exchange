import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/HomeScreen';
import OrdersScreen from '../screens/OrdersScreen';
import BuyScreen from '../screens/BuyScreen';
import WithdrawScreen from '../screens/WithdrawScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PaymentScreen from '../screens/PaymentScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ReferralScreen from '../screens/ReferralScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const BLUE = '#1D4ED8';
const GRAY = '#9CA3AF';

// Clean SVG-like icon components using View
const HomeIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
    {/* roof */}
    <View style={{ position: 'absolute', top: 0, left: size*0.1, right: size*0.1, height: size*0.55,
      borderTopLeftRadius: size*0.15, borderTopRightRadius: size*0.15,
      borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderColor: color }} />
    {/* body */}
    <View style={{ width: size*0.65, height: size*0.48, borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2,
      borderColor: color, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 0 }}>
      {/* door */}
      <View style={{ width: size*0.28, height: size*0.28, borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 2, borderColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
    </View>
  </View>
);

const OrdersIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, borderWidth: 2, borderColor: color, borderRadius: 4, padding: 3, justifyContent: 'space-between' }}>
    {[0,1,2].map(i => (
      <View key={i} style={{ height: 2, backgroundColor: color, borderRadius: 1, width: i === 1 ? '100%' : '75%' }} />
    ))}
  </View>
);

const WithdrawIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: 2, height: size * 0.55, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ position: 'absolute', bottom: size * 0.22,
      borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 0, borderTopWidth: 7,
      borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color }} />
    <View style={{ position: 'absolute', bottom: 0, width: size * 0.75, height: 2, backgroundColor: color, borderRadius: 1 }} />
  </View>
);

const ProfileIcon = ({ color, size = 20 }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
    <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size * 0.225, borderWidth: 2, borderColor: color, marginBottom: 1 }} />
    <View style={{ width: size * 0.82, height: size * 0.38, borderTopLeftRadius: size * 0.4, borderTopRightRadius: size * 0.4, borderWidth: 2, borderBottomWidth: 0, borderColor: color }} />
  </View>
);

function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: '#FFFFFF',
      paddingBottom: Math.max(insets.bottom, 8),
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 16,
    }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isBuy = route.name === 'Buy';

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (isBuy) {
          return (
            <View key={route.key} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -18 }}>
              <TouchableOpacity onPress={onPress} activeOpacity={0.85}
                style={{
                  width: 54, height: 54, borderRadius: 27,
                  backgroundColor: '#1D4ED8',
                  justifyContent: 'center', alignItems: 'center',
                  shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
                }}>
                <Text style={{ color: '#FFF', fontSize: 28, fontWeight: '300', lineHeight: 32 }}>+</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: isFocused ? BLUE : GRAY, fontWeight: '600', marginTop: 4 }}>Buy</Text>
            </View>
          );
        }

        const icons = {
          Home: (c) => <HomeIcon color={c} size={20} />,
          Orders: (c) => <OrdersIcon color={c} size={20} />,
          Withdraw: (c) => <WithdrawIcon color={c} size={20} />,
          Profile: (c) => <ProfileIcon color={c} size={20} />,
        };

        return (
          <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}>
            {icons[route.name]?.(isFocused ? BLUE : GRAY)}
            <Text style={{ fontSize: 10, marginTop: 4, color: isFocused ? BLUE : GRAY, fontWeight: isFocused ? '700' : '500' }}>
              {route.name}
            </Text>
            {isFocused && (
              <View style={{ position: 'absolute', bottom: -8, width: 20, height: 2.5, backgroundColor: BLUE, borderRadius: 2 }} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Buy" component={BuyScreen} />
      <Tab.Screen name="Withdraw" component={WithdrawScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
