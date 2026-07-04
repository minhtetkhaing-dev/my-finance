import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { useTheme } from "../contexts/ThemeContext";
import { Button, Card, Field, Label, Title } from "../components/UI";
import { fonts } from "../theme";
import { useLanguage } from "../contexts/LanguageContext";

type AuthView = "signIn" | "signUp" | "forgot";
export function LoginScreen() {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const [view, setView] = useState<AuthView>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const authRedirectUrl =
    Platform.OS === "web"
      ? Linking.createURL("auth/callback")
      : makeRedirectUri({ scheme: "clarityfinance", path: "auth/callback" });
  const resetRedirectUrl =
    Platform.OS === "web"
      ? Linking.createURL("auth/reset")
      : makeRedirectUri({ scheme: "clarityfinance", path: "auth/reset" });
  async function submit() {
    if (view === "signUp" && password !== confirm)
      return Alert.alert("Passwords do not match");
    setBusy(true);
    const result =
      view === "signUp"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: authRedirectUrl },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error)
      return Alert.alert("Authentication failed", result.error.message);
    if (view === "signUp") {
      Alert.alert(
        "Check your email",
        "Open the confirmation link to activate your account.",
      );
      setView("signIn");
    }
  }
  async function sendReset() {
    if (!email) return Alert.alert("Enter your email");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetRedirectUrl,
    });
    setBusy(false);
    Alert.alert(
      error ? "Could not send reset email" : "Reset email sent",
      error?.message ?? "Open the link on this phone to choose a new password.",
    );
  }
  async function google() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authRedirectUrl, skipBrowserRedirect: true },
    });
    if (error || !data.url)
      return Alert.alert(
        "Google sign-in failed",
        error?.message ?? "No authorization URL",
      );
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      authRedirectUrl,
    );
    if (result.type === "success") {
      const { params, errorCode } = QueryParams.getQueryParams(result.url);
      if (errorCode) return Alert.alert("Google sign-in failed", errorCode);
      if (params.code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(params.code);
        if (exchangeError)
          Alert.alert("Google sign-in failed", exchangeError.message);
      }
    }
  }
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View style={[styles.logo, { backgroundColor: palette.ink }]}>
              <Ionicons
                name="newspaper-outline"
                size={42}
                color={palette.highlight}
              />
            </View>
            <Title style={{ fontSize: 36 }}>Clarity Finance</Title>
            <Text style={[styles.welcome, { color: palette.muted }]}>
              {t(
                view === "forgot"
                  ? "Recover your account"
                  : "Welcome to Clarity Finance",
              )}
            </Text>
          </View>
          <Card style={styles.form}>
            {view !== "forgot" && (
              <View style={[styles.tabs, { backgroundColor: palette.input }]}>
                {(["signIn", "signUp"] as const).map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => setView(item)}
                    style={[
                      styles.tab,
                      {
                        backgroundColor:
                          view === item ? palette.card : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        {
                          color:
                            view === item ? palette.primary : palette.muted,
                        },
                      ]}
                    >
                      {t(item === "signIn" ? "Sign In" : "Sign Up")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {view === "forgot" && (
              <>
                <Pressable
                  onPress={() => setView("signIn")}
                  style={styles.back}
                >
                  <Ionicons
                    name="arrow-back"
                    size={20}
                    color={palette.primary}
                  />
                  <Text style={[styles.link, { color: palette.primary }]}>
                    {t("Back to sign in")}
                  </Text>
                </Pressable>
                <Title style={{ fontSize: 23 }}>{t("Forgot password?")}</Title>
                <Text style={[styles.help, { color: palette.muted }]}>
                  Enter your email and we’ll send a secure password-reset link.
                </Text>
              </>
            )}
            <Label>{t("Email Address").toUpperCase()}</Label>
            <Field
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {view !== "forgot" && (
              <>
                <View style={styles.passwordTitle}>
                  <Label>{t("Password").toUpperCase()}</Label>
                  {view === "signIn" && (
                    <Pressable onPress={() => setView("forgot")}>
                      <Text style={[styles.link, { color: palette.primary }]}>
                        {t("Forgot password?")}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <Field
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  secureTextEntry
                />
                {view === "signUp" && (
                  <>
                    <Label>{t("Confirm Password").toUpperCase()}</Label>
                    <Field
                      icon="shield-checkmark-outline"
                      value={confirm}
                      onChangeText={setConfirm}
                      placeholder="Repeat password"
                      secureTextEntry
                    />
                  </>
                )}
              </>
            )}
            <Button
              title={
                busy
                  ? "Please wait…"
                  : view === "forgot"
                    ? t("Send reset link")
                    : view === "signUp"
                      ? t("Create account")
                      : t("Sign In")
              }
              onPress={view === "forgot" ? sendReset : submit}
              disabled={
                busy ||
                !email ||
                (view !== "forgot" && password.length < 8) ||
                (view === "signUp" && confirm.length < 8)
              }
            />
            {view !== "forgot" && (
              <>
                <View style={styles.or}>
                  <View
                    style={[styles.line, { backgroundColor: palette.border }]}
                  />
                  <Label>OR</Label>
                  <View
                    style={[styles.line, { backgroundColor: palette.border }]}
                  />
                </View>
                <Button
                  title={t("Continue with Google")}
                  onPress={google}
                  secondary
                  icon="logo-google"
                />
              </>
            )}
          </Card>
          <Label style={{ textAlign: "center" }}>
            ◈ SECURE AUTHENTICATION • SUPABASE
          </Label>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
    gap: 24,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  brand: {
    alignItems: "flex-start",
    gap: 8,
    zIndex: 2,
    position: "relative",
  },
  logo: {
    height: 68,
    width: 68,
    borderRadius: 20,
    transform: [{ rotate: "-3deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  welcome: { fontFamily: fonts.regular, fontSize: 17 },
  form: { gap: 15, padding: 22, borderRadius: 32 },
  tabs: { flexDirection: "row", padding: 5, borderRadius: 18 },
  tab: { flex: 1, padding: 11, borderRadius: 14 },
  tabText: { textAlign: "center", fontFamily: fonts.semibold, fontSize: 15 },
  passwordTitle: { flexDirection: "row", justifyContent: "space-between" },
  link: { fontFamily: fonts.mono, fontSize: 13 },
  back: { flexDirection: "row", alignItems: "center", gap: 7 },
  help: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  or: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 6,
  },
  line: { height: 1, flex: 1 },
});
