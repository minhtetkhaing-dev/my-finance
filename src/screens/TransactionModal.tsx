import { useEffect, useMemo, useState } from "react";
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
import { Category, CategoryKind, Transaction } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button, Field, Label, Title } from "../components/UI";
import { supabase } from "../lib/supabase";
import { fonts } from "../theme";

type Props = {
  visible: boolean;
  categories: Category[];
  transaction?: Transaction | null;
  initialCategoryId?: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function TransactionModal({
  visible,
  categories,
  transaction = null,
  initialCategoryId = null,
  onClose,
  onSaved,
}: Props) {
  const { session } = useAuth();
  const { palette } = useTheme();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const availableCategories = useMemo(
    () => categories.filter((category) => category.kind === kind),
    [categories, kind],
  );
  const parsedAmount = Number(amount.replace(/,/g, "").trim());

  useEffect(() => {
    if (!visible) return;
    setKind(
      transaction?.kind ??
        categories.find((category) => category.id === initialCategoryId)
          ?.kind ??
        "expense",
    );
    setMerchant(transaction?.merchant ?? "");
    setAmount(transaction ? String(transaction.amount) : "");
    setNote(transaction?.note ?? "");
    setCategoryId(transaction?.category_id ?? initialCategoryId);
  }, [visible, transaction, initialCategoryId, categories]);

  function chooseKind(value: CategoryKind) {
    if (transaction) return;
    setKind(value);
    setCategoryId(null);
  }

  async function save() {
    if (!session) return Alert.alert("Please sign in again");
    if (!merchant.trim())
      return Alert.alert(
        kind === "expense"
          ? "Enter where you spent the money"
          : "Enter the income source",
      );
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      return Alert.alert("Enter a valid amount greater than zero");
    setBusy(true);
    const values = {
      merchant: merchant.trim(),
      amount: parsedAmount,
      kind,
      category_id: categoryId,
      note: note.trim() || null,
      occurred_at: transaction?.occurred_at ?? new Date().toISOString(),
    };
    const result = transaction
      ? await supabase
          .from("transactions")
          .update(values)
          .eq("id", transaction.id)
          .eq("user_id", session.user.id)
          .select()
          .single()
      : await supabase
          .from("transactions")
          .insert({ ...values, user_id: session.user.id })
          .select()
          .single();
    setBusy(false);
    if (result.error) {
      const guidance =
        result.error.code === "42P01"
          ? "\n\nRun the Supabase migration first."
          : result.error.code === "42501"
            ? "\n\nAuthenticated grants or RLS policies are missing."
            : "";
      return Alert.alert(
        transaction
          ? "Could not update transaction"
          : "Could not save transaction",
        `${result.error.message}${guidance}`,
      );
    }
    onClose();
    await onSaved();
  }

  function remove() {
    if (!transaction || !session) return;
    Alert.alert(
      "Delete transaction?",
      "This will immediately recalculate your balance and analytics.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            const { error } = await supabase
              .from("transactions")
              .delete()
              .eq("id", transaction.id)
              .eq("user_id", session.user.id);
            setBusy(false);
            if (error)
              return Alert.alert("Could not delete transaction", error.message);
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
            <Title>
              {transaction ? "Edit transaction" : "Add transaction"}
            </Title>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={28} color={palette.text} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.segment}>
              {(["expense", "income"] as const).map((value) => (
                <Pressable
                  key={value}
                  disabled={Boolean(transaction)}
                  onPress={() => chooseKind(value)}
                  style={[
                    styles.segmentItem,
                    {
                      opacity: transaction && kind !== value ? 0.45 : 1,
                      backgroundColor:
                        kind === value
                          ? value === "expense"
                            ? palette.danger
                            : palette.success
                          : palette.input,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      value === "expense"
                        ? "arrow-up-outline"
                        : "arrow-down-outline"
                    }
                    size={20}
                    color={kind === value ? "#fff" : palette.muted}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      { color: kind === value ? "#fff" : palette.text },
                    ]}
                  >
                    {value.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Label>
              {kind === "expense" ? "MERCHANT / SPENT AT" : "INCOME SOURCE"}
            </Label>
            <Field
              value={merchant}
              onChangeText={setMerchant}
              placeholder={
                kind === "expense"
                  ? "Shop, bill, person…"
                  : "Salary, client, interest…"
              }
              maxLength={120}
            />
            <Label>AMOUNT • MMK</Label>
            <Field
              value={amount}
              onChangeText={setAmount}
              placeholder="e.g. 25000"
              keyboardType="numeric"
            />
            <Label>CATEGORY</Label>
            {availableCategories.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                <Pressable
                  onPress={() => setCategoryId(null)}
                  style={[
                    styles.chip,
                    {
                      borderColor: palette.border,
                      backgroundColor:
                        categoryId === null ? palette.primary : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: categoryId === null ? "#fff" : palette.text },
                    ]}
                  >
                    Uncategorized
                  </Text>
                </Pressable>
                {availableCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: category.color,
                        backgroundColor:
                          categoryId === category.id
                            ? category.color
                            : "transparent",
                      },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={17}
                      color={
                        categoryId === category.id ? "#fff" : category.color
                      }
                    />
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            categoryId === category.id ? "#fff" : palette.text,
                        },
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View
                style={[
                  styles.noCategories,
                  { backgroundColor: palette.input },
                ]}
              >
                <Text style={[styles.help, { color: palette.muted }]}>
                  No matching categories. This transaction can be saved as
                  Uncategorized.
                </Text>
              </View>
            )}
            <Label>NOTE • OPTIONAL</Label>
            <Field
              value={note}
              onChangeText={setNote}
              placeholder="Add a short note"
              maxLength={500}
            />
            <Button
              title={
                busy
                  ? "Saving…"
                  : transaction
                    ? "Save transaction changes"
                    : `Save ${kind}`
              }
              onPress={save}
              disabled={
                busy ||
                !merchant.trim() ||
                !Number.isFinite(parsedAmount) ||
                parsedAmount <= 0
              }
            />
            {transaction && (
              <Button
                title="Delete transaction"
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
    maxHeight: "90%",
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
    marginBottom: 12,
  },
  form: { gap: 14 },
  segment: { flexDirection: "row", gap: 8 },
  segmentItem: {
    flex: 1,
    padding: 12,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  segmentText: { fontFamily: fonts.mono },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    minHeight: 42,
    borderWidth: 1,
    paddingHorizontal: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipText: { fontFamily: fonts.mono, fontSize: 12 },
  noCategories: { borderRadius: 10, padding: 12 },
  help: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
});
