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
import { CapitalOnboardingModal } from "./CapitalOnboardingModal";
import { useLanguage } from "../contexts/LanguageContext";

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
  const { setLanguage } = useLanguage();
  const { width } = useWindowDimensions();
  const wide = width > 820;
  const transition = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (data.profile?.language) setLanguage(data.profile.language);
  }, [data.profile?.language]);
  function changeTab(next: TabKey) {
    if (next === tab) return;
    transition.setValue(0);
    setTab(next);
    Animated.spring(transition, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 190,
    }).start();
  }
  const page =
    tab === "dashboard" ? (
      <DashboardScreen {...data} />
    ) : tab === "history" ? (
      <HistoryScreen {...data} />
    ) : tab === "categories" ? (
      <CategoriesScreen {...data} />
    ) : (
      <ProfileScreen {...data} />
    );
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: palette.background }]}>
      <View style={[s.shell, wide && s.wide]}>
        {wide && <Nav tab={tab} setTab={changeTab} vertical />}
        <View style={s.main}>
          <Header avatarUrl={data.profile?.avatar_url} />
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
                      outputRange: [14, 0],
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
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            accessibilityRole="tab"
            accessibilityLabel={t(item.label)}
            accessibilityState={{ selected: active }}
            android_ripple={{ color: palette.primarySoft, borderless: true }}
            style={({ pressed }) => [
              s.navItem,
              vertical && s.navItemVertical,
              {
                backgroundColor: active ? palette.primarySoft : "transparent",
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}
          >
            <View
              style={[
                s.iconBubble,
                active && { backgroundColor: palette.primary },
              ]}
            >
              <Ionicons
                name={active ? item.active : item.icon}
                size={23}
                color={active ? "#fff" : palette.muted}
              />
            </View>
            {vertical && (
              <Text
                style={[
                  s.navLabel,
                  { color: active ? palette.primary : palette.muted },
                ]}
              >
                {t(item.label)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
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
    height: Platform.OS === "ios" ? 82 : 72,
    borderTopWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 8 : 4,
    alignItems: "center",
    justifyContent: "space-around",
    zIndex: 10,
  },
  navVertical: {
    width: 220,
    height: "100%",
    borderTopWidth: 0,
    borderRightWidth: 1,
    flexDirection: "column",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  navItem: {
    width: 56,
    height: 52,
    borderRadius: 18,
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
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { fontFamily: fonts.semibold, fontSize: 14 },
});
