import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category, Profile, Transaction } from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { Card, Label, Progress, Title } from "../components/UI";
import { TransactionRow } from "../components/TransactionRow";
import { fonts } from "../theme";
import { TransactionModal } from "./TransactionModal";
import { formatMMK } from "../lib/currency";

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
        <Card style={[styles.balance, { backgroundColor: "#1E3A8A" }]}>
          <Label style={{ color: "#DCE1FF" }}>CURRENT BALANCE</Label>
          <Text style={styles.balanceValue}>{formatMMK(balance)}</Text>
          <View style={styles.trend}>
            <Ionicons name="wallet-outline" color="#fff" />
            <Label style={{ color: "#fff" }}>CAPITAL + INCOME − EXPENSES</Label>
          </View>
        </Card>
        <View style={styles.stats}>
          <Card style={styles.stat}>
            <Ionicons name="arrow-down" size={23} color={palette.success} />
            <Label>THIS MONTH INCOME</Label>
            <Title>{formatMMK(income)}</Title>
          </Card>
          <Card style={styles.stat}>
            <Ionicons name="arrow-up" size={23} color={palette.danger} />
            <Label>THIS MONTH EXPENSE</Label>
            <Title>{formatMMK(expense)}</Title>
          </Card>
        </View>
        <View style={styles.sectionTitle}>
          <Title>Budget vs Actual</Title>
          <Label>THIS MONTH</Label>
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
              <Label>NO CATEGORY BUDGETS YET</Label>
            </View>
          )}
        </Card>
        <View style={styles.sectionTitle}>
          <Title>Recent Transactions</Title>
          <Label>TAP TO EDIT</Label>
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
              <Label>NO TRANSACTIONS YET</Label>
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
    padding: 20,
    gap: 18,
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },
  balance: { padding: 28, gap: 14 },
  balanceValue: { fontFamily: fonts.regular, color: "#fff", fontSize: 40 },
  trend: {
    alignSelf: "flex-start",
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,.12)",
    flexDirection: "row",
    gap: 8,
  },
  stats: { flexDirection: "row", gap: 14 },
  stat: { flex: 1, gap: 9 },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  budget: { gap: 8, marginVertical: 10 },
  budgetTop: { flexDirection: "row", justifyContent: "space-between" },
  itemName: { fontFamily: fonts.regular, fontSize: 15 },
  empty: { height: 90, alignItems: "center", justifyContent: "center" },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 20,
    height: 60,
    width: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
});
