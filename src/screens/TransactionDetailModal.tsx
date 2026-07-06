import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category, Transaction } from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Card, Label, Title } from "../components/UI";
import { formatMMK } from "../lib/currency";
import { fonts } from "../theme";
import { TransactionModal } from "./TransactionModal";

export function TransactionDetailModal({
  visible,
  transaction,
  categories,
  onClose,
  onSaved,
}: {
  visible: boolean;
  transaction: Transaction | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  if (!transaction) return null;

  const expense = transaction.kind === "expense";
  const category =
    categories.find((item) => item.id === transaction.category_id) ?? null;
  const color = category?.color || (expense ? palette.danger : palette.success);

  async function saved() {
    setEditing(false);
    onClose();
    await onSaved();
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.page, { backgroundColor: palette.background }]}>
          <View
            style={[
              styles.header,
              {
                backgroundColor: palette.background,
                borderColor: palette.border,
              },
            ]}
          >
            <Pressable
              onPress={onClose}
              accessibilityLabel={t("Back")}
              style={[styles.roundButton, { backgroundColor: palette.card }]}
            >
              <Ionicons name="arrow-back" size={23} color={palette.text} />
            </Pressable>
            <Title style={styles.headerTitle}>{t("Transaction details")}</Title>
            <Pressable
              onPress={() => setEditing(true)}
              style={[styles.editButton, { backgroundColor: palette.primary }]}
            >
              <Ionicons name="pencil" size={17} color="#fff" />
              <Text style={styles.editText}>{t("Edit")}</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: `${color}20`, borderColor: `${color}55` },
                ]}
              >
                <Ionicons
                  name={
                    (category?.icon as keyof typeof Ionicons.glyphMap) ||
                    (expense ? "arrow-up" : "arrow-down")
                  }
                  size={31}
                  color={color}
                />
              </View>
              <View
                style={[
                  styles.kindPill,
                  {
                    backgroundColor: expense
                      ? palette.dangerSoft
                      : palette.successSoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.kindText,
                    { color: expense ? palette.danger : palette.success },
                  ]}
                >
                  {t(expense ? "Expense" : "Income").toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.amount, { color: palette.text }]}>
                {expense ? "−" : "+"}
                {formatMMK(transaction.amount)}
              </Text>
              <Text style={[styles.merchant, { color: palette.muted }]}>
                {transaction.merchant}
              </Text>
            </View>

            <Card style={styles.detailsCard}>
              <DetailRow
                icon="shapes-outline"
                label={t("Category")}
                value={category?.name || t("Uncategorized")}
              />
              <Divider color={palette.border} />
              <DetailRow
                icon="calendar-outline"
                label={t("Date and time")}
                value={new Date(transaction.occurred_at).toLocaleString()}
              />
              <Divider color={palette.border} />
              <DetailRow
                icon="document-text-outline"
                label={t("Note")}
                value={transaction.note || t("No note added")}
              />
            </Card>

            <View
              style={[styles.tip, { backgroundColor: palette.primarySoft }]}
            >
              <Ionicons
                name="information-circle"
                size={20}
                color={palette.primary}
              />
              <Text style={[styles.tipText, { color: palette.muted }]}>
                {t(
                  "Editing or deleting this transaction recalculates all balances and reports.",
                )}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <TransactionModal
        visible={editing}
        categories={categories}
        transaction={transaction}
        onClose={() => setEditing(false)}
        onSaved={saved}
      />
    </>
  );
}

function DetailRow({
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
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: palette.input }]}>
        <Ionicons name={icon} size={20} color={palette.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Label>{label.toUpperCase()}</Label>
        <Text style={[styles.detailValue, { color: palette.text }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {
    minHeight: 76,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: { flex: 1, fontSize: 20 },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  editButton: {
    height: 42,
    borderRadius: 15,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  editText: { color: "#fff", fontFamily: fonts.semibold, fontSize: 14 },
  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 40,
    gap: 18,
  },
  hero: { alignItems: "center", paddingVertical: 20 },
  heroIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  kindPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  kindText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 0.6 },
  amount: {
    fontFamily: fonts.bold,
    fontSize: 36,
    letterSpacing: -1.1,
    marginTop: 10,
    textAlign: "center",
  },
  merchant: { fontFamily: fonts.regular, fontSize: 17, marginTop: 5 },
  detailsCard: { paddingVertical: 6 },
  detailRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  detailValue: { fontFamily: fonts.semibold, fontSize: 15, marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
  tip: { borderRadius: 18, padding: 14, flexDirection: "row", gap: 10 },
  tipText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
});
