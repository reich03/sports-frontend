import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WC_IMAGE = require('../../assets/Todo-listo-para-el-sorteo-de-la-Copa-Mundial-de-la-FIFA.webp');
const LOGO_HORIZONTAL = require('../../assets/logo_horizontal_blanco.png');
const LOGO_MUNDIAL = require('../../assets/logo_mundial.png');

const SplashScreen = () => {
  const insets = useSafeAreaInsets();
  const [progress] = useState(new Animated.Value(0));
  const [logoScale] = useState(new Animated.Value(0.9));
  const [logoOpacity] = useState(new Animated.Value(0));
  const [cardOpacity] = useState(new Animated.Value(0));
  const [cardTranslateY] = useState(new Animated.Value(16));
  const [loadingText, setLoadingText] = useState('Cargando predicciones...');
  const [progressPercent, setProgressPercent] = useState(0);
  const bgScale = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 20, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.timing(cardTranslateY, { toValue: 0, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.timing(bgScale, { toValue: 1.06, duration: 8000, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 2200, useNativeDriver: true })
    ).start();

    const animateDot = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.25, duration: 350, useNativeDriver: true }),
        ])
      );
    animateDot(dot1, 0).start();
    animateDot(dot2, 180).start();
    animateDot(dot3, 360).start();

    Animated.timing(progress, { toValue: 1, duration: 3500, useNativeDriver: false }).start();

    const interval = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 100) return 100;
        return prev + 1.5;
      });
    }, 52);

    const textVariations = [
      'Cargando predicciones...',
      'Preparando partidos del Mundial...',
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

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH * 0.5, SCREEN_WIDTH * 0.5],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: bgScale }] }]}>
        <ImageBackground source={WC_IMAGE} style={StyleSheet.absoluteFill} resizeMode="cover">
          <LinearGradient
            colors={['rgba(10,14,20,0.55)', 'rgba(10,14,20,0.82)', 'rgba(10,14,20,0.95)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      </Animated.View>

      <View style={styles.topAccent} />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
      >
        <Animated.View
          style={[
            styles.card,
            { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
          ]}
        >
          <View style={styles.shimmerTrack}>
            <Animated.View style={[styles.shimmerBar, { transform: [{ translateX: shimmerTranslate }] }]}>
              <LinearGradient
                colors={['transparent', 'rgba(0,230,119,0.55)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>

          <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
            <Image source={LOGO_HORIZONTAL} style={styles.logoHorizontal} resizeMode="contain" />
          </Animated.View>

          <Text style={styles.tagline}>Domina tus predicciones deportivas</Text>

          <View style={styles.mundialChip}>
            <Text style={styles.mundialChipText}>FIFA WORLD CUP 2026</Text>
            <Text style={styles.flagsInline}>🇲🇽 🇺🇸 🇨🇦</Text>
          </View>

          {/* Bloque de carga contenido */}
          <View style={styles.statusBox}>
            <View style={styles.progressBarContainer}>
              <Animated.View style={[styles.progressBar, { width: progressWidth }]}>
                <LinearGradient
                  colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusTextCol}>
                <Text style={styles.statusLabel}>INICIANDO</Text>
                <Text style={styles.loadingText} numberOfLines={1}>{loadingText}</Text>
              </View>
              <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
            </View>

            <View style={styles.dotsRow}>
              <Animated.View style={[styles.dot, { opacity: dot1 }]} />
              <Animated.View style={[styles.dot, { opacity: dot2 }]} />
              <Animated.View style={[styles.dot, { opacity: dot3 }]} />
            </View>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <Image source={LOGO_MUNDIAL} style={styles.logoMundial} resizeMode="contain" />
          <Text style={styles.footerText}>© 2026 Master Sport</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.primary,
    opacity: 0.35,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    backgroundColor: 'rgba(15, 20, 26, 0.9)',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(63, 255, 140, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'hidden',
  },
  shimmerTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
  },
  shimmerBar: {
    width: SCREEN_WIDTH * 0.35,
    height: 2,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoHorizontal: {
    width: SCREEN_WIDTH * 0.74,
    height: Math.min(SCREEN_WIDTH * 0.19, 82),
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 14,
  },
  mundialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 230, 119, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.18)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  mundialChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1.2,
  },
  flagsInline: {
    fontSize: 16,
  },
  statusBox: {
    backgroundColor: 'rgba(10, 14, 20, 0.65)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.7)',
    padding: 14,
  },
  progressBarContainer: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusTextCol: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  loadingText: {
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    minWidth: 52,
    textAlign: 'right',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
  },
  footer: {
    alignItems: 'center',
    marginTop: 22,
    gap: 8,
  },
  logoMundial: {
    width: SCREEN_WIDTH * 0.48,
    height: Math.min(SCREEN_WIDTH * 0.18, 72),
    opacity: 0.95,
  },
  footerText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 2,
  },
});

export default SplashScreen;
