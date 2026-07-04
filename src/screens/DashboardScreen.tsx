import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category, Profile, Transaction } from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { Card, Label, Progress, Title } from "../components/UI";
import { TransactionRow } from "../components/TransactionRow";
import { fonts } from "../theme";
import { TransactionModal } from "./TransactionModal";
import { formatMMK } from "../lib/currency";
import { useLanguage } from "../contexts/LanguageContext";

type Props = {
  categories: Category[];
  transactions: Transaction[];
  profile: Profile | null;
  refresh: () => Promise<void>;
  loading: boolean;
};
export function DashboardScreen({
  categories,
  transactions,
  profile,
  refresh,
}: Props) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const compact = width < 430;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const now = new Date();
  const monthTransactions = transactions.filter((item) => {
    const date = new Date(item.occurred_at);
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  });
  const allIncome = transactions
    .filter((item) => item.kind === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const allExpense = transactions
    .filter((item) => item.kind === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const income = monthTransactions
    .filter((item) => item.kind === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = monthTransactions
    .filter((item) => item.kind === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const balance =
    Number(profile?.initial_capital ?? 0) + allIncome - allExpense;
  const budgets = categories
    .filter((item) => item.kind === "expense" && item.monthly_budget)
    .slice(0, 3);
  function add() {
    setEditing(null);
    setOpen(true);
  }
  function edit(item: Transaction) {
    setEditing(item);
    setOpen(true);
  }
  return (
    <>
      <ScrollView contentContainerStyle={styles.page}>
        <Card
          style={[
            styles.balance,
            { backgroundColor: palette.ink, borderColor: palette.ink },
          ]}
        >
          <View style={styles.balanceOrbLarge} />
          <View
            style={[
              styles.balanceOrbSmall,
              { backgroundColor: palette.highlight },
            ]}
          />
          <View style={styles.balanceTop}>
            <View>
              <Label style={{ color: "#B9B6C8" }}>
                {t("Current Balance").toUpperCase()}
              </Label>
              <Text style={styles.availableText}>{t("AVAILABLE NOW")}</Text>
            </View>
            <View
              style={[styles.walletMark, { backgroundColor: palette.primary }]}
            >
              <Ionicons name="wallet" size={20} color="#fff" />
            </View>
          </View>
          <Text
            style={[styles.balanceValue, compact && styles.balanceValueCompact]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatMMK(balance)}
          </Text>
          <View style={styles.trend}>
            <Ionicons name="pulse" color={palette.highlight} />
            <Label style={{ color: "#fff" }}>
              {t("CAPITAL + INCOME − EXPENSES")}
            </Label>
          </View>
        </Card>
        <View style={[styles.stats, compact && styles.statsCompact]}>
          <Card
            style={[
              styles.stat,
              {
                backgroundColor: palette.successSoft,
                borderColor: palette.success + "33",
              },
            ]}
          >
            <View
              style={[styles.statIcon, { backgroundColor: palette.success }]}
            >
              <Ionicons name="arrow-down" size={21} color="#fff" />
            </View>
            <Label>{t("This Month Income").toUpperCase()}</Label>
            <Title>{formatMMK(income)}</Title>
          </Card>
          <Card
            style={[
              styles.stat,
              {
                backgroundColor: palette.dangerSoft,
                borderColor: palette.danger + "33",
              },
            ]}
          >
            <View
              style={[styles.statIcon, { backgroundColor: palette.danger }]}
            >
              <Ionicons name="arrow-up" size={21} color="#fff" />
            </View>
            <Label>{t("This Month Expense").toUpperCase()}</Label>
            <Title>{formatMMK(expense)}</Title>
          </Card>
        </View>
        <View style={styles.sectionTitle}>
          <Title>{t("Budget vs Actual")}</Title>
          <Label>{t("THIS MONTH")}</Label>
        </View>
        <Card>
          {budgets.length ? (
            budgets.map((category) => {
              const spent = monthTransactions
                .filter(
                  (item) =>
                    item.category_id === category.id && item.kind === "expense",
                )
                .reduce((sum, item) => sum + item.amount, 0);
              const percentage = (spent / (category.monthly_budget || 1)) * 100;
              return (
                <View key={category.id} style={styles.budget}>
                  <View style={styles.budgetTop}>
                    <Text style={[styles.itemName, { color: palette.text }]}>
                      {category.name}
                    </Text>
                    <Label
                      style={{
                        color: percentage > 100 ? palette.danger : palette.text,
                      }}
                    >
                      {formatMMK(spent)} /{" "}
                      {formatMMK(category.monthly_budget || 0)}
                    </Label>
                  </View>
                  <Progress value={percentage} danger={percentage > 100} />
                </View>
              );
            })
          ) : (
            <View style={styles.empty}>
              <Label>{t("NO CATEGORY BUDGETS YET")}</Label>
            </View>
          )}
        </Card>
        <View style={styles.sectionTitle}>
          <Title>{t("Recent Transactions")}</Title>
          <Label>{t("Tap to edit").toUpperCase()}</Label>
        </View>
        <Card style={{ paddingVertical: 0 }}>
          {transactions.length ? (
            transactions.slice(0, 4).map((item) => (
              <Pressable key={item.id} onPress={() => edit(item)}>
                <TransactionRow item={item} />
              </Pressable>
            ))
          ) : (
            <View style={styles.empty}>
              <Label>{t("No transactions yet").toUpperCase()}</Label>
            </View>
          )}
        </Card>
        <View style={{ height: 80 }} />
      </ScrollView>
      <Pressable
        onPress={add}
        style={[styles.fab, { backgroundColor: palette.primary }]}
      >
        <Ionicons name="add" size={34} color="#fff" />
      </Pressable>
      <TransactionModal
        visible={open}
        categories={categories}
        transaction={editing}
        onClose={() => setOpen(false)}
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
  balance: { padding: 26, gap: 13, borderRadius: 30 },
  balanceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  availableText: {
    color: "#fff",
    fontFamily: fonts.semibold,
    fontSize: 12,
    marginTop: 3,
  },
  walletMark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "4deg" }],
  },
  balanceOrbLarge: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "#5449D8",
    right: -58,
    top: -70,
  },
  balanceOrbSmall: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    right: 86,
    bottom: -12,
  },
  balanceValue: {
    fontFamily: fonts.bold,
    color: "#fff",
    fontSize: 39,
    letterSpacing: -1.2,
    zIndex: 2,
  },
  balanceValueCompact: { fontSize: 32 },
  trend: {
    alignSelf: "flex-start",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,.12)",
    flexDirection: "row",
    gap: 8,
    zIndex: 2,
  },
  stats: { flexDirection: "row", gap: 14 },
  statsCompact: { flexDirection: "column" },
  stat: { flex: 1, gap: 9, minHeight: 150, borderRadius: 26 },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  budget: { gap: 8, marginVertical: 10 },
  budgetTop: { flexDirection: "row", justifyContent: "space-between" },
  itemName: { fontFamily: fonts.regular, fontSize: 15 },
  empty: { height: 90, alignItems: "center", justifyContent: "center" },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 20,
    height: 58,
    width: 58,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
});
