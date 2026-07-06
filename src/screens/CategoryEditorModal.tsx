import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category, CategoryKind } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button, Field, Label, Title } from "../components/UI";
import { supabase } from "../lib/supabase";
import { fonts } from "../theme";

const icons: (keyof typeof Ionicons.glyphMap)[] = [
  "restaurant-outline",
  "cafe-outline",
  "cart-outline",
  "home-outline",
  "flash-outline",
  "water-outline",
  "car-outline",
  "bus-outline",
  "airplane-outline",
  "bag-handle-outline",
  "shirt-outline",
  "medical-outline",
  "fitness-outline",
  "game-controller-outline",
  "film-outline",
  "school-outline",
  "gift-outline",
  "paw-outline",
  "phone-portrait-outline",
  "wifi-outline",
  "cash-outline",
  "wallet-outline",
  "briefcase-outline",
  "trending-up-outline",
  "fast-food-outline",
  "pizza-outline",
  "beer-outline",
  "nutrition-outline",
  "bed-outline",
  "construct-outline",
  "key-outline",
  "business-outline",
  "train-outline",
  "bicycle-outline",
  "walk-outline",
  "boat-outline",
  "receipt-outline",
  "card-outline",
  "calculator-outline",
  "storefront-outline",
  "basket-outline",
  "pricetag-outline",
  "diamond-outline",
  "heart-outline",
  "bandage-outline",
  "pulse-outline",
  "musical-notes-outline",
  "book-outline",
  "camera-outline",
  "color-palette-outline",
  "football-outline",
  "leaf-outline",
  "flower-outline",
  "sunny-outline",
  "desktop-outline",
  "laptop-outline",
  "hardware-chip-outline",
  "people-outline",
  "person-outline",
  "happy-outline",
  "shield-checkmark-outline",
  "lock-closed-outline",
  "build-outline",
  "hammer-outline",
  "calendar-outline",
  "time-outline",
  "analytics-outline",
  "bar-chart-outline",
  "download-outline",
  "cloud-outline",
  "ellipsis-horizontal-outline",
];
const colors = [
  "#00236F",
  "#4059AA",
  "#00714E",
  "#16A36A",
  "#C9151E",
  "#850024",
  "#D97706",
  "#7C3AED",
  "#DB2777",
  "#475569",
];

export function CategoryEditorModal({
  visible,
  kind,
  category,
  onClose,
  onSaved,
}: {
  visible: boolean;
  kind: CategoryKind;
  category: Category | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { session } = useAuth();
  const { palette } = useTheme();
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [icon, setIcon] =
    useState<keyof typeof Ionicons.glyphMap>("card-outline");
  const [color, setColor] = useState("#00236F");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setName(category?.name ?? "");
    setBudget(category?.monthly_budget?.toString() ?? "");
    setIcon(
      (category?.icon as keyof typeof Ionicons.glyphMap) ??
        (kind === "expense" ? "card-outline" : "cash-outline"),
    );
    setColor(category?.color ?? (kind === "expense" ? "#C9151E" : "#00714E"));
  }, [visible, category, kind]);

  async function save() {
    if (!session) return;
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Category name is required");
    const parsedBudget = budget.trim()
      ? Number(budget.replace(/,/g, ""))
      : null;
    if (
      parsedBudget != null &&
      (!Number.isFinite(parsedBudget) || parsedBudget < 0)
    )
      return Alert.alert("Enter a valid MMK budget");
    setBusy(true);
    const payload = {
      name: trimmed,
      color,
      icon,
      monthly_budget: parsedBudget,
    };
    const result = category
      ? await supabase
          .from("categories")
          .update(payload)
          .eq("id", category.id)
          .eq("user_id", session.user.id)
          .select()
          .single()
      : await supabase
          .from("categories")
          .insert({ ...payload, kind, user_id: session.user.id })
          .select()
          .single();
    setBusy(false);
    if (result.error)
      return Alert.alert(
        category ? "Could not update category" : "Could not create category",
        result.error.message,
      );
    onClose();
    await onSaved();
  }

  function remove() {
    if (!category || !session) return;
    Alert.alert(
      "Delete category?",
      "Existing transactions will be kept as uncategorized.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            const { error } = await supabase
              .from("categories")
              .delete()
              .eq("id", category.id)
              .eq("user_id", session.user.id);
            setBusy(false);
            if (error)
              return Alert.alert("Could not delete category", error.message);
            onClose();
            await onSaved();
          },
        },
      ],
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: palette.card }]}>
          <View style={styles.heading}>
            <Title>{category ? "Edit category" : `New ${kind} category`}</Title>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={28} color={palette.text} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.preview}>
              <View
                style={[styles.previewIcon, { backgroundColor: `${color}18` }]}
              >
                <Ionicons name={icon} size={34} color={color} />
              </View>
              <Text style={[styles.previewName, { color: palette.text }]}>
                {name || "Category name"}
              </Text>
              <Label>{kind.toUpperCase()}</Label>
            </View>
            <Label>CATEGORY NAME</Label>
            <Field
              value={name}
              onChangeText={setName}
              placeholder="Food, transport, salary…"
              maxLength={60}
            />
            <Label>MONTHLY BUDGET • MMK</Label>
            <Field
              value={budget}
              onChangeText={setBudget}
              placeholder="Optional, e.g. 500000"
              keyboardType="numeric"
            />
            <Label>SELECT ICON • IONICONS</Label>
            <View style={styles.iconGrid}>
              {icons.map((value) => (
                <Pressable
                  accessibilityLabel={value}
                  key={value}
                  onPress={() => setIcon(value)}
                  style={[
                    styles.iconOption,
                    {
                      borderColor: icon === value ? color : palette.border,
                      backgroundColor:
                        icon === value ? `${color}18` : palette.input,
                    },
                  ]}
                >
                  <Ionicons
                    name={value}
                    size={25}
                    color={icon === value ? color : palette.muted}
                  />
                </Pressable>
              ))}
            </View>
            <Label>SELECT COLOR</Label>
            <View style={styles.colorRow}>
              {colors.map((value) => (
                <Pressable
                  accessibilityLabel={value}
                  key={value}
                  onPress={() => setColor(value)}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: value,
                      borderColor:
                        color === value ? palette.text : "transparent",
                    },
                  ]}
                >
                  {color === value && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                </Pressable>
              ))}
            </View>
            <Button
              title={
                busy ? "Saving…" : category ? "Save changes" : "Create category"
              }
              onPress={save}
              disabled={busy || !name.trim()}
            />
            {category && (
              <Button
                title="Delete category"
                onPress={remove}
                secondary
                icon="trash-outline"
                disabled={busy}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,14,25,.66)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "92%",
    alignSelf: "center",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    paddingBottom: 36,
  },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  form: { gap: 13, paddingBottom: 12 },
  preview: { alignItems: "center", gap: 5, marginBottom: 4 },
  previewIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  previewName: { fontFamily: fonts.semibold, fontSize: 18 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  colorOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
});
