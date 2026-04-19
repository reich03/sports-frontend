import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

const AdminHeader = ({ title, subtitle, onBack, rightIcon, onRightPress }) => {
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight : 44;
  
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="rgba(10, 14, 20, 0.95)" />
      <View style={[styles.header, { paddingTop: statusBarHeight + 16 }]}>
        <View style={styles.leftSection}>
        {onBack && (
          <TouchableOpacity style={styles.iconButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 255, 140, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#1b2028',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151a21',
    borderWidth: 1,
    borderColor: 'rgba(63, 255, 140, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 11,
    color: '#a8abb3',
    fontWeight: '600',
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1b2028',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminHeader;
