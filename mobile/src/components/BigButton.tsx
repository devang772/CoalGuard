import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface BigButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  icon?: keyof typeof Feather.glyphMap;
  showArrow?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const BigButton: React.FC<BigButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  showArrow = true,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#1E293B';
    switch (variant) {
      case 'primary': return colors.emerald;
      case 'secondary': return colors.cardBackground;
      case 'danger': return colors.danger;
      case 'success': return colors.success;
      case 'outline': return 'transparent';
      default: return colors.emerald;
    }
  };

  const getTextColor = () => {
    if (disabled) return '#64748B';
    if (variant === 'primary') return '#05080A';
    if (variant === 'outline') return colors.emerald;
    return '#FFFFFF';
  };

  const getBorderColor = () => {
    if (variant === 'secondary') return colors.cardBorder;
    if (variant === 'outline') return colors.emerald;
    return 'transparent';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: getBorderColor() !== 'transparent' ? 1.5 : 0,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon && <Feather name={icon} size={20} color={getTextColor()} style={{ marginRight: 8 }} />}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
          {showArrow && variant === 'primary' && (
            <Feather name="arrow-right" size={20} color={getTextColor()} style={{ marginLeft: 8 }} />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: colors.emerald,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  text: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
