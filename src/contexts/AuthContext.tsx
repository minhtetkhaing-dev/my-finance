import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "../lib/supabase";

const AuthContext = createContext<{
  session: Session | null;
  loading: boolean;
  recovery: boolean;
  setRecovery: (value: boolean) => void;
  completeRecovery: () => Promise<void>;
}>({
  session: null,
  loading: true,
  recovery: false,
  setRecovery: () => {},
  completeRecovery: async () => {},
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  async function completeRecovery() {
    setRecovery(false);
    setSession(null);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.history.replaceState({}, "", "/");
    }
    await supabase.auth.signOut();
  }
  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return;
      if (url.includes("auth/reset")) setRecovery(true);
      // supabase-js detects and exchanges PKCE callback codes automatically
      // in browsers. Manual exchange is only needed for native deep links.
      if (Platform.OS === "web") return;
      const { params, errorCode } = QueryParams.getQueryParams(url);
      if (errorCode) return;
      if (params.code) await supabase.auth.exchangeCodeForSession(params.code);
      else if (params.access_token && params.refresh_token)
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    Linking.getInitialURL().then(handleUrl);
    const linkSubscription = Linking.addEventListener("url", ({ url }) => {
      handleUrl(url);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (!next) setRecovery(false);
      else if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setLoading(false);
    });
    return () => {
      data.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{ session, loading, recovery, setRecovery, completeRecovery }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
