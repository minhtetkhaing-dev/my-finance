import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { fonts, shadow } from "../theme";
import { useFinanceData } from "../hooks/useFinanceData";
import { Header } from "../components/Header";
import { DashboardScreen } from "./DashboardScreen";
import { HistoryScreen } from "./HistoryScreen";
import { CategoriesScreen } from "./CategoriesScreen";
import { ProfileScreen } from "./ProfileScreen";
import { InsightsScreen } from "./InsightsScreen";
import { CapitalOnboardingModal } from "./CapitalOnboardingModal";
import { useLanguage } from "../contexts/LanguageContext";
import { buildFinanceNotifications } from "../lib/financeNotifications";
import { GlassSurface } from "../components/GlassSurface";
import { AmbientDecorations } from "../components/AmbientDecorations";

const tabs = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "grid-outline",
    active: "grid",
  },
  { key: "history", label: "History", icon: "time-outline", active: "time" },
  {
    key: "categories",
    label: "Categories",
    icon: "shapes-outline",
    active: "shapes",
  },
  {
    key: "insights",
    label: "Insights",
    icon: "sparkles-outline",
    active: "sparkles",
  },
  {
    key: "profile",
    label: "Profile",
    icon: "person-outline",
    active: "person",
  },
] as const;
export type TabKey = (typeof tabs)[number]["key"];
export function AppShell() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const { palette } = useTheme();
  const data = useFinanceData();
  const { setLanguage, t } = useLanguage();
  const transition = useRef(new Animated.Value(1)).current;
  const direction = useRef(1);
  const notifications = buildFinanceNotifications(
    data.categories,
    data.transactions,
    data.profile,
    t,
  );
  useEffect(() => {
    if (data.profile?.language) setLanguage(data.profile.language);
  }, [data.profile?.language]);
  function changeTab(next: TabKey) {
    if (next === tab) return;
    direction.current =
      tabs.findIndex((item) => item.key === next) >
      tabs.findIndex((item) => item.key === tab)
        ? 1
        : -1;
    transition.stopAnimation();
    transition.setValue(0);
    setTab(next);
    Animated.parallel([
      Animated.timing(transition, {
        toValue: 0.55,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.spring(transition, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
        mass: 0.72,
      }),
    ]).start();
  }
  const page =
    tab === "dashboard" ? (
      <DashboardScreen {...data} />
    ) : tab === "history" ? (
      <HistoryScreen {...data} />
    ) : tab === "categories" ? (
      <CategoriesScreen {...data} />
    ) : tab === "insights" ? (
      <InsightsScreen {...data} />
    ) : (
      <ProfileScreen {...data} />
    );
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: palette.background }]}>
      <AmbientDecorations />
      <View style={s.shell}>
        <View style={s.main}>
          <Header
            avatarUrl={data.profile?.avatar_url}
            notifications={notifications}
            userId={data.profile?.id}
            onNavigate={changeTab}
          />
          {data.error && (
            <Text
              style={[
                s.error,
                { backgroundColor: palette.dangerSoft, color: palette.danger },
              ]}
            >
              {data.error}
            </Text>
          )}
          <Animated.View
            style={[
              s.screen,
              {
                opacity: transition,
                transform: [
                  {
                    translateX: transition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [direction.current * 28, 0],
                    }),
                  },
                  {
                    scale: transition.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {page}
          </Animated.View>
        </View>
        <Nav tab={tab} setTab={changeTab} />
      </View>
      <CapitalOnboardingModal
        visible={
          !data.loading && !data.error && data.profile?.initial_capital == null
        }
        onSaved={data.refresh}
      />
    </SafeAreaView>
  );
}
function Nav({
  tab,
  setTab,
  vertical,
}: {
  tab: TabKey;
  setTab: (value: TabKey) => void;
  vertical?: boolean;
}) {
  const { palette, isDark } = useTheme();
  const { t } = useLanguage();
  const { width: viewportWidth } = useWindowDimensions();
  const activeIndex = tabs.findIndex((item) => item.key === tab);
  const indicator = useRef(new Animated.Value(activeIndex)).current;
  const [navWidth, setNavWidth] = useState(0);
  const horizontalPadding = 8;
  const tabWidth = navWidth
    ? (navWidth - horizontalPadding * 2) / tabs.length
    : 0;

  useEffect(() => {
    if (vertical) return;
    Animated.spring(indicator, {
      toValue: activeIndex,
      useNativeDriver: true,
      damping: 18,
      stiffness: 190,
      mass: 0.72,
    }).start();
  }, [activeIndex, indicator, vertical]);

  return (
    <GlassSurface
      fallbackColor={palette.card}
      tintColor={isDark ? "#17171CDD" : "#FFFFFFB8"}
      colorScheme={isDark ? "dark" : "light"}
      interactive={!vertical}
      clear={!vertical}
      onLayout={({ nativeEvent }) => setNavWidth(nativeEvent.layout.width)}
      style={[
        s.nav,
        shadow,
        {
          borderColor: palette.border,
          width: Math.min(560, viewportWidth - 24),
        },
        vertical && s.navVertical,
      ]}
    >
      {!vertical && tabWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.liquidIndicator,
            {
              left: horizontalPadding,
              width: tabWidth,
              transform: [
                {
                  translateX: indicator.interpolate({
                    inputRange: [0, tabs.length - 1],
                    outputRange: [0, tabWidth * (tabs.length - 1)],
                  }),
                },
              ],
            },
          ]}
        >
          <GlassSurface
            fallbackColor={palette.primarySoft}
            tintColor={`${palette.primary}${isDark ? "38" : "24"}`}
            colorScheme={isDark ? "dark" : "light"}
            clear
            style={[s.liquidLens, { borderColor: `${palette.primary}45` }]}
          />
        </Animated.View>
      )}
      {tabs.map((item) => {
        const active = tab === item.key;
        return (
          <NavItem
            key={item.key}
            active={active}
            icon={item.icon}
            activeIcon={item.active}
            label={t(item.label)}
            vertical={vertical}
            liquid={!vertical}
            onPress={() => setTab(item.key)}
          />
        );
      })}
    </GlassSurface>
  );
}

function NavItem({
  active,
  icon,
  activeIcon,
  label,
  vertical,
  liquid,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  vertical?: boolean;
  liquid?: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const selected = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(selected, {
      toValue: active ? 1 : 0,
      useNativeDriver: true,
      damping: 16,
      stiffness: 230,
      mass: 0.6,
    }).start();
  }, [active, selected]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      android_ripple={{ color: palette.primarySoft, borderless: true }}
      style={({ pressed }) => [
        s.navItem,
        vertical && s.navItemVertical,
        {
          backgroundColor:
            active && vertical ? palette.highlightSoft : "transparent",
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
    >
      <Animated.View
        style={[
          s.iconBubble,
          active && vertical && { backgroundColor: palette.ink },
          {
            transform: [
              {
                scale: selected.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.12],
                }),
              },
              {
                translateY: selected.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -2],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons
          name={active ? activeIcon : icon}
          size={liquid && active ? 24 : 23}
          color={active ? (vertical ? "#fff" : palette.primary) : palette.muted}
        />
        {liquid && active && (
          <View style={[s.activeDot, { backgroundColor: palette.primary }]} />
        )}
      </Animated.View>
      {vertical && (
        <Animated.Text
          style={[
            s.navLabel,
            { color: active ? palette.text : palette.muted },
            {
              opacity: selected.interpolate({
                inputRange: [0, 1],
                outputRange: [0.72, 1],
              }),
            },
          ]}
        >
          {label}
        </Animated.Text>
      )}
    </Pressable>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, height: "100%" },
  shell: { flex: 1, overflow: "hidden" },
  main: { flex: 1, overflow: "hidden" },
  screen: { flex: 1, overflow: "hidden" },
  error: {
    fontFamily: fonts.regular,
    fontSize: 13,
    padding: 10,
    marginHorizontal: 20,
    borderRadius: 12,
  },
  nav: {
    height: Platform.OS === "ios" ? 78 : 70,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === "ios" ? 5 : 0,
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 10,
    marginHorizontal: 0,
    marginBottom: Platform.OS === "ios" ? 7 : 10,
    borderRadius: 30,
    overflow: "hidden",
    maxWidth: 560,
    alignSelf: "center",
  },
  liquidIndicator: {
    position: "absolute",
    top: Platform.OS === "ios" ? 8 : 7,
    height: 54,
    paddingHorizontal: 3,
  },
  liquidLens: {
    flex: 1,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  navVertical: {
    width: 220,
    height: "100%",
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  navItem: {
    width: 52,
    height: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 1,
  },
  navItemVertical: {
    width: "100%",
    height: 54,
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 12,
    gap: 12,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  navLabel: { fontFamily: fonts.semibold, fontSize: 14 },
});
