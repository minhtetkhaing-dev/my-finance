import { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { fonts, shadow } from "../theme";
import { FinanceNotification } from "../lib/financeNotifications";
import { useDeviceNotifications } from "../hooks/useDeviceNotifications";
import { GlassSurface } from "./GlassSurface";
import { usePersistedNotifications } from "../hooks/usePersistedNotifications";

export function Header({
  avatarUrl,
  notifications: generatedNotifications,
  userId,
  onNavigate,
}: {
  avatarUrl?: string | null;
  notifications: FinanceNotification[];
  userId?: string;
  onNavigate: (destination: FinanceNotification["destination"]) => void;
}) {
  const { palette, isDark } = useTheme();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const { notifications, markAllRead, markRead } = usePersistedNotifications(
    generatedNotifications,
    userId,
  );
  const unread = notifications.filter((item) => !item.read);
  const deviceNotifications = useDeviceNotifications(
    userId,
    unread.length,
    onNavigate,
  );

  async function openNotification(item: (typeof notifications)[number]) {
    await markRead(item);
    setOpen(false);
    onNavigate(item.destination);
  }

  return (
    <>
      <View style={s.header}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={s.avatar} />
        ) : (
          <View
            style={[
              s.avatar,
              {
                backgroundColor: palette.primarySoft,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Ionicons name="person" size={20} color={palette.primary} />
          </View>
        )}
        <View style={s.brandCopy}>
          <Text
            style={[s.title, { color: palette.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Clarity Finance
          </Text>
          <Text style={[s.tagline, { color: palette.muted }]} numberOfLines={1}>
            {t("Money, made clear")}
          </Text>
        </View>
        <View style={s.actionWrap}>
          <GlassSurface
            fallbackColor={palette.card}
            tintColor={palette.primarySoft}
            colorScheme={isDark ? "dark" : "light"}
            clear
            style={[s.action, { borderColor: palette.border }]}
          >
            <Pressable
              onPress={() => setOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t("Notifications")}
              style={({ pressed }) => [
                s.actionPress,
                { transform: [{ scale: pressed ? 0.9 : 1 }] },
              ]}
            >
              <Ionicons
                name={unread.length ? "notifications" : "notifications-outline"}
                size={22}
                color={palette.primary}
              />
            </Pressable>
          </GlassSurface>
          {unread.length > 0 && (
            <View
              pointerEvents="none"
              style={[
                s.badge,
                {
                  backgroundColor: palette.danger,
                  borderColor: palette.background,
                },
              ]}
            >
              <Text style={s.badgeText}>
                {unread.length > 9 ? "9+" : unread.length}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <GlassSurface
            fallbackColor={palette.background}
            tintColor={palette.primarySoft}
            colorScheme={isDark ? "dark" : "light"}
            style={[s.sheet, shadow]}
          >
            <View style={s.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[s.sheetTitle, { color: palette.text }]}>
                  {t("Notifications")}
                </Text>
                <Text style={[s.sheetSub, { color: palette.muted }]}>
                  {unread.length
                    ? t("{count} unread alerts").replace(
                        "{count}",
                        unread.length.toString(),
                      )
                    : t("You are all caught up")}
                </Text>
              </View>
              <Pressable
                onPress={() => setOpen(false)}
                style={[s.close, { backgroundColor: palette.card }]}
              >
                <Ionicons name="close" size={22} color={palette.text} />
              </Pressable>
            </View>

            {deviceNotifications.supported &&
              deviceNotifications.permission !== "loading" && (
                <Pressable
                  onPress={
                    deviceNotifications.permission === "denied"
                      ? deviceNotifications.openSettings
                      : deviceNotifications.permission === "granted"
                        ? undefined
                        : deviceNotifications.enable
                  }
                  style={[
                    s.devicePrompt,
                    {
                      backgroundColor:
                        deviceNotifications.permission === "granted"
                          ? palette.successSoft
                          : palette.primarySoft,
                    },
                  ]}
                >
                  <View
                    style={[
                      s.deviceIcon,
                      {
                        backgroundColor:
                          deviceNotifications.permission === "granted"
                            ? palette.success
                            : palette.primary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        deviceNotifications.permission === "granted"
                          ? "checkmark"
                          : "phone-portrait-outline"
                      }
                      size={19}
                      color="#fff"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.deviceTitle, { color: palette.text }]}>
                      {t(
                        deviceNotifications.permission === "granted"
                          ? "Device notifications enabled"
                          : deviceNotifications.permission === "denied"
                            ? "Enable notifications in Settings"
                            : "Get alerts on this device",
                      )}
                    </Text>
                    <Text style={[s.deviceText, { color: palette.muted }]}>
                      {t(
                        deviceNotifications.permission === "granted"
                          ? "New financial alerts will appear on this device."
                          : "Receive budget and savings alerts outside the app.",
                      )}
                    </Text>
                  </View>
                  {deviceNotifications.permission !== "granted" && (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={palette.primary}
                    />
                  )}
                </Pressable>
              )}

            {notifications.length ? (
              <ScrollView
                style={s.list}
                contentContainerStyle={{ gap: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map((item) => {
                  const isUnread = !item.read;
                  const tone = palette[item.tone];
                  const soft =
                    item.tone === "danger"
                      ? palette.dangerSoft
                      : item.tone === "success"
                        ? palette.successSoft
                        : palette.primarySoft;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => openNotification(item)}
                      accessibilityRole="button"
                      accessibilityHint={t("Opens the related page")}
                      style={[
                        s.notification,
                        {
                          backgroundColor: palette.card,
                          borderColor: isUnread ? tone : palette.border,
                        },
                      ]}
                    >
                      <View
                        style={[s.notificationIcon, { backgroundColor: soft }]}
                      >
                        <Ionicons name={item.icon} size={21} color={tone} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={s.notificationTitleRow}>
                          <Text
                            style={[
                              s.notificationTitle,
                              { color: palette.text },
                            ]}
                          >
                            {item.title}
                          </Text>
                          {isUnread && (
                            <View
                              style={[s.unreadDot, { backgroundColor: tone }]}
                            />
                          )}
                        </View>
                        <Text style={[s.message, { color: palette.muted }]}>
                          {item.message}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={palette.muted}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={s.empty}>
                <View
                  style={[
                    s.emptyIcon,
                    { backgroundColor: palette.primarySoft },
                  ]}
                >
                  <Ionicons
                    name="notifications-off-outline"
                    size={31}
                    color={palette.primary}
                  />
                </View>
                <Text style={[s.emptyTitle, { color: palette.text }]}>
                  {t("No alerts right now")}
                </Text>
                <Text style={[s.emptyText, { color: palette.muted }]}>
                  {t("Important budget and goal updates will appear here.")}
                </Text>
              </View>
            )}

            {unread.length > 0 && (
              <Pressable
                onPress={markAllRead}
                style={[s.markRead, { backgroundColor: palette.primary }]}
              >
                <Ionicons name="checkmark-done" size={19} color="#fff" />
                <Text style={s.markReadText}>{t("Mark all as read")}</Text>
              </Pressable>
            )}
          </GlassSurface>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  header: {
    height: 78,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 21,
    letterSpacing: -0.55,
  },
  brandCopy: { flex: 1 },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 10,
    letterSpacing: 0.15,
    marginTop: -1,
  },
  action: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  actionWrap: { width: 42, height: 42, overflow: "visible" },
  actionPress: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -5,
    top: -5,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 13,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,14,25,.68)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "82%",
    alignSelf: "center",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    paddingBottom: 30,
    gap: 16,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 25, letterSpacing: -0.5 },
  sheetSub: { fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { flexGrow: 0 },
  devicePrompt: {
    minHeight: 72,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  deviceIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  deviceText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  notification: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  notificationIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 15 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  message: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  empty: { alignItems: "center", paddingVertical: 38, paddingHorizontal: 24 },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18 },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 5,
  },
  markRead: {
    minHeight: 50,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  markReadText: { color: "#fff", fontFamily: fonts.semibold, fontSize: 14 },
});
