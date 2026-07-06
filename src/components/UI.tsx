import { PropsWithChildren, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
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
            backgroundColor: secondary ? palette.card : palette.primary,
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
  const [focused, setFocused] = useState(false);
  const { icon, onFocus, onBlur, ...inputProps } = props;
  return (
    <View
      style={[
        s.field,
        {
          backgroundColor: focused ? palette.card : palette.input,
          borderColor: focused ? palette.primary : palette.border,
          borderWidth: focused ? 2 : 1,
        },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={20}
          color={focused ? palette.primary : palette.muted}
        />
      )}
      <TextInput
        placeholderTextColor={palette.muted}
        {...inputProps}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[s.input, { color: palette.text }, props.style]}
      />
    </View>
  );
}
export function Progress({
  value,
  danger,
  risk,
}: {
  value: number;
  danger?: boolean;
  risk?: boolean;
}) {
  const { palette } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const normalized = Math.min(100, Math.max(0, value));
  useEffect(() => {
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: normalized,
      duration: 750,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [normalized, progress]);
  return (
    <View style={[s.track, { backgroundColor: palette.input }]}>
      <Animated.View
        style={[
          s.fill,
          {
            width: progress.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
            backgroundColor: danger
              ? palette.danger
              : risk
                ? progress.interpolate({
                    inputRange: [0, 40, 65, 85, 100],
                    outputRange: [
                      palette.success,
                      palette.success,
                      "#FACC15",
                      "#F97316",
                      palette.danger,
                    ],
                  })
                : palette.success,
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
  card: { borderWidth: 1, borderRadius: 22, padding: 17 },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 17,
    letterSpacing: 0.35,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: -0.75,
  },
  button: {
    height: 56,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  buttonText: { fontFamily: fonts.semibold, fontSize: 15, letterSpacing: 0.25 },
  field: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 17,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16 },
  track: { height: 7, borderRadius: 99, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 99 },
  empty: { alignItems: "center", padding: 32, gap: 8 },
});
