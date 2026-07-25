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
import { Button, Card, Label, Progress, Title } from "../components/UI";
import { TransactionRow } from "../components/TransactionRow";
import { formatMMK } from "../lib/currency";
import { fonts } from "../theme";
import { CategoryEditorModal } from "./CategoryEditorModal";
import { TransactionModal } from "./TransactionModal";
import { useLanguage } from "../contexts/LanguageContext";
import { TransactionDetailModal } from "./TransactionDetailModal";

export function CategoryDetailModal({
  visible,
  category,
  categories,
  transactions,
  rangeStart,
  rangeEnd,
  periodBudget,
  onClose,
  onSaved,
}: {
  visible: boolean;
  category: Category | null;
  categories: Category[];
  transactions: Transaction[];
  rangeStart?: Date;
  rangeEnd?: Date;
  periodBudget?: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const [editCategory, setEditCategory] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  if (!category) return null;
  const items = transactions.filter((item) => item.category_id === category.id);
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const budget = Number(periodBudget ?? category.monthly_budget ?? 0);
  const percentage = budget ? (total / budget) * 100 : 0;
  const periodLabel =
    rangeStart && rangeEnd
      ? rangeStart.getTime() === rangeEnd.getTime()
        ? rangeStart.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })
        : `${rangeStart.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })} – ${rangeEnd.toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })}`
      : null;
  function addTransaction() {
    setEditingTransaction(null);
    setTransactionOpen(true);
  }
  function editTransaction(item: Transaction) {
    setEditingTransaction(item);
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.page, { backgroundColor: palette.background }]}>
          <View
            style={[
              styles.header,
              {
                backgroundColor: palette.card,
                borderBottomColor: palette.border,
              },
            ]}
          >
            <Pressable onPress={onClose}>
              <Ionicons name="arrow-back" size={26} color={palette.text} />
            </Pressable>
            <Title style={{ flex: 1 }}>{category.name}</Title>
            <Pressable
              onPress={() => setEditCategory(true)}
              style={[styles.editButton, { borderColor: palette.primary }]}
            >
              <Ionicons
                name="pencil-outline"
                size={18}
                color={palette.primary}
              />
              <Text style={[styles.editText, { color: palette.primary }]}>
                {t("Edit")}
              </Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Card style={styles.summary}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: `${category.color}18` },
                ]}
              >
                <Ionicons
                  name={category.icon as keyof typeof Ionicons.glyphMap}
                  size={34}
                  color={category.color}
                />
              </View>
              <Label>
                {periodLabel
                  ? `${periodLabel.toUpperCase()} ${category.kind.toUpperCase()}`
                  : `TOTAL ${category.kind.toUpperCase()}`}
              </Label>
              <Title>{formatMMK(total)}</Title>
              {budget > 0 && (
                <>
                  <View style={styles.budgetLine}>
                    <Label>
                      {periodLabel ? "PERIOD BUDGET" : "MONTHLY BUDGET"}
                    </Label>
                    <Label>{formatMMK(budget)}</Label>
                  </View>
                  <Progress
                    value={percentage}
                    danger={category.kind === "expense" && percentage > 100}
                    risk
                    reverseRisk={category.kind === "income"}
                  />
                </>
              )}
            </Card>
            <View style={styles.sectionTitle}>
              <Title style={{ fontSize: 21 }}>{t("Transactions")}</Title>
              <Label>{items.length} TOTAL</Label>
            </View>
            <Card style={{ paddingVertical: 0 }}>
              {items.length ? (
                items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => editTransaction(item)}
                  >
                    <TransactionRow item={item} />
                  </Pressable>
                ))
              ) : (
                <View style={styles.empty}>
                  <Label>NO TRANSACTIONS IN THIS CATEGORY</Label>
                </View>
              )}
            </Card>
            <Button
              title={t(
                category.kind === "expense" ? "Add expense" : "Add income",
              )}
              onPress={addTransaction}
              icon="add"
            />
            <Label style={{ textAlign: "center" }}>
              {t("Tap a transaction to view its details")}
            </Label>
          </ScrollView>
        </View>
      </Modal>
      <CategoryEditorModal
        visible={editCategory}
        kind={category.kind}
        category={category}
        onClose={() => setEditCategory(false)}
        onSaved={onSaved}
      />
      <TransactionModal
        visible={transactionOpen}
        categories={categories}
        transaction={null}
        initialCategoryId={category.id}
        onClose={() => setTransactionOpen(false)}
        onSaved={onSaved}
      />
      <TransactionDetailModal
        visible={Boolean(editingTransaction)}
        transaction={editingTransaction}
        categories={categories}
        onClose={() => setEditingTransaction(null)}
        onSaved={onSaved}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {
    minHeight: 72,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  content: {
    padding: 20,
    gap: 18,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  editButton: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 6,
  },
  editText: { fontFamily: fonts.semibold },
  summary: { alignItems: "center", gap: 8 },
  categoryIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetLine: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  empty: { height: 120, justifyContent: "center", alignItems: "center" },
});
