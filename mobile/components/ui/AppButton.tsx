import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from "react-native";
import { COLORS, RADIUS, SHADOWS } from "../../constants/theme";

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function AppButton({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  ...rest
}: AppButtonProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: COLORS.primaryBright,
          borderColor: COLORS.primaryBright,
          borderWidth: 1,
        };
      case "secondary":
        return {
          backgroundColor: COLORS.surfaceStrong,
          borderColor: COLORS.border,
          borderWidth: 1,
        };
      case "danger":
        return {
          backgroundColor: COLORS.destructive,
          borderColor: COLORS.destructive,
          borderWidth: 1,
          ...SHADOWS.glowDanger,
        };
      case "outline":
        return {
          backgroundColor: COLORS.surface,
          borderColor: COLORS.border,
          borderWidth: 1,
        };
      case "ghost":
        return {
          backgroundColor: "transparent",
          borderColor: "transparent",
          borderWidth: 0,
        };
      default:
        return {};
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return COLORS.textInverse;
      case "danger":
        return "#ffffff";
      case "outline":
      case "secondary":
        return COLORS.text;
      case "ghost":
        return COLORS.primary;
      default:
        return COLORS.text;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return { height: 38, paddingHorizontal: 12 };
      case "lg":
        return { height: 50, paddingHorizontal: 20 };
      default:
        return { height: 44, paddingHorizontal: 16 };
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[
        styles.button,
        getVariantStyles(),
        getSizeStyles(),
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
          {icon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
  },
});
