import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Category, Profile, Transaction } from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { Card, Field, Label, Title } from "../components/UI";
import { TransactionRow } from "../components/TransactionRow";
import { fonts } from "../theme";
import { formatMMK } from "../lib/currency";
import { useLanguage } from "../contexts/LanguageContext";
import { TransactionDetailModal } from "./TransactionDetailModal";

type Props = {
  categories: Category[];
  transactions: Transaction[];
  profile: Profile | null;
  refresh: () => Promise<void>;
  loading: boolean;
};
function periodStart(date: Date, yearly: boolean, offset = 0) {
  return yearly
    ? new Date(date.getFullYear() + offset, 0, 1)
    : new Date(date.getFullYear(), date.getMonth() + offset, 1);
}
function netTotal(items: Transaction[]) {
  return items.reduce(
    (sum, item) => sum + (item.kind === "income" ? item.amount : -item.amount),
    0,
  );
}

function chartData(items: Transaction[], yearly: boolean, width: number) {
  const count = yearly ? 12 : 6;
  const values = Array(count).fill(0);
  const labels = yearly
    ? [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ]
    : ["1", "6", "11", "16", "21", "26"];
  items.forEach((item) => {
    const date = new Date(item.occurred_at);
    const index = yearly
      ? date.getMonth()
      : Math.min(5, Math.floor((date.getDate() - 1) / 5));
    values[index] += item.kind === "income" ? item.amount : -item.amount;
  });
  let cumulative = Number(0);
  const cumulativeValues = values.map((value) => (cumulative += value));
  const min = Math.min(0, ...cumulativeValues);
  const max = Math.max(0, ...cumulativeValues);
  const range = max - min || 1;
  const points = cumulativeValues.map((value, index) => ({
    x: index * (width / (count - 1)),
    y: 135 - ((value - min) / range) * 115,
  }));
  return {
    labels,
    points,
    path: points
      .map(
        (point, index) =>
          `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(" "),
  };
}

export function HistoryScreen({ categories, transactions, refresh }: Props) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const compact = width < 480;
  const [query, setQuery] = useState("");
  const [yearly, setYearly] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [chartWidth, setChartWidth] = useState(400);
  const now = new Date();
  const currentStart = periodStart(now, yearly);
  const nextStart = periodStart(now, yearly, 1);
  const previousStart = periodStart(now, yearly, -1);
  const currentTransactions = useMemo(
    () =>
      transactions.filter((item) => {
        const date = new Date(item.occurred_at);
        return date >= currentStart && date < nextStart;
      }),
    [transactions, yearly],
  );
  const previousTransactions = useMemo(
    () =>
      transactions.filter((item) => {
        const date = new Date(item.occurred_at);
        return date >= previousStart && date < currentStart;
      }),
    [transactions, yearly],
  );
  const filtered = useMemo(
    () =>
      currentTransactions.filter((item) =>
        `${item.merchant} ${item.category?.name ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [currentTransactions, query],
  );
  const currentNet = netTotal(currentTransactions);
  const previousNet = netTotal(previousTransactions);
  const hasComparison = previousTransactions.length > 0 && previousNet !== 0;
  const change = hasComparison
    ? ((currentNet - previousNet) / Math.abs(previousNet)) * 100
    : null;
  const positive = (change ?? 0) >= 0;
  const chart = chartData(currentTransactions, yearly, chartWidth);
  return (
    <>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.intro, compact && styles.introCompact]}>
          <View style={{ flex: 1 }}>
            <Title style={{ fontSize: compact ? 27 : 32 }}>
              {t("Financial History")}
            </Title>
            <Text style={[styles.sub, { color: palette.muted }]}>
              {t("Calculated only from your transactions")}
            </Text>
          </View>
          <View
            style={[
              styles.toggle,
              compact && styles.toggleCompact,
              { backgroundColor: palette.primarySoft },
            ]}
          >
            {["Monthly", "Yearly"].map((label, index) => (
              <Pressable
                key={label}
                onPress={() => setYearly(Boolean(index))}
                style={[
                  styles.toggleItem,
                  {
                    backgroundColor:
                      yearly === Boolean(index) ? palette.card : "transparent",
                  },
                ]}
              >
                <Text style={[styles.toggleText, { color: palette.text }]}>
                  {t(label)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Card style={[styles.chartCard, { borderTopColor: palette.primary }]}>
          <View style={[styles.chartTop, compact && styles.chartTopCompact]}>
            <View>
              <Label>{t("NET INCOME VS EXPENSE")}</Label>
              <Title>{formatMMK(currentNet)}</Title>
            </View>
            <Label
              style={{
                color:
                  change == null
                    ? palette.muted
                    : positive
                      ? palette.success
                      : palette.danger,
                textAlign: compact ? "left" : "right",
              }}
            >
              {change == null
                ? t("NO PREVIOUS DATA")
                : `${positive ? "+" : ""}${change.toFixed(1)}%\n${t(yearly ? "VS LAST YEAR" : "VS LAST MONTH")}`}
            </Label>
          </View>
          {currentTransactions.length ? (
            <>
              <View
                style={styles.chartPlot}
                onLayout={({ nativeEvent }) => {
                  const measuredWidth = Math.round(nativeEvent.layout.width);
                  if (measuredWidth > 0 && measuredWidth !== chartWidth) {
                    setChartWidth(measuredWidth);
                  }
                }}
              >
                <Svg height={155} width={chartWidth}>
                  <Line
                    x1="0"
                    y1="135"
                    x2={chartWidth}
                    y2="135"
                    stroke={palette.border}
                    strokeWidth="1"
                  />
                  <Path
                    d={chart.path}
                    fill="none"
                    stroke={palette.primary}
                    strokeWidth="4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {chart.points.map((point, index) => (
                    <Circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill={palette.card}
                      stroke={palette.primary}
                      strokeWidth="3"
                    />
                  ))}
                </Svg>
              </View>
              <View style={styles.labels}>
                {chart.labels.map((label) => (
                  <Label key={label}>{label}</Label>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.noData}>
              <Label>
                {t(
                  yearly
                    ? "NO TRANSACTIONS IN THIS YEAR"
                    : "NO TRANSACTIONS IN THIS MONTH",
                )}
              </Label>
            </View>
          )}
          <View style={styles.summary}>
            <Label>
              {
                currentTransactions.filter((item) => item.kind === "income")
                  .length
              }{" "}
              {t("INCOME ENTRIES")}
            </Label>
            <Label>
              {
                currentTransactions.filter((item) => item.kind === "expense")
                  .length
              }{" "}
              {t("EXPENSE ENTRIES")}
            </Label>
          </View>
        </Card>
        <Field
          icon="search-outline"
          placeholder={t("Search this period…")}
          value={query}
          onChangeText={setQuery}
        />
        <View style={styles.sectionTitle}>
          <Title style={{ fontSize: 22 }}>{t("Activity")}</Title>
          <Label>{t("Tap to view").toUpperCase()}</Label>
        </View>
        <Card style={{ paddingVertical: 0 }}>
          {filtered.length ? (
            filtered.map((item) => (
              <Pressable key={item.id} onPress={() => setEditing(item)}>
                <TransactionRow item={item} />
              </Pressable>
            ))
          ) : (
            <View style={styles.noData}>
              <Label>{t("NO REAL TRANSACTIONS TO SHOW")}</Label>
            </View>
          )}
        </Card>
      </ScrollView>
      <TransactionDetailModal
        visible={Boolean(editing)}
        categories={categories}
        transaction={editing}
        onClose={() => setEditing(null)}
        onSaved={refresh}
      />
    </>
  );
}
const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 18,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  intro: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  introCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  sub: { fontFamily: fonts.regular, fontSize: 15, marginTop: 4 },
  toggle: {
    width: 240,
    padding: 5,
    borderRadius: 18,
    flexDirection: "row",
  },
  toggleCompact: { width: "100%" },
  toggleItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    textAlign: "center",
  },
  chartTop: { flexDirection: "row", justifyContent: "space-between" },
  chartTopCompact: { flexDirection: "column", gap: 6 },
  chartCard: { borderTopWidth: 5, borderRadius: 32, paddingTop: 18 },
  chartPlot: { width: "100%", height: 155, overflow: "hidden" },
  noData: { height: 110, alignItems: "center", justifyContent: "center" },
  labels: { flexDirection: "row", justifyContent: "space-between" },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
