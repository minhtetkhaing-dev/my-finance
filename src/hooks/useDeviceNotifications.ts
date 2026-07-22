import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { FinanceNotification } from "../lib/financeNotifications";
import { supabase } from "../lib/supabase";

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
  userId: string | undefined,
  unreadCount: number,
  onNavigate: (destination: FinanceNotification["destination"]) => void,
) {
  const [permission, setPermission] = useState<PermissionState>("loading");
  const registeredToken = useRef<string | null>(null);

  const registerDevice = useCallback(async () => {
    if (Platform.OS === "web" || !userId) return false;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) throw new Error("EAS project ID is missing");
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const { error } = await supabase.from("push_devices").upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform: Platform.OS,
        active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "user_id,expo_push_token" },
    );
    if (error) throw error;
    registeredToken.current = token;
    return true;
  }, [userId]);

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
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 180, 250],
          lightColor: "#5338D6",
          sound: "default",
        });
      }
      const result = await Notifications.getPermissionsAsync();
      setPermission(result.granted ? "granted" : result.status);
      if (result.granted) await registerDevice();
    }
    prepare().catch(() => setPermission("denied"));
  }, [registerDevice]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const destination = response.notification.request.content.data
          ?.destination as FinanceNotification["destination"] | undefined;
        if (
          destination &&
          [
            "dashboard",
            "history",
            "categories",
            "insights",
            "profile",
          ].includes(destination)
        ) {
          onNavigate(destination);
        }
      },
    );
    return () => subscription.remove();
  }, [onNavigate]);

  useEffect(() => {
    if (Platform.OS !== "web" && permission === "granted") {
      Notifications.setBadgeCountAsync(unreadCount).catch(() => undefined);
    }
  }, [permission, unreadCount]);

  const enable = useCallback(async () => {
    if (Platform.OS === "web") return false;
    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    const next = result.granted ? "granted" : result.status;
    setPermission(next);
    if (result.granted) await registerDevice();
    return result.granted;
  }, [registerDevice]);

  return {
    permission,
    enable,
    openSettings: () => Linking.openSettings(),
    supported: Platform.OS !== "web",
  };
}
