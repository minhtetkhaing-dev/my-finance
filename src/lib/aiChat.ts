import { supabase } from "./supabase";

export type AiChatRole = "user" | "assistant";

export type AiChatMessage = {
  id: string;
  role: AiChatRole;
  content: string;
};

export async function askAiChat(
  question: string,
  history: Pick<AiChatMessage, "role" | "content">[],
) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Please sign in again to use AI chat.");
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      "x-client-info": "my-finance-ai-chat",
    },
    body: JSON.stringify({ question, history }),
  });

  let data: { answer?: string; error?: string; message?: string } | null = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "AI chat function is not deployed yet. Deploy the Supabase ai-chat Edge Function.",
      );
    }
    throw new Error(
      data?.error ??
        data?.message ??
        `AI chat request failed with HTTP ${response.status}.`,
    );
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.answer) throw new Error("AI chat returned no answer.");
  return data.answer;
}
