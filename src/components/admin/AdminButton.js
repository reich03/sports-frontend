import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

const AdminButton = ({ 
  title, 
  onPress, 
  icon, 
  variant = 'primary', 
  size = 'medium',
  loading = false,
  disabled = false,
  style 
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];
    
    if (variant === 'primary') {
      baseStyle.push(styles.primary);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.secondary);
    } else if (variant === 'danger') {
      baseStyle.push(styles.danger);
    } else if (variant === 'outline') {
      baseStyle.push(styles.outline);
    }
    
    if (disabled) {
      baseStyle.push(styles.disabled);
    }
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];
    
    if (variant === 'outline') {
      baseStyle.push(styles.outlineText);
    } else {
      baseStyle.push(styles.solidText);
    }
    
    return baseStyle;
  };

  return (
    <TouchableOpacity 
      style={[...getButtonStyle(), style]} 
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.primary : COLORS.backgroundDark} />
      ) : (
        <>
          {icon && (
            <Ionicons 
              name={icon} 
              size={size === 'small' ? 18 : 20} 
              color={variant === 'outline' ? COLORS.primary : COLORS.backgroundDark} 
              style={styles.icon}
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: `${COLORS.primary}30`,
  },
  danger: {
    backgroundColor: '#ef444420',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: `${COLORS.primary}40`,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: 'bold',
  },
  solidText: {
    color: COLORS.backgroundDark,
  },
  outlineText: {
    color: COLORS.primary,
  },
  icon: {
    marginRight: -4,
  },
});

export default AdminButton;
