import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Field, Label, Title } from "../components/UI";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export function ResetPasswordScreen() {
  const { palette } = useTheme();
  const { setRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  async function updatePassword() {
    if (password.length < 8) return Alert.alert("Use at least 8 characters");
    if (password !== confirm) return Alert.alert("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return Alert.alert("Could not reset password", error.message);
    Alert.alert(
      "Password updated",
      "You can now continue using Clarity Finance.",
    );
    setRecovery(false);
  }
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
    >
      <KeyboardAvoidingView
        style={styles.center}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Card style={styles.card}>
          <View style={[styles.icon, { backgroundColor: palette.primarySoft }]}>
            <Ionicons name="key-outline" size={34} color={palette.primary} />
          </View>
          <Title>Choose a new password</Title>
          <Label>NEW PASSWORD</Label>
          <Field
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 8 characters"
          />
          <Label>CONFIRM PASSWORD</Label>
          <Field
            icon="shield-checkmark-outline"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="Repeat password"
          />
          <Button
            title={busy ? "Updating…" : "Update password"}
            onPress={updatePassword}
            disabled={busy || password.length < 8 || confirm.length < 8}
          />
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: 15,
    padding: 28,
  },
  icon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
