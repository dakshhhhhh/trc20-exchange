import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

// size: 'sm' | 'md' | 'lg'
// variant: 'dark' (for white bg) | 'light' (for dark bg)
export default function AppLogo({ size = 'md', variant = 'dark' }) {
  const cfg = {
    sm: { box: 32, img: 22, text: 16, gap: 7 },
    md: { box: 40, img: 28, text: 20, gap: 8 },
    lg: { box: 56, img: 40, text: 28, gap: 10 },
  }[size];

  const textColor = variant === 'light' ? '#FFFFFF' : '#1D4ED8';
  const boxBg     = variant === 'light' ? 'rgba(255,255,255,0.2)' : '#1D4ED8';
  const boxBorder = variant === 'light' ? 'rgba(255,255,255,0.3)' : 'transparent';

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: cfg.gap }}>
      <View style={{
        width: cfg.box, height: cfg.box,
        borderRadius: cfg.box * 0.28,
        backgroundColor: boxBg,
        borderWidth: 1, borderColor: boxBorder,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Image
          source={require('../../assets/logo.png')}
          style={{ width: cfg.img, height: cfg.img }}
          resizeMode="contain"
        />
      </View>
      <Text style={{ fontSize: cfg.text, fontWeight: '800', color: textColor, letterSpacing: 1 }}>
        CRYPTO
      </Text>
    </View>
  );
}
