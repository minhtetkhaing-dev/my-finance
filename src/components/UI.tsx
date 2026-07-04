import { PropsWithChildren, useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { fonts, shadow } from "../theme";

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: object }>) {
  const { palette } = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    }).start();
  }, [entrance]);
  return (
    <Animated.View
      style={[
        s.card,
        shadow,
        { backgroundColor: palette.card, borderColor: palette.border },
        style,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
export function Label({
  children,
  style,
}: PropsWithChildren<{ style?: object }>) {
  const { palette } = useTheme();
  return (
    <Text style={[s.label, { color: palette.muted }, style]}>{children}</Text>
  );
}
export function Title({
  children,
  style,
}: PropsWithChildren<{ style?: object }>) {
  const { palette } = useTheme();
  return (
    <Text style={[s.title, { color: palette.text }, style]}>{children}</Text>
  );
}
export function Button({
  title,
  onPress,
  secondary,
  icon,
  disabled,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  const { palette } = useTheme();
  const pressScale = useRef(new Animated.Value(1)).current;
  const animatePress = (toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      useNativeDriver: true,
      damping: 16,
      stiffness: 320,
      mass: 0.45,
    }).start();
  };
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animatePress(0.965)}
      onPressOut={() => animatePress(1)}
      android_ripple={{
        color: secondary ? palette.primarySoft : "rgba(255,255,255,.2)",
      }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={[
          s.button,
          {
            backgroundColor: secondary ? "transparent" : palette.primary,
            borderColor: palette.primary,
            transform: [{ scale: pressScale }],
          },
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={secondary ? palette.primary : "#fff"}
          />
        )}
        <Text
          style={[
            s.buttonText,
            { color: secondary ? palette.primary : "#fff" },
          ]}
        >
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
export function Field(
  props: TextInputProps & { icon?: keyof typeof Ionicons.glyphMap },
) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        s.field,
        { backgroundColor: palette.input, borderColor: palette.border },
      ]}
    >
      {props.icon && (
        <Ionicons name={props.icon} size={20} color={palette.muted} />
      )}
      <TextInput
        placeholderTextColor={palette.muted}
        {...props}
        style={[s.input, { color: palette.text }, props.style]}
      />
    </View>
  );
}
export function Progress({
  value,
  danger,
}: {
  value: number;
  danger?: boolean;
}) {
  const { palette } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const normalized = Math.min(100, Math.max(2, value));
  useEffect(() => {
    Animated.timing(progress, {
      toValue: normalized,
      duration: 550,
      useNativeDriver: false,
    }).start();
  }, [normalized, progress]);
  return (
    <View style={[s.track, { backgroundColor: palette.primarySoft }]}>
      <Animated.View
        style={[
          s.fill,
          {
            width: progress.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
            backgroundColor: danger ? palette.danger : palette.success,
          },
        ]}
      />
    </View>
  );
}
export function Empty({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  const { palette } = useTheme();
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={38} color={palette.muted} />
      <Title style={{ fontSize: 18 }}>{title}</Title>
      <Label style={{ textAlign: "center" }}>{text}</Label>
    </View>
  );
}
const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 18 },
  label: { fontFamily: fonts.mono, fontSize: 12, lineHeight: 18 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32 },
  button: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: 16 },
  field: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16 },
  track: { height: 9, borderRadius: 9, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 8 },
  empty: { alignItems: "center", padding: 32, gap: 8 },
});
