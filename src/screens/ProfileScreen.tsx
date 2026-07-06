import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { Ionicons } from "@expo/vector-icons";
import { Category, Profile, Transaction } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button, Card, Field, Label, Progress, Title } from "../components/UI";
import { supabase } from "../lib/supabase";
import { fonts } from "../theme";
import { formatMMK } from "../lib/currency";
import { Language, useLanguage } from "../contexts/LanguageContext";

type Props = {
  categories: Category[];
  transactions: Transaction[];
  profile: Profile | null;
  refresh: () => Promise<void>;
  loading: boolean;
};
export function ProfileScreen({ profile, transactions, refresh }: Props) {
  const { session } = useAuth();
  const { palette, isDark, toggle } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [capital, setCapital] = useState("0");
  const [monthly, setMonthly] = useState("0");
  const [yearly, setYearly] = useState("0");
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const capitalLocked = Boolean(
    profile?.initial_capital_locked || transactions.length > 0,
  );
  useEffect(() => {
    setName(profile?.full_name || session?.user.user_metadata.full_name || "");
    setPhone(profile?.phone || "");
    setCapital(String(profile?.initial_capital ?? 0));
    setMonthly(String(profile?.monthly_spending_cap ?? 0));
    setYearly(String(profile?.yearly_savings_goal ?? 0));
  }, [profile, session]);
  async function save() {
    const values = [capital, monthly, yearly].map((value) =>
      Number(value.replace(/,/g, "")),
    );
    if (values.some((value) => !Number.isFinite(value) || value < 0))
      return Alert.alert(t("Enter valid MMK amounts"));
    const profileUpdates = {
      id: session!.user.id,
      full_name: name,
      phone,
      monthly_spending_cap: values[1],
      yearly_savings_goal: values[2],
      updated_at: new Date().toISOString(),
      ...(!capitalLocked && { initial_capital: values[0] }),
    };
    const { error } = await supabase
      .from("profiles")
      .upsert(profileUpdates)
      .select()
      .single();
    if (error) return Alert.alert(t("Could not save profile"), error.message);
    setEditing(false);
    await refresh();
  }
  async function changeLanguage(next: Language) {
    setLanguage(next);
    if (!session) return;
    const { error } = await supabase
      .from("profiles")
      .update({ language: next, updated_at: new Date().toISOString() })
      .eq("id", session.user.id);
    if (error) Alert.alert(t("Could not save language"), error.message);
    else await refresh();
  }
  async function chooseAvatar() {
    if (!session) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return Alert.alert(
        t("Photo permission needed"),
        t("Allow photo-library access to choose an avatar."),
      );
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) return Alert.alert(t("Could not read this image"));
    setUploading(true);
    const path = `${session.user.id}/avatar`;
    const upload = await supabase.storage
      .from("avatars")
      .upload(path, decode(asset.base64), {
        contentType: asset.mimeType || "image/jpeg",
        upsert: true,
      });
    if (upload.error) {
      setUploading(false);
      return Alert.alert(
        "Could not upload avatar",
        `${upload.error.message}\n\nRun the avatar storage migration if the bucket or policies are missing.`,
      );
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", session.user.id)
      .select()
      .single();
    setUploading(false);
    if (error)
      return Alert.alert(
        "Avatar uploaded, but profile update failed",
        error.message,
      );
    await refresh();
  }
  async function removeAvatar() {
    if (!session) return;
    Alert.alert(
      t("Remove avatar?"),
      t("Your uploaded avatar will be deleted."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Remove"),
          style: "destructive",
          onPress: async () => {
            setUploading(true);
            const path = `${session.user.id}/avatar`;
            const removed = await supabase.storage
              .from("avatars")
              .remove([path]);
            if (removed.error) {
              setUploading(false);
              return Alert.alert(
                "Could not remove avatar",
                removed.error.message,
              );
            }
            const { error } = await supabase
              .from("profiles")
              .update({
                avatar_url: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", session.user.id);
            setUploading(false);
            if (error)
              return Alert.alert("Could not update profile", error.message);
            await refresh();
          },
        },
      ],
    );
  }
  const avatar = profile?.avatar_url || session?.user.user_metadata.avatar_url;
  const now = new Date();
  const monthExpense = transactions
    .filter((item) => {
      const date = new Date(item.occurred_at);
      return (
        item.kind === "expense" &&
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, item) => sum + item.amount, 0);
  const yearNet = transactions
    .filter(
      (item) => new Date(item.occurred_at).getFullYear() === now.getFullYear(),
    )
    .reduce(
      (sum, item) =>
        sum + (item.kind === "income" ? item.amount : -item.amount),
      0,
    );
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View
        style={[
          styles.hero,
          { backgroundColor: palette.primarySoft, borderColor: palette.border },
        ]}
      >
        <Pressable
          onPress={chooseAvatar}
          disabled={uploading}
          style={styles.avatarWrap}
        >
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: palette.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Ionicons name="person" size={45} color={palette.primary} />
            </View>
          )}
          <View style={[styles.camera, { backgroundColor: palette.primary }]}>
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="camera" size={20} color="#fff" />
            )}
          </View>
        </Pressable>
        <Title>{name || t("Your Profile")}</Title>
        <Text style={[styles.email, { color: palette.muted }]}>
          {session?.user.email}
        </Text>
        <View style={styles.avatarActions}>
          <Text
            onPress={chooseAvatar}
            style={[styles.avatarAction, { color: palette.primary }]}
          >
            {uploading ? t("Uploading…") : t("Change photo")}
          </Text>
          {profile?.avatar_url && (
            <Text
              onPress={removeAvatar}
              style={[styles.avatarAction, { color: palette.danger }]}
            >
              {t("Remove")}
            </Text>
          )}
        </View>
      </View>
      <Title style={styles.heading}>{t("Personal Information")}</Title>
      <Card style={{ gap: 14 }}>
        {editing ? (
          <>
            <Label>{t("FULL NAME")}</Label>
            <Field value={name} onChangeText={setName} />
            <Label>{t("PHONE NUMBER")}</Label>
            <Field
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </>
        ) : (
          <>
            <Info
              icon="mail-outline"
              label={t("Email Address")}
              value={session?.user.email || ""}
            />
            <Info
              icon="call-outline"
              label={t("Phone Number")}
              value={phone || t("Not added")}
            />
          </>
        )}
      </Card>
      <Title style={styles.heading}>{t("Preferences")}</Title>
      <Card style={styles.preference}>
        <Ionicons name="moon-outline" size={25} color={palette.muted} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoValue, { color: palette.text }]}>
            {t("Appearance")}
          </Text>
          <Label>{isDark ? t("Dark Mode") : t("Light Mode")}</Label>
        </View>
        <Switch
          value={isDark}
          onValueChange={toggle}
          trackColor={{ false: palette.primarySoft, true: palette.primary }}
        />
      </Card>
      <Card style={{ gap: 12 }}>
        <View style={styles.preference}>
          <Ionicons name="language-outline" size={25} color={palette.muted} />
          <Text style={[styles.infoValue, { color: palette.text, flex: 1 }]}>
            {t("Language")}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["en", "my"] as Language[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => changeLanguage(item)}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 9,
                padding: 11,
                backgroundColor:
                  language === item ? palette.primary : palette.input,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  textAlign: "center",
                  color: language === item ? "#fff" : palette.text,
                }}
              >
                {t(item === "en" ? "English" : "Myanmar")}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Title style={styles.heading}>{t("Financial Settings")}</Title>
      {!capitalLocked && (
        <Card style={{ gap: 9 }}>
          <Label style={{ color: palette.primary }}>
            {t("OPENING • STARTING CAPITAL")}
          </Label>
          {editing ? (
            <Field
              value={capital}
              onChangeText={setCapital}
              keyboardType="numeric"
            />
          ) : (
            <Title>{formatMMK(Number(capital))}</Title>
          )}
          <Label>{t("Changing this recalculates the current balance.")}</Label>
        </Card>
      )}
      <Card style={{ gap: 9 }}>
        <Label style={{ color: palette.success }}>
          {t("MONTHLY • SPENDING CAP")}
        </Label>
        {editing ? (
          <Field
            value={monthly}
            onChangeText={setMonthly}
            keyboardType="numeric"
          />
        ) : (
          <Title>{formatMMK(Number(monthly))}</Title>
        )}
        <Progress
          value={
            Number(monthly) > 0 ? (monthExpense / Number(monthly)) * 100 : 0
          }
          danger={Number(monthly) > 0 && monthExpense > Number(monthly)}
          risk
        />
        <Label>
          {t("ACTUAL SPENDING")} {formatMMK(monthExpense)}
        </Label>
      </Card>
      <Card style={{ gap: 9 }}>
        <Label style={{ color: palette.primary }}>
          {t("YEARLY • SAVINGS GOAL")}
        </Label>
        {editing ? (
          <Field
            value={yearly}
            onChangeText={setYearly}
            keyboardType="numeric"
          />
        ) : (
          <Title>{formatMMK(Number(yearly))}</Title>
        )}
        <Progress
          value={
            Number(yearly) > 0
              ? (Math.max(0, yearNet) / Number(yearly)) * 100
              : 0
          }
        />
        <Label>
          {t("YEAR NET")} {formatMMK(yearNet)}
        </Label>
      </Card>
      {editing ? (
        <>
          <Button title={t("Save all changes")} onPress={save} />
          <Button
            title={t("Cancel")}
            onPress={() => setEditing(false)}
            secondary
          />
        </>
      ) : (
        <Button
          title={t("Edit profile and financial settings")}
          onPress={() => setEditing(true)}
          secondary
          icon="settings-outline"
        />
      )}
      {!editing && (
        <Button
          title={t("Logout")}
          onPress={() => supabase.auth.signOut()}
          icon="log-out-outline"
        />
      )}
      <Label style={{ textAlign: "center" }}>VERSION 1.0.0</Label>
    </ScrollView>
  );
}
function Info({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.info}>
      <Ionicons name={icon} size={24} color={palette.muted} />
      <View>
        <Label>{label.toUpperCase()}</Label>
        <Text style={[styles.infoValue, { color: palette.text }]}>{value}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 16,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 40,
  },
  hero: {
    alignItems: "center",
    gap: 7,
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderRadius: 32,
    borderWidth: 1,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    height: 108,
    width: 108,
    borderRadius: 34,
    borderWidth: 5,
    borderColor: "#fff",
  },
  camera: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarActions: { flexDirection: "row", gap: 18, marginTop: 4 },
  avatarAction: { fontFamily: fonts.semibold, fontSize: 13 },
  email: { fontFamily: fonts.regular, fontSize: 15 },
  heading: { fontSize: 20, marginTop: 12, letterSpacing: -0.4 },
  preference: { flexDirection: "row", alignItems: "center", gap: 14 },
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4,
  },
  infoValue: { fontFamily: fonts.regular, fontSize: 16, marginTop: 3 },
});
