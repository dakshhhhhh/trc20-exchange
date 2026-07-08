import React, { useState, useRef, useEffect } from 'react';
import { Animated, View, Image, Text, ActivityIndicator, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';

// ── ANIMATED SPLASH SCREEN ──────────────────────────────────
function AnimatedSplash({ onFinish }) {
  const scale    = useRef(new Animated.Value(0.3)).current;
  const rotate   = useRef(new Animated.Value(0)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const textY    = useRef(new Animated.Value(20)).current;
  const textOp   = useRef(new Animated.Value(0)).current;
  const wrapOp   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo spins in and scales up
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1, tension: 55, friction: 7, useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1, duration: 700, useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1, duration: 500, useNativeDriver: true,
        }),
      ]),
      // 2. App name slides up and fades in
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(textY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
      // 3. Hold
      Animated.delay(900),
      // 4. Fade everything out
      Animated.timing(wrapOp, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] });

  return (
    <Animated.View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#1E3A8A',
      justifyContent: 'center', alignItems: 'center',
      opacity: wrapOp, zIndex: 999,
    }}>
      {/* Logo */}
      <Animated.View style={{
        opacity,
        transform: [{ scale }, { rotate: spin }],
        marginBottom: 24,
      }}>
        <View style={{
          width: 110, height: 110, borderRadius: 28,
          backgroundColor: 'rgba(255,255,255,0.15)',
          justifyContent: 'center', alignItems: 'center',
          borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
        }}>
          <Image
            source={require('./assets/logo.png')}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* App Name */}
      <Animated.View style={{ alignItems: 'center', opacity: textOp, transform: [{ translateY: textY }] }}>
        <Text style={{
          color: '#FFFFFF', fontSize: 36, fontWeight: '800',
          letterSpacing: 6, marginBottom: 8,
        }}>
          CRYPTO
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, letterSpacing: 1 }}>
          Buy & Sell USDT instantly
        </Text>
      </Animated.View>

      {/* Bottom tagline */}
      <View style={{ position: 'absolute', bottom: 48, alignItems: 'center' }}>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Powered by TRC20 Network</Text>
      </View>
    </Animated.View>
  );
}

// ── ROOT NAVIGATOR ──────────────────────────────────────────
function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EEF2FF' }}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }
  return user ? <MainNavigator /> : <AuthNavigator />;
}

// ── APP ──────────────────────────────────────────────────────
export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#1E3A8A" />
        <RootNavigator />
        {!splashDone && (
          <AnimatedSplash onFinish={() => setSplashDone(true)} />
        )}
      </NavigationContainer>
    </AuthProvider>
  );
}
