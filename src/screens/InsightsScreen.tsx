import { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category, Profile, Transaction } from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Card, Label, Progress, Title } from "../components/UI";
import { fonts } from "../theme";
import { formatMMK } from "../lib/currency";

type Props = {
  categories: Category[];
  transactions: Transaction[];
  profile: Profile | null;
  refresh: () => Promise<void>;
  loading: boolean;
};

function total(items: Transaction[], kind: "income" | "expense") {
  return items
    .filter((item) => item.kind === kind)
    .reduce((sum, item) => sum + item.amount, 0);
}

export function InsightsScreen({ categories, transactions, profile }: Props) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const compact = width < 560;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = useMemo(
    () => transactions.filter((item) => new Date(item.occurred_at) >= start),
    [transactions],
  );
  const previous = useMemo(
    () =>
      transactions.filter((item) => {
        const date = new Date(item.occurred_at);
        return date >= previousStart && date < start;
      }),
    [transactions],
  );
  const income = total(month, "income");
  const expense = total(month, "expense");
  const previousExpense = total(previous, "expense");
  const net = income - expense;
  const savingsRate = income > 0 ? (net / income) * 100 : null;
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthProgress = now.getDate() / days;
  const cap = Number(profile?.monthly_spending_cap || 0);
  const safeToSpend = Math.max(0, cap - expense);
  const expectedSpend = cap * monthProgress;
  const pace = cap > 0 ? (expense / cap) * 100 : 0;
  const yearItems = transactions.filter(
    (item) => new Date(item.occurred_at).getFullYear() === now.getFullYear(),
  );
  const yearNet = total(yearItems, "income") - total(yearItems, "expense");
  const goal = Number(profile?.yearly_savings_goal || 0);
  const goalProgress = goal > 0 ? Math.max(0, (yearNet / goal) * 100) : 0;
  const categoryTotals = categories
    .filter((category) => category.kind === "expense")
    .map((category) => ({
      category,
      amount: month
        .filter(
          (item) => item.category_id === category.id && item.kind === "expense",
        )
        .reduce((sum, item) => sum + item.amount, 0),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const top = categoryTotals[0];
  const expenseChange =
    previousExpense > 0
      ? ((expense - previousExpense) / previousExpense) * 100
      : null;
  const healthScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        (savingsRate == null
          ? 25
          : Math.min(40, Math.max(0, savingsRate * 2))) +
          (cap === 0
            ? 20
            : expense <= expectedSpend
              ? 35
              : expense <= cap
                ? 22
                : 5) +
          (goal === 0 ? 15 : Math.min(25, goalProgress / 4)),
      ),
    ),
  );
  const hasActivity = transactions.length > 0;
  const scoreTone =
    healthScore >= 70
      ? palette.success
      : healthScore >= 45
        ? palette.primary
        : palette.danger;

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.intro}>
        <View
          style={[styles.introIcon, { backgroundColor: palette.primarySoft }]}
        >
          <Ionicons name="sparkles" size={24} color={palette.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Title>{t("Financial insights")}</Title>
          <Text style={[styles.body, { color: palette.muted }]}>
            {t("A live view calculated from your real activity")}
          </Text>
        </View>
      </View>

      <Card
        style={[styles.scoreCard, { backgroundColor: palette.primarySoft }]}
      >
        <View style={styles.scoreTop}>
          <View style={[styles.scoreRing, { borderColor: scoreTone }]}>
            <Text style={[styles.score, { color: scoreTone }]}>
              {hasActivity ? healthScore : "—"}
            </Text>
            <Label>/ 100</Label>
          </View>
          <View style={{ flex: 1 }}>
            <Label>{t("FINANCIAL HEALTH")}</Label>
            <Title style={{ fontSize: compact ? 20 : 24 }}>
              {t(
                !hasActivity
                  ? "Add activity to unlock your score"
                  : healthScore >= 70
                    ? "You are building momentum"
                    : healthScore >= 45
                      ? "You are making progress"
                      : "A few changes can help",
              )}
            </Title>
          </View>
        </View>
        <Text style={[styles.body, { color: palette.muted }]}>
          {t(
            hasActivity
              ? "Your score considers savings, budget pace, and yearly goal progress."
              : "Your score will appear after you add real income or expense activity.",
          )}
        </Text>
      </Card>

      <View style={[styles.metrics, compact && styles.metricsCompact]}>
        <Metric
          icon="shield-checkmark"
          label={t("Safe to spend")}
          value={cap > 0 ? formatMMK(safeToSpend) : t("Set a spending cap")}
          tone={palette.success}
        />
        <Metric
          icon="trending-up"
          label={t("Savings rate")}
          value={
            savingsRate == null
              ? t("Needs income data")
              : `${savingsRate.toFixed(1)}%`
          }
          tone={
            savingsRate != null && savingsRate >= 0
              ? palette.success
              : palette.danger
          }
        />
      </View>

      <Card style={styles.cardGap}>
        <View style={styles.sectionTop}>
          <View>
            <Label>{t("MONTHLY SPENDING PACE")}</Label>
            <Title>{cap > 0 ? `${Math.round(pace)}%` : "—"}</Title>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  expense <= expectedSpend || cap === 0
                    ? palette.successSoft
                    : palette.dangerSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color:
                    expense <= expectedSpend || cap === 0
                      ? palette.success
                      : palette.danger,
                },
              ]}
            >
              {t(
                cap === 0
                  ? "No cap set"
                  : expense <= expectedSpend
                    ? "On pace"
                    : "Above pace",
              )}
            </Text>
          </View>
        </View>
        <Progress value={pace} danger={cap > 0 && expense > expectedSpend} />
        <Text style={[styles.body, { color: palette.muted }]}>
          {cap > 0
            ? t("You have spent {spent} of your {cap} monthly cap.")
                .replace("{spent}", formatMMK(expense))
                .replace("{cap}", formatMMK(cap))
            : t(
                "Set a monthly spending cap in Profile to unlock pacing guidance.",
              )}
        </Text>
      </Card>

      <Card style={styles.cardGap}>
        <View style={styles.sectionTop}>
          <View style={{ flex: 1 }}>
            <Label>{t("YEARLY SAVINGS GOAL")}</Label>
            <Title>{formatMMK(Math.max(0, yearNet))}</Title>
          </View>
          <Text style={[styles.percent, { color: palette.primary }]}>
            {goal > 0 ? `${Math.round(goalProgress)}%` : "—"}
          </Text>
        </View>
        <Progress value={goalProgress} danger={yearNet < 0} />
        <Text style={[styles.body, { color: palette.muted }]}>
          {goal > 0
            ? t("Goal: {goal}").replace("{goal}", formatMMK(goal))
            : t("Add a yearly goal in Profile to track your progress.")}
        </Text>
      </Card>

      <Title style={styles.sectionTitle}>{t("This month at a glance")}</Title>
      <Card style={styles.listCard}>
        <InsightRow
          icon="wallet"
          color={palette.primary}
          title={t("Net cash flow")}
          value={formatMMK(net)}
          valueColor={net >= 0 ? palette.success : palette.danger}
        />
        <InsightRow
          icon="pie-chart"
          color={palette.danger}
          title={t("Top spending category")}
          value={
            top
              ? `${top.category.name} · ${formatMMK(top.amount)}`
              : t("No spending yet")
          }
        />
        <InsightRow
          icon="swap-vertical"
          color={palette.success}
          title={t("Compared with last month")}
          value={
            expenseChange == null
              ? t("Not enough history")
              : `${expenseChange > 0 ? "+" : ""}${expenseChange.toFixed(1)}%`
          }
          valueColor={
            expenseChange != null && expenseChange > 0
              ? palette.danger
              : palette.success
          }
          last
        />
      </Card>
    </ScrollView>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tone: string;
}) {
  const { palette } = useTheme();
  return (
    <Card style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${tone}18` }]}>
        <Ionicons name={icon} size={21} color={tone} />
      </View>
      <Label>{label.toUpperCase()}</Label>
      <Text
        style={[styles.metricValue, { color: palette.text }]}
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </Card>
  );
}

function InsightRow({
  icon,
  color,
  title,
  value,
  valueColor,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.insightRow,
        !last && { borderBottomColor: palette.border, borderBottomWidth: 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.rowTitle, { color: palette.text }]}>{title}</Text>
      <Text
        style={[styles.rowValue, { color: valueColor || palette.text }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },
  intro: { flexDirection: "row", alignItems: "center", gap: 12 },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  scoreCard: { gap: 14, overflow: "hidden", borderRadius: 30 },
  scoreTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  scoreRing: {
    width: 82,
    height: 82,
    borderRadius: 26,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  score: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 30 },
  metrics: { flexDirection: "row", gap: 12 },
  metricsCompact: { flexDirection: "column" },
  metric: { flex: 1, minHeight: 138, gap: 9 },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  cardGap: { gap: 14 },
  sectionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12 },
  percent: { fontFamily: fonts.bold, fontSize: 22 },
  sectionTitle: { fontSize: 21, marginTop: 6 },
  listCard: { paddingVertical: 2 },
  insightRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { flex: 1, fontFamily: fonts.regular, fontSize: 14 },
  rowValue: {
    maxWidth: "43%",
    textAlign: "right",
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
});
