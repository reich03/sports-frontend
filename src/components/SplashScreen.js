import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

const SplashScreen = () => {
  const [progress] = useState(new Animated.Value(0));
  const [logoScale] = useState(new Animated.Value(0.8));
  const [logoOpacity] = useState(new Animated.Value(0));
  const [textOpacity] = useState(new Animated.Value(0));
    const [loadingText, setLoadingText] = useState('Cargando predicciones...');
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    // Logo animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Text fade in
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 800,
      delay: 300,
      useNativeDriver: true,
    }).start();

    // Progress bar animation (más lento para apreciar)
    Animated.timing(progress, {
      toValue: 1,
      duration: 3500,
      useNativeDriver: false,
    }).start();

    // Update percentage (más lento)
    const interval = setInterval(() => {
      setProgressPercent(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1.5;
      });
    }, 52);

    // Loading text variations
    const textVariations = [
      'Cargando predicciones...',
      'Preparando partidos...',
      'Sincronizando datos...',
      '¡Casi listo!',
    ];
    let textIndex = 0;
    const textInterval = setInterval(() => {
      textIndex = (textIndex + 1) % textVariations.length;
      setLoadingText(textVariations[textIndex]);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(textInterval);
    };
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Logo Section */}
      <Animated.View 
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          }
        ]}
      >
        <View style={styles.logoBox}>
          <Image
            source={require('../../assets/IconoMasterSports.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Brand Name */}
      <Animated.View style={[styles.brandContainer, { opacity: textOpacity }]}>
        <Text style={styles.brandText}>
          MASTER<Text style={styles.brandTextGreen}>SPORTS</Text>
        </Text>
        <Text style={styles.tagline}>ELIGE · COMPITE · GANA</Text>
      </Animated.View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressBarContainer}>
          <Animated.View 
            style={[
              styles.progressBar,
              { width: progressWidth }
            ]} 
          />
        </View>
        <Text style={styles.progressPercent}>{progressPercent}%</Text>
      </View>

      {/* Loading Text */}
      <Text style={styles.loadingText}>{loadingText}</Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 MASTER SPORTS</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1a0f',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoBox: {
    width: 130,
    height: 130,
    backgroundColor: '#ffffff',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00000088',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 14,
    padding: 14,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 8,
  },
  brandTextGreen: {
    color: COLORS.primary,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 3,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(0, 230, 119, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 2,
  },
});

export default SplashScreen;
