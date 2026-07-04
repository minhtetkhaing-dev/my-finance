import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category, CategoryKind, Profile, Transaction } from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { Card, Label, Progress, Title } from "../components/UI";
import { fonts } from "../theme";
import { formatMMK } from "../lib/currency";
import { CategoryEditorModal } from "./CategoryEditorModal";
import { CategoryDetailModal } from "./CategoryDetailModal";
import { useLanguage } from "../contexts/LanguageContext";

type Props = {
  categories: Category[];
  transactions: Transaction[];
  profile: Profile | null;
  refresh: () => Promise<void>;
  loading: boolean;
};

export function CategoriesScreen({
  categories,
  transactions,
  profile,
  refresh,
}: Props) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const list = categories.filter((category) => category.kind === kind);
  const now = new Date();
  const monthlyTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.occurred_at);
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  });
  const total = monthlyTransactions
    .filter((transaction) => transaction.kind === kind)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  function createCategory() {
    setEditorOpen(true);
  }
  const detailCategory =
    categories.find((category) => category.id === detailId) ?? null;

  return (
    <>
      <ScrollView contentContainerStyle={styles.page}>
        <View
          style={[styles.segment, { backgroundColor: palette.primarySoft }]}
        >
          {(["expense", "income"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setKind(value)}
              style={[
                styles.segmentItem,
                {
                  backgroundColor:
                    kind === value ? palette.card : "transparent",
                },
              ]}
            >
              <Text style={[styles.segmentText, { color: palette.text }]}>
                {t(value === "expense" ? "Expenses" : "Income")}
              </Text>
            </Pressable>
          ))}
        </View>
        <Card style={styles.summary}>
          <Label>
            {t(
              kind === "expense"
                ? "TOTAL MONTHLY SPENDING"
                : "TOTAL MONTHLY INCOME",
            )}
          </Label>
          <Title style={{ fontSize: 30 }}>{formatMMK(total)}</Title>
          <Progress
            value={
              kind === "expense" && profile?.monthly_spending_cap
                ? (total / profile.monthly_spending_cap) * 100
                : 0
            }
            danger={
              kind === "expense" &&
              Boolean(profile?.monthly_spending_cap) &&
              total > profile!.monthly_spending_cap
            }
          />
          <Text style={[styles.note, { color: palette.muted }]}>
            {t("Tap a category to change its name, icon, color, or budget.")}
          </Text>
        </Card>

        {list.length === 0 && (
          <Card style={styles.empty}>
            <Ionicons name="shapes-outline" size={36} color={palette.muted} />
            <Title style={{ fontSize: 18 }}>
              {t(
                kind === "expense"
                  ? "No expense categories"
                  : "No income categories",
              )}
            </Title>
            <Text style={[styles.note, { color: palette.muted }]}>
              {t("Create one below, then use it when adding a transaction.")}
            </Text>
          </Card>
        )}
        {list.map((category) => {
          const categoryTransactions = monthlyTransactions.filter(
            (transaction) => transaction.category_id === category.id,
          );
          const amount = categoryTransactions.reduce(
            (sum, transaction) => sum + transaction.amount,
            0,
          );
          const percentage = category.monthly_budget
            ? (amount / category.monthly_budget) * 100
            : 0;
          return (
            <Pressable
              key={category.id}
              onPress={() => setDetailId(category.id)}
            >
              {({ pressed }) => (
                <Card
                  style={[
                    styles.category,
                    { borderColor: `${category.color}55` },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View
                    style={[
                      styles.icon,
                      { backgroundColor: `${category.color}18` },
                    ]}
                  >
                    <Ionicons
                      name={category.icon as keyof typeof Ionicons.glyphMap}
                      size={28}
                      color={category.color}
                    />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.name, { color: palette.text }]}>
                      {category.name}
                    </Text>
                    <Label>
                      {categoryTransactions.length} {t("TRANSACTIONS")}
                    </Label>
                    {category.monthly_budget != null && (
                      <Label>
                        {t("BUDGET")} {formatMMK(category.monthly_budget)}
                      </Label>
                    )}
                  </View>
                  <View style={styles.value}>
                    <Text style={[styles.amount, { color: palette.text }]}>
                      {formatMMK(amount)}
                    </Text>
                    <Progress value={percentage} danger={percentage > 100} />
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={palette.muted}
                  />
                </Card>
              )}
            </Pressable>
          );
        })}
        <Pressable
          onPress={createCategory}
          style={[styles.add, { borderColor: palette.border }]}
        >
          <Ionicons name="add" size={26} color={palette.text} />
          <Text style={[styles.addText, { color: palette.text }]}>
            {t("Add New Category")}
          </Text>
        </Pressable>
      </ScrollView>
      <CategoryEditorModal
        visible={editorOpen}
        kind={kind}
        category={null}
        onClose={() => setEditorOpen(false)}
        onSaved={refresh}
      />
      <CategoryDetailModal
        visible={Boolean(detailCategory)}
        category={detailCategory}
        categories={categories}
        transactions={transactions}
        onClose={() => setDetailId(null)}
        onSaved={refresh}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 16,
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },
  segment: { padding: 5, borderRadius: 20, flexDirection: "row" },
  segmentItem: { flex: 1, padding: 12, borderRadius: 16 },
  segmentText: { textAlign: "center", fontFamily: fonts.mono, fontSize: 16 },
  summary: { gap: 12, borderRadius: 30 },
  note: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  empty: { alignItems: "center", gap: 7 },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 98,
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryInfo: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.35 },
  value: { maxWidth: "38%", minWidth: 88, gap: 10 },
  amount: { fontFamily: fonts.regular, fontSize: 15, textAlign: "right" },
  add: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 22,
    padding: 22,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  addText: { fontFamily: fonts.mono, fontSize: 16 },
});
