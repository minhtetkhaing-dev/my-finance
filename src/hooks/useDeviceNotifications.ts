import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { FinanceNotification } from "../lib/financeNotifications";

type PermissionState = "loading" | "granted" | "denied" | "undetermined";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function useDeviceNotifications(
  notifications: FinanceNotification[],
  userId?: string,
) {
  const [permission, setPermission] = useState<PermissionState>("loading");
  const delivering = useRef(false);
  const sentKey = `clarity-device-notifications-sent-${userId || "guest"}`;
  const signature = notifications.map((item) => item.id).join("|");

  useEffect(() => {
    if (Platform.OS === "web") {
      setPermission("denied");
      return;
    }
    async function prepare() {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("finance-alerts", {
          name: "Financial alerts",
          description: "Budget limits, savings goals, and transaction alerts",
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 180, 250],
          lightColor: "#5B50E6",
          sound: "default",
        });
      }
      const result = await Notifications.getPermissionsAsync();
      setPermission(result.granted ? "granted" : result.status);
    }
    prepare().catch(() => setPermission("denied"));
  }, []);

  useEffect(() => {
    if (
      Platform.OS === "web" ||
      permission !== "granted" ||
      !userId ||
      delivering.current
    )
      return;
    async function deliverNewAlerts() {
      delivering.current = true;
      try {
        const stored = await AsyncStorage.getItem(sentKey);
        const sentIds: string[] = stored ? JSON.parse(stored) : [];
        const pending = notifications.filter(
          (notification) => !sentIds.includes(notification.id),
        );
        for (const notification of pending) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.title,
              body: notification.message,
              sound: "default",
              data: { financeNotificationId: notification.id },
            },
            trigger: null,
          });
        }
        if (pending.length) {
          const nextIds = [
            ...new Set([
              ...sentIds,
              ...pending.map((notification) => notification.id),
            ]),
          ].slice(-100);
          await AsyncStorage.setItem(sentKey, JSON.stringify(nextIds));
        }
        await Notifications.setBadgeCountAsync(notifications.length);
      } finally {
        delivering.current = false;
      }
    }
    deliverNewAlerts().catch(() => {
      delivering.current = false;
    });
  }, [permission, sentKey, signature, userId]);

  const enable = useCallback(async () => {
    if (Platform.OS === "web") return false;
    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    const next = result.granted ? "granted" : result.status;
    setPermission(next);
    return result.granted;
  }, []);

  return {
    permission,
    enable,
    openSettings: () => Linking.openSettings(),
    supported: Platform.OS !== "web",
  };
}
