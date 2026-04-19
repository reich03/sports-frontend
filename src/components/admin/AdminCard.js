import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';

const AdminCard = ({ children, style, variant = 'default' }) => {
  const getCardStyle = () => {
    const baseStyle = [styles.card];
    
    if (variant === 'primary') {
      baseStyle.push(styles.primaryCard);
    } else if (variant === 'highlight') {
      baseStyle.push(styles.highlightCard);
    }
    
    return baseStyle;
  };

  return (
    <View style={[...getCardStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  primaryCard: {
    backgroundColor: `${COLORS.primary}15`,
    borderColor: `${COLORS.primary}30`,
  },
  highlightCard: {
    backgroundColor: COLORS.cardDark,
    borderColor: `${COLORS.primary}10`,
  },
});

export default AdminCard;
