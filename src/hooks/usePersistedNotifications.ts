import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FinanceNotification } from "../lib/financeNotifications";

export type StoredFinanceNotification = FinanceNotification & {
  databaseId?: string;
  read: boolean;
  createdAt?: string;
};

export function usePersistedNotifications(
  generated: FinanceNotification[],
  userId?: string,
) {
  const [notifications, setNotifications] = useState<
    StoredFinanceNotification[]
  >(() => generated.map((item) => ({ ...item, read: false })));
  const [databaseAvailable, setDatabaseAvailable] = useState(true);
  const signature = generated
    .map((item) => `${item.id}:${item.title}:${item.message}`)
    .join("|");

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id,dedupe_key,title,message,icon,tone,destination,read_at,created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      setDatabaseAvailable(false);
      return;
    }
    setDatabaseAvailable(true);
    setNotifications(
      (data ?? []).map((item) => ({
        id: item.dedupe_key,
        databaseId: item.id,
        title: item.title,
        message: item.message,
        icon: item.icon as FinanceNotification["icon"],
        tone: item.tone as FinanceNotification["tone"],
        destination: item.destination as FinanceNotification["destination"],
        read: Boolean(item.read_at),
        createdAt: item.created_at,
      })),
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNotifications(generated.map((item) => ({ ...item, read: false })));
      return;
    }
    async function sync() {
      if (generated.length) {
        const { data, error } = await supabase
          .from("notifications")
          .upsert(
            generated.map((item) => ({
              user_id: userId,
              dedupe_key: item.id,
              title: item.title,
              message: item.message,
              icon: item.icon,
              tone: item.tone,
              destination: item.destination,
            })),
            { onConflict: "user_id,dedupe_key" },
          )
          .select("id,push_sent_at");
        if (error) {
          setDatabaseAvailable(false);
          setNotifications(generated.map((item) => ({ ...item, read: false })));
          return;
        }
        await Promise.allSettled(
          (data ?? [])
            .filter((item) => !item.push_sent_at)
            .map((item) =>
              supabase.functions.invoke("send-finance-notification", {
                body: { notificationId: item.id },
              }),
            ),
        );
      }
      await fetchNotifications();
    }
    sync();
  }, [signature, userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, userId]);

  async function markAllRead() {
    const now = new Date().toISOString();
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    if (!userId || !databaseAvailable) return;
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", userId)
      .is("read_at", null);
  }

  async function markRead(item: StoredFinanceNotification) {
    if (item.read) return;
    setNotifications((items) =>
      items.map((current) =>
        current.id === item.id ? { ...current, read: true } : current,
      ),
    );
    if (!item.databaseId || !databaseAvailable) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", item.databaseId);
  }

  return { notifications, markAllRead, markRead, databaseAvailable };
}
