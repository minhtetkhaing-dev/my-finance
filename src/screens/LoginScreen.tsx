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

export function LoginScreen() {
  const { palette } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signUp, setSignUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const authRedirectUrl =
    Platform.OS === "web"
      ? Linking.createURL("auth/callback")
      : makeRedirectUri({
          scheme: "clarityfinance",
          path: "auth/callback",
        });
  async function submit() {
    setBusy(true);
    const result = signUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error)
      Alert.alert("Authentication failed", result.error.message);
    else if (signUp)
      Alert.alert(
        "Check your email",
        "Open the confirmation link, then return to sign in.",
      );
  }
  async function google() {
    const redirectTo = authRedirectUrl;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url)
      return Alert.alert(
        "Google sign-in failed",
        error?.message ?? "No authorization URL",
      );
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
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
  async function forgot() {
    if (!email) return Alert.alert("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo:
        Platform.OS === "web"
          ? Linking.createURL("auth/reset")
          : makeRedirectUri({ scheme: "clarityfinance", path: "auth/reset" }),
    });
    Alert.alert(
      error ? "Could not send reset email" : "Email sent",
      error?.message ?? "Check your inbox for the password reset link.",
    );
  }
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.brand}>
            <View style={[s.logo, { backgroundColor: palette.primarySoft }]}>
              <Ionicons
                name="newspaper-outline"
                size={42}
                color={palette.primary}
              />
            </View>
            <Title style={{ fontSize: 36 }}>Clarity Finance</Title>
            <Text style={[s.welcome, { color: palette.muted }]}>
              Welcome to Clarity Finance
            </Text>
          </View>
          <Card style={s.form}>
            <Label>EMAIL ADDRESS</Label>
            <Field
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={s.passwordTitle}>
              <Label>PASSWORD</Label>
              <Pressable onPress={forgot}>
                <Text style={[s.link, { color: palette.primary }]}>
                  Forgot Password?
                </Text>
              </Pressable>
            </View>
            <Field
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
            />
            <Button
              title={
                busy ? "Please wait…" : signUp ? "Create Account" : "Sign In"
              }
              onPress={submit}
              disabled={busy || !email || password.length < 6}
            />
            <View style={s.or}>
              <View style={[s.line, { backgroundColor: palette.border }]} />
              <Label>OR</Label>
              <View style={[s.line, { backgroundColor: palette.border }]} />
            </View>
            <Button
              title="Continue with Google"
              onPress={google}
              secondary
              icon="logo-google"
            />
            <Pressable onPress={() => setSignUp((v) => !v)}>
              <Text style={[s.switch, { color: palette.text }]}>
                {signUp
                  ? "Already have an account? "
                  : "Don’t have an account? "}
                <Text
                  style={{ color: palette.primary, fontFamily: fonts.bold }}
                >
                  {signUp ? "Sign in" : "Sign up"}
                </Text>
              </Text>
            </Pressable>
          </Card>
          <Label style={{ textAlign: "center" }}>
            ◈ SECURE AUTHENTICATION • SUPABASE
          </Label>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
    gap: 28,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  brand: { alignItems: "center", gap: 10 },
  logo: {
    height: 92,
    width: 92,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  welcome: { fontFamily: fonts.regular, fontSize: 20 },
  form: { gap: 14, padding: 28 },
  passwordTitle: { flexDirection: "row", justifyContent: "space-between" },
  link: { fontFamily: fonts.mono, fontSize: 13 },
  or: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 6,
  },
  line: { height: 1, flex: 1 },
  switch: { fontFamily: fonts.regular, textAlign: "center", marginTop: 6 },
});
