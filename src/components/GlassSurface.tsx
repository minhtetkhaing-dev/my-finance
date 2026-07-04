import { PropsWithChildren, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  fallbackColor: string;
  tintColor?: string;
  colorScheme?: "auto" | "light" | "dark";
  interactive?: boolean;
  clear?: boolean;
}>;

export function GlassSurface({
  children,
  style,
  fallbackColor,
  tintColor,
  colorScheme = "auto",
  interactive,
  clear,
}: Props) {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    if (
      Platform.OS !== "ios" ||
      typeof AccessibilityInfo.isReduceTransparencyEnabled !== "function"
    ) {
      return;
    }

    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );
    return () => subscription.remove();
  }, []);

  const available =
    Platform.OS === "ios" && !reduceTransparency && isGlassEffectAPIAvailable();

  if (!available) {
    return (
      <View style={[style, { backgroundColor: fallbackColor }]}>
        {children}
      </View>
    );
  }

  return (
    <GlassView
      style={style}
      glassEffectStyle={clear ? "clear" : "regular"}
      tintColor={tintColor}
      colorScheme={colorScheme}
      isInteractive={interactive}
    >
      {children}
    </GlassView>
  );
}
