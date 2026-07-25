import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, G } from "react-native-svg";
import {
  Category,
  CategoryBudgetHistory,
  Profile,
  SharedBill,
  Transaction,
} from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { Card, Label, Progress, Title } from "../components/UI";
import { TransactionRow } from "../components/TransactionRow";
import { fonts } from "../theme";
import { TransactionModal } from "./TransactionModal";
import { formatMMK } from "../lib/currency";
import { useLanguage } from "../contexts/LanguageContext";
import { TransactionDetailModal } from "./TransactionDetailModal";
import {
  effectiveCategoryBudgetForMonth,
  monthStart,
} from "../lib/planningHistory";

type Props = {
  categories: Category[];
  transactions: Transaction[];
  sharedBills: SharedBill[];
  profile: Profile | null;
  categoryBudgetHistory: CategoryBudgetHistory[];
  refresh: () => Promise<void>;
  loading: boolean;
};
export function DashboardScreen({
  categories,
  transactions,
  sharedBills,
  profile,
  categoryBudgetHistory,
  refresh,
}: Props) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const compact = width < 430;
  const stackStats = width < 350;
  const chartSize = compact ? 150 : 176;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const sharedBillTransactionIds = useMemo(
    () => new Set(sharedBills.map((bill) => bill.transaction_id)),
    [sharedBills],
  );
  const now = new Date();
  const currentMonth = monthStart(now);
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
  const expenseBudgets = categories
    .filter(
      (item) =>
        item.kind === "expense" &&
        effectiveCategoryBudgetForMonth(
          categoryBudgetHistory,
          item,
          currentMonth,
        ) > 0,
    )
    .slice(0, 3);
  const incomeBudgets = categories
    .filter(
      (item) =>
        item.kind === "income" &&
        effectiveCategoryBudgetForMonth(
          categoryBudgetHistory,
          item,
          currentMonth,
        ) > 0,
    )
    .slice(0, 3);
  const buildCategoryBreakdown = (kind: "expense" | "income") => {
    const categoryMap = new Map(categories.map((item) => [item.id, item]));
    const totals = new Map<
      string,
      {
        id: string;
        name: string;
        color: string;
        icon: keyof typeof Ionicons.glyphMap;
        amount: number;
      }
    >();

    monthTransactions
      .filter((item) => item.kind === kind)
      .forEach((item) => {
        const category = item.category_id
          ? categoryMap.get(item.category_id)
          : undefined;
        const id = category?.id ?? "uncategorized";
        const current = totals.get(id) ?? {
          id,
          name: category?.name ?? t("Uncategorized"),
          color: category?.color ?? palette.muted,
          icon:
            (category?.icon as keyof typeof Ionicons.glyphMap | undefined) ??
            (kind === "expense" ? "card-outline" : "cash-outline"),
          amount: 0,
        };
        current.amount += Number(item.amount) || 0;
        totals.set(id, current);
      });

    const sorted = [...totals.values()]
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
    const visible = sorted.slice(0, 5);
    const hidden = sorted.slice(5);
    const otherAmount = hidden.reduce((sum, item) => sum + item.amount, 0);
    const rows =
      otherAmount > 0
        ? [
            ...visible,
            {
              id: "other",
              name: t("Other"),
              color: palette.highlight,
              icon: "ellipsis-horizontal",
              amount: otherAmount,
            },
          ]
        : visible;
    const total = rows.reduce((sum, item) => sum + item.amount, 0);

    return rows.map((item) => ({
      ...item,
      percentage: total > 0 ? (item.amount / total) * 100 : 0,
    }));
  };
  const expenseCategoryBreakdown = useMemo(
    () => buildCategoryBreakdown("expense"),
    [categories, monthTransactions, palette.highlight, palette.muted, t],
  );
  const incomeCategoryBreakdown = useMemo(
    () => buildCategoryBreakdown("income"),
    [categories, monthTransactions, palette.highlight, palette.muted, t],
  );
  const topExpenseCategory = expenseCategoryBreakdown[0];
  const topIncomeCategory = incomeCategoryBreakdown[0];
  function add() {
    setEditing(null);
    setOpen(true);
  }
  function edit(item: Transaction) {
    setEditing(item);
  }
  function renderBreakdown({
    data,
    top,
    title,
    totalLabel,
    topLabel,
    ofLabel,
    emptyLabel,
    totalAmount,
    delay,
  }: {
    data: (typeof expenseCategoryBreakdown);
    top: (typeof expenseCategoryBreakdown)[number] | undefined;
    title: string;
    totalLabel: string;
    topLabel: string;
    ofLabel: string;
    emptyLabel: string;
    totalAmount: number;
    delay: number;
  }) {
    return (
      <>
        <View style={[styles.sectionTitle, { marginTop: 16 }]}>
          <Title>{t(title)}</Title>
          <Label>{t("THIS MONTH")}</Label>
        </View>
        <Card
          delay={delay}
          style={[styles.donutCard, compact && styles.donutCardCompact]}
        >
          {data.length && top ? (
            <>
              <View
                style={[
                  styles.donutWrap,
                  { width: chartSize, height: chartSize },
                ]}
              >
                <CategoryDonut data={data} palette={palette} size={chartSize} />
                <View style={styles.donutCenter}>
                  <Label style={{ textAlign: "center" }}>
                    {t(totalLabel)}
                  </Label>
                  <Text
                    style={[
                      styles.donutAmount,
                      { color: palette.text },
                      compact && styles.donutAmountCompact,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatMMK(totalAmount)}
                  </Text>
                </View>
              </View>
              <View style={styles.donutInfo}>
                <Label>{t(topLabel)}</Label>
                <View style={styles.topCategoryRow}>
                  <View
                    style={[
                      styles.topCategoryIcon,
                      { backgroundColor: `${top.color}22` },
                    ]}
                  >
                    <Ionicons
                      name={top.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={top.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.topCategoryName, { color: palette.text }]}
                      numberOfLines={1}
                    >
                      {top.name}
                    </Text>
                    <Label>
                      {Math.round(top.percentage)}% {t(ofLabel)}
                    </Label>
                  </View>
                </View>
                <View style={styles.legend}>
                  {data.map((item) => (
                    <View key={item.id} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text
                        style={[styles.legendText, { color: palette.text }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Label>{Math.round(item.percentage)}%</Label>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Label>{t(emptyLabel)}</Label>
            </View>
          )}
        </Card>
      </>
    );
  }
  function renderBudgetSection({
    title,
    items,
    kind,
    emptyLabel,
    delay,
  }: {
    title: string;
    items: Category[];
    kind: "expense" | "income";
    emptyLabel: string;
    delay: number;
  }) {
    return (
      <>
        <View style={styles.sectionTitle}>
          <Title>{t(title)}</Title>
          <Label>{t("THIS MONTH")}</Label>
        </View>
        <Card delay={delay}>
          {items.length ? (
            items.map((category) => {
              const actual = monthTransactions
                .filter(
                  (item) =>
                    item.category_id === category.id && item.kind === kind,
                )
                .reduce((sum, item) => sum + item.amount, 0);
              const budget = effectiveCategoryBudgetForMonth(
                categoryBudgetHistory,
                category,
                currentMonth,
              );
              const percentage = (actual / (budget || 1)) * 100;
              return (
                <View key={category.id} style={styles.budget}>
                  <View style={styles.budgetTop}>
                    <Text style={[styles.itemName, { color: palette.text }]}>
                      {category.name}
                    </Text>
                    <Label
                      style={{
                        color:
                          kind === "expense" && percentage > 100
                            ? palette.danger
                            : palette.text,
                      }}
                    >
                      {formatMMK(actual)} / {formatMMK(budget)}
                    </Label>
                  </View>
                  <Progress
                    value={percentage}
                    danger={kind === "expense" && percentage > 100}
                    risk
                    reverseRisk={kind === "income"}
                  />
                </View>
              );
            })
          ) : (
            <View style={styles.empty}>
              <Label>{t(emptyLabel)}</Label>
            </View>
          )}
        </Card>
      </>
    );
  }
  return (
    <>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Card
          delay={0}
          style={[
            styles.balance,
            { backgroundColor: palette.ink, borderColor: palette.ink },
          ]}
        >
          <View
            style={[styles.balanceOrbLarge, { backgroundColor: palette.primary }]}
          />
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
              {t("CAPITAL + INCOME \u2212 EXPENSES")}
            </Label>
          </View>
        </Card>
        <View style={[styles.stats, stackStats && styles.statsCompact]}>
          <Card
            delay={90}
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
            <Title style={compact ? styles.statValueCompact : undefined}>
              {formatMMK(income)}
            </Title>
          </Card>
          <Card
            delay={170}
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
            <Title style={compact ? styles.statValueCompact : undefined}>
              {formatMMK(expense)}
            </Title>
          </Card>
        </View>
        {renderBreakdown({
          data: expenseCategoryBreakdown,
          top: topExpenseCategory,
          title: "Expense Category Breakdown",
          totalLabel: "TOTAL SPENT",
          topLabel: "TOP CATEGORY",
          ofLabel: "of spending",
          emptyLabel: "NO CATEGORY SPENDING YET",
          totalAmount: expense,
          delay: 240,
        })}
        {renderBudgetSection({
          title: "Expense Budget vs Actual",
          items: expenseBudgets,
          kind: "expense",
          emptyLabel: "NO CATEGORY BUDGETS YET",
          delay: 300,
        })}
        {renderBreakdown({
          data: incomeCategoryBreakdown,
          top: topIncomeCategory,
          title: "Income Category Breakdown",
          totalLabel: "TOTAL EARNED",
          topLabel: "TOP INCOME CATEGORY",
          ofLabel: "of income",
          emptyLabel: "NO CATEGORY INCOME YET",
          totalAmount: income,
          delay: 330,
        })}
        {renderBudgetSection({
          title: "Income Budget vs Actual",
          items: incomeBudgets,
          kind: "income",
          emptyLabel: "NO INCOME BUDGETS YET",
          delay: 360,
        })}
        <View style={styles.sectionTitle}>
          <Title>{t("Recent Transactions")}</Title>
          <Label>{t("Tap to view").toUpperCase()}</Label>
        </View>
        <Card delay={390} style={{ paddingVertical: 0 }}>
          {transactions.length ? (
            transactions.slice(0, 4).map((item) => (
              <Pressable key={item.id} onPress={() => edit(item)}>
                <TransactionRow
                  item={item}
                  sharedBill={sharedBillTransactionIds.has(item.id)}
                />
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
      <Fab onPress={add} palette={palette} />
      <TransactionModal
        visible={open}
        categories={categories}
        transaction={null}
        onClose={() => setOpen(false)}
        onSaved={refresh}
      />
      <TransactionDetailModal
        visible={Boolean(editing)}
        transaction={editing}
        categories={categories}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    </>
  );
}

function Fab({
  onPress,
  palette,
}: {
  onPress: () => void;
  palette: ReturnType<typeof useTheme>["palette"];
}) {
  const scale = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof AccessibilityInfo.isReduceMotionEnabled !== "function") return;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 170,
      mass: 0.7,
      delay: 450,
    }).start();
  }, [scale, reduceMotion]);
  const animatePress = (toValue: number) => {
    Animated.spring(press, {
      toValue,
      useNativeDriver: true,
      damping: 13,
      stiffness: 360,
      mass: 0.4,
    }).start();
  };
  return (
    <Animated.View
      style={[
        styles.fabWrap,
        {
          transform: [
            { scale: Animated.multiply(scale, press) },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => animatePress(0.88)}
        onPressOut={() => animatePress(1)}
        android_ripple={{ color: "rgba(255,255,255,.25)", radius: 28 }}
        style={[styles.fab, { backgroundColor: palette.primary }]}
      >
        <Ionicons name="add" size={34} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function CategoryDonut({
  data,
  palette,
  size,
}: {
  data: { id: string; color: string; percentage: number }[];
  palette: ReturnType<typeof useTheme>["palette"];
  size: number;
}) {
  const strokeWidth = size < 170 ? 22 : 25;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const draw = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (typeof AccessibilityInfo.isReduceMotionEnabled !== "function") return;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (reduceMotion) {
      draw.setValue(1);
      return;
    }
    Animated.timing(draw, {
      toValue: 1,
      duration: 1100,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [draw, reduceMotion]);
  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={palette.input}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {data.map((item) => {
          const dash = (item.percentage / 100) * circumference;
          const segment = (
            <AnimatedCircle
              key={item.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeLinecap="round"
              fill="transparent"
              strokeDashoffset={draw.interpolate({
                inputRange: [0, 1],
                outputRange: [
                  -offset - dash,
                  -offset,
                ],
              })}
              opacity={draw.interpolate({
                inputRange: [0, 0.6],
                outputRange: [0, 1],
                extrapolate: "clamp",
              })}
            />
          );
          offset += dash;
          return segment;
        })}
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 16,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  balance: { padding: 26, gap: 13, borderRadius: 30, overflow: "hidden" },
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
    width: 170,
    height: 170,
    borderRadius: 85,
    opacity: 0.55,
    right: -64,
    top: -78,
  },
  balanceOrbSmall: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    right: 86,
    bottom: -14,
    opacity: 0.85,
  },
  balanceValue: {
    fontFamily: fonts.bold,
    color: "#fff",
    fontSize: 30,
    letterSpacing: -1.2,
    zIndex: 2,
  },
  balanceValueCompact: { fontSize: 26 },
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
  statValueCompact: { fontSize: 19, lineHeight: 25, letterSpacing: -0.5 },
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
  donutCard: {
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  donutCardCompact: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  donutWrap: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  donutCenter: {
    position: "absolute",
    left: 22,
    right: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  donutAmount: {
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.7,
    textAlign: "center",
  },
  donutAmountCompact: {
    fontSize: 17,
  },
  donutInfo: {
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  topCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topCategoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  topCategoryName: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  legend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  empty: { height: 90, alignItems: "center", justifyContent: "center" },
  fabWrap: {
    position: "absolute",
    right: 24,
    bottom: 20,
  },
  fab: {
    height: 58,
    width: 58,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
  },
});
