import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export function AmbientDecorations() {
  const { palette, isDark } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const one = useRef(new Animated.Value(0)).current;
  const two = useRef(new Animated.Value(0)).current;
  const three = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typeof AccessibilityInfo.isReduceMotionEnabled !== "function") return;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      one.stopAnimation();
      two.stopAnimation();
      three.stopAnimation();
      one.setValue(0.45);
      two.setValue(0.55);
      three.setValue(0.4);
      return;
    }
    const float = (value: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
    const animations = [
      float(one, 9500, 0),
      float(two, 12000, 800),
      float(three, 14500, 1600),
    ];
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [one, reduceMotion, three, two]);

  return (
    <View pointerEvents="none" accessibilityElementsHidden style={styles.layer}>
      <Animated.View
        style={[
          styles.orb,
          styles.orbOne,
          {
            backgroundColor: `${palette.primary}${isDark ? "24" : "20"}`,
            borderColor: `${palette.primary}38`,
            transform: [
              {
                translateY: one.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -18],
                }),
              },
              {
                translateX: one.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 9],
                }),
              },
              {
                scale: one.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1.04],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbTwo,
          {
            backgroundColor: `${palette.highlight}${isDark ? "20" : "24"}`,
            borderColor: `${palette.highlight}38`,
            transform: [
              {
                translateY: two.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-6, 15],
                }),
              },
              {
                translateX: two.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -11],
                }),
              },
              {
                rotate: two.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["-4deg", "5deg"],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orbThree,
          {
            backgroundColor: `${palette.success}${isDark ? "20" : "1E"}`,
            borderColor: `${palette.success}34`,
            transform: [
              {
                translateY: three.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, -14],
                }),
              },
              {
                translateX: three.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-5, 8],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderWidth: Platform.OS === "web" ? 1 : StyleSheet.hairlineWidth,
  },
  orbOne: {
    width: 230,
    height: 230,
    borderRadius: 115,
    top: "9%",
    right: -68,
  },
  orbTwo: {
    width: 170,
    height: 170,
    borderRadius: 52,
    bottom: "18%",
    left: -48,
  },
  orbThree: {
    width: 92,
    height: 92,
    borderRadius: 46,
    top: "47%",
    right: -20,
  },
});
