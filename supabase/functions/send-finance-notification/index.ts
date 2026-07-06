import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "");
    if (!accessToken) throw new Error("Missing authorization token");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(accessToken);
    if (userError || !user) throw new Error("Invalid user session");

    const { notificationId } = await request.json();
    if (!notificationId) throw new Error("notificationId is required");

    const { data: notification, error: notificationError } = await admin
      .from("notifications")
      .select("id,user_id,title,message,destination,push_sent_at")
      .eq("id", notificationId)
      .eq("user_id", user.id)
      .single();
    if (notificationError || !notification)
      throw new Error("Notification not found");
    if (notification.push_sent_at) {
      return Response.json(
        { sent: 0, alreadySent: true },
        { headers: corsHeaders },
      );
    }

    const claimedAt = new Date().toISOString();
    const { data: claim, error: claimError } = await admin
      .from("notifications")
      .update({ push_sent_at: claimedAt })
      .eq("id", notification.id)
      .is("push_sent_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claim) {
      return Response.json(
        { sent: 0, alreadySent: true },
        { headers: corsHeaders },
      );
    }

    const { data: devices, error: devicesError } = await admin
      .from("push_devices")
      .select("id,expo_push_token")
      .eq("user_id", user.id)
      .eq("active", true);
    if (devicesError) throw devicesError;

    if (!devices?.length) {
      await admin
        .from("notifications")
        .update({ push_sent_at: null })
        .eq("id", notification.id)
        .eq("push_sent_at", claimedAt);
      return Response.json(
        { sent: 0, noDevices: true },
        { headers: corsHeaders },
      );
    }

    let result;
    try {
      const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
          ...(Deno.env.get("EXPO_ACCESS_TOKEN")
            ? { Authorization: `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}` }
            : {}),
        },
        body: JSON.stringify(
          devices.map((device) => ({
            to: device.expo_push_token,
            sound: "default",
            title: notification.title,
            body: notification.message,
            channelId: "finance-alerts",
            data: {
              financeNotificationId: notification.id,
              destination: notification.destination,
            },
          })),
        ),
      });
      result = await expoResponse.json();
      if (!expoResponse.ok) throw new Error(JSON.stringify(result));
    } catch (error) {
      await admin
        .from("notifications")
        .update({ push_sent_at: null })
        .eq("id", notification.id)
        .eq("push_sent_at", claimedAt);
      throw error;
    }

    const invalidDeviceIds = (result.data ?? [])
      .map(
        (
          ticket: { status: string; details?: { error?: string } },
          index: number,
        ) =>
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
            ? devices[index]?.id
            : null,
      )
      .filter(Boolean);
    if (invalidDeviceIds.length) {
      await admin
        .from("push_devices")
        .update({ active: false })
        .in("id", invalidDeviceIds);
    }

    return Response.json(
      { sent: devices.length, tickets: result.data },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Push delivery failed",
      },
      { status: 400, headers: corsHeaders },
    );
  }
});
