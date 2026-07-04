import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
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
  const { width } = useWindowDimensions();
  const wide = width > 820;
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
      <View style={[s.shell, wide && s.wide]}>
        {wide && <Nav tab={tab} setTab={changeTab} vertical />}
        <View style={s.main}>
          <Header
            avatarUrl={data.profile?.avatar_url}
            notifications={notifications}
            userId={data.profile?.id}
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
        {!wide && <Nav tab={tab} setTab={changeTab} />}
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
  const { palette } = useTheme();
  const { t } = useLanguage();
  return (
    <View
      style={[
        s.nav,
        shadow,
        { backgroundColor: palette.card, borderColor: palette.border },
        vertical && s.navVertical,
      ]}
    >
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
            onPress={() => setTab(item.key)}
          />
        );
      })}
    </View>
  );
}

function NavItem({
  active,
  icon,
  activeIcon,
  label,
  vertical,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  vertical?: boolean;
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
          backgroundColor: active ? palette.primarySoft : "transparent",
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
    >
      <Animated.View
        style={[
          s.iconBubble,
          active && { backgroundColor: palette.primary },
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
          size={23}
          color={active ? "#fff" : palette.muted}
        />
      </Animated.View>
      {vertical && (
        <Animated.Text
          style={[
            s.navLabel,
            { color: active ? palette.primary : palette.muted },
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
  wide: { flexDirection: "row" },
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
    height: Platform.OS === "ios" ? 76 : 66,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === "ios" ? 5 : 0,
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 10,
    marginHorizontal: 12,
    marginBottom: Platform.OS === "ios" ? 7 : 10,
    borderRadius: 26,
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
  navLabel: { fontFamily: fonts.semibold, fontSize: 14 },
});
