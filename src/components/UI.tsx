import { PropsWithChildren, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
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

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof AccessibilityInfo.isReduceMotionEnabled !== "function") return;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => sub.remove();
  }, []);
  return reduce;
}

export function Card({
  children,
  style,
  delay = 0,
}: PropsWithChildren<{ style?: object; delay?: number }>) {
  const { palette } = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(entrance, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 160,
        mass: 0.9,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [entrance, delay]);
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
                outputRange: [16, 0],
              }),
            },
            {
              scale: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [0.97, 1],
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
      damping: 14,
      stiffness: 320,
      mass: 0.45,
    }).start();
  };
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animatePress(0.96)}
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
  const reduceMotion = useReduceMotion();
  const progress = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const normalized = Math.min(100, Math.max(0, value));
  useEffect(() => {
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: normalized,
      duration: reduceMotion ? 0 : 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [normalized, progress, reduceMotion]);
  useEffect(() => {
    if (reduceMotion) {
      shimmer.stopAnimation();
      shimmer.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, reduceMotion]);
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
      >
        <Animated.View
          style={[
            s.shimmer,
            {
              opacity: shimmer.interpolate({
                inputRange: [0, 1],
                outputRange: [0.15, 0.55],
              }),
              transform: [
                {
                  translateX: shimmer.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-60, 60],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
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
  track: { height: 8, borderRadius: 99, overflow: "hidden" },
  fill: {
    height: "100%",
    borderRadius: 99,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: -4,
    bottom: -4,
    width: 48,
    borderRadius: 99,
    backgroundColor: "#fff",
    transform: [{ rotate: "12deg" }],
  },
  empty: { alignItems: "center", padding: 32, gap: 8 },
});
