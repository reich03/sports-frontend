import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { authStyles } from './authStyles';

const WC_IMAGE = require('../../../assets/Todo-listo-para-el-sorteo-de-la-Copa-Mundial-de-la-FIFA.webp');

const AuthScreenLayout = ({ children, header, footer, scrollable = true }) => {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0);

  const paddingTop = header ? insets.top + 28 : Math.max(insets.top + 16, 32);
  const paddingBottom = bottomPad + (footer ? 20 : 24);

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[
        authStyles.scrollContent,
        {
          paddingTop,
          paddingBottom,
          justifyContent: header || footer ? 'flex-start' : 'center',
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      overScrollMode="never"
    >
      {header}
      <View style={authStyles.formCard}>{children}</View>
      {footer}
    </ScrollView>
  ) : (
    <View style={[authStyles.pageContent, { paddingTop, paddingBottom }]}>
      {header}
      <View style={authStyles.formArea}>
        <View style={authStyles.formCard}>{children}</View>
      </View>
      {footer}
    </View>
  );

  return (
    <View style={authStyles.container}>
      <ImageBackground
        source={WC_IMAGE}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(10,14,20,0.72)', 'rgba(10,14,20,0.88)', 'rgba(10,14,20,0.96)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <SafeAreaView style={authStyles.safeArea} edges={['bottom']}>
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView behavior="padding" style={authStyles.keyboardView}>
            {content}
          </KeyboardAvoidingView>
        ) : (
          <View style={authStyles.keyboardView}>{content}</View>
        )}
      </SafeAreaView>
    </View>
  );
};

export default AuthScreenLayout;