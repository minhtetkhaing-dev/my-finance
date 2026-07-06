import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  Category,
  CategoryBudgetHistory,
  CategoryKind,
  Transaction,
} from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { Card, Label, Progress, Title } from "../components/UI";
import { fonts } from "../theme";
import { formatMMK } from "../lib/currency";
import { CategoryEditorModal } from "./CategoryEditorModal";
import { CategoryDetailModal } from "./CategoryDetailModal";
import { useLanguage } from "../contexts/LanguageContext";
import { MonthRangePickerModal } from "../components/MonthRangePickerModal";

type Props = {
  categories: Category[];
  transactions: Transaction[];
  categoryBudgetHistory: CategoryBudgetHistory[];
  refresh: () => Promise<void>;
  loading: boolean;
};

type ViewMode = "list" | "grid";
const categoryViewKey = "clarity-category-view-mode";

export function CategoriesScreen({
  categories,
  transactions,
  categoryBudgetHistory,
  refresh,
}: Props) {
  const { palette } = useTheme();
  const { language, t } = useLanguage();
  const { width } = useWindowDimensions();
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [rangeStart, setRangeStart] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [rangeEnd, setRangeEnd] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [rangePickerOpen, setRangePickerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const narrowGrid = width < 560;
  useEffect(() => {
    AsyncStorage.getItem(categoryViewKey).then((saved) => {
      if (saved === "list" || saved === "grid") setViewMode(saved);
    });
  }, []);

  function changeViewMode(next: ViewMode) {
    setViewMode(next);
    AsyncStorage.setItem(categoryViewKey, next);
  }
  const list = categories.filter((category) => category.kind === kind);
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeMonths =
    (rangeEnd.getFullYear() - rangeStart.getFullYear()) * 12 +
    rangeEnd.getMonth() -
    rangeStart.getMonth() +
    1;
  const rangeNext = new Date(
    rangeEnd.getFullYear(),
    rangeEnd.getMonth() + 1,
    1,
  );
  const rangeTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.occurred_at);
    return date >= rangeStart && date < rangeNext;
  });
  const total = rangeTransactions
    .filter((transaction) => transaction.kind === kind)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const rangeLabel =
    rangeStart.getTime() === rangeEnd.getTime()
      ? rangeEnd.toLocaleDateString(language === "my" ? "my-MM" : "en-US", {
          month: "long",
          year: "numeric",
        })
      : `${rangeStart.toLocaleDateString(
          language === "my" ? "my-MM" : "en-US",
          { month: "short", year: "numeric" },
        )} – ${rangeEnd.toLocaleDateString(
          language === "my" ? "my-MM" : "en-US",
          { month: "short", year: "numeric" },
        )}`;

  function shiftRange(offset: number) {
    const nextEnd = new Date(
      rangeEnd.getFullYear(),
      rangeEnd.getMonth() + offset,
      1,
    );
    if (nextEnd > currentMonth) return;
    setRangeStart(
      new Date(rangeStart.getFullYear(), rangeStart.getMonth() + offset, 1),
    );
    setRangeEnd(nextEnd);
  }

  function categoryBudgetForRange(category: Category) {
    const history = categoryBudgetHistory
      .filter((item) => item.category_id === category.id)
      .sort(
        (a, b) =>
          new Date(a.effective_month).getTime() -
          new Date(b.effective_month).getTime(),
      );
    let totalBudget = 0;
    for (let index = 0; index < rangeMonths; index += 1) {
      const month = new Date(
        rangeStart.getFullYear(),
        rangeStart.getMonth() + index,
        1,
      );
      const effective = history
        .filter((item) => new Date(`${item.effective_month}T00:00:00`) <= month)
        .at(-1);
      totalBudget += Number(
        effective?.monthly_budget ?? category.monthly_budget ?? 0,
      );
    }
    return totalBudget;
  }

  const totalRecordedBudget =
    kind === "expense"
      ? list.reduce(
          (sum, category) => sum + categoryBudgetForRange(category),
          0,
        )
      : 0;

  function createCategory() {
    setEditorOpen(true);
  }
  const detailCategory =
    categories.find((category) => category.id === detailId) ?? null;

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
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
                ? "TOTAL SPENDING FOR PERIOD"
                : "TOTAL INCOME FOR PERIOD",
            )}
          </Label>
          <Title style={{ fontSize: 30 }}>{formatMMK(total)}</Title>
          <Progress
            value={
              kind === "expense" && totalRecordedBudget > 0
                ? (total / totalRecordedBudget) * 100
                : 0
            }
            danger={kind === "expense" && total > totalRecordedBudget}
            risk
          />
          {kind === "expense" && (
            <Label>
              {t("RECORDED CATEGORY BUDGETS")} {formatMMK(totalRecordedBudget)}
            </Label>
          )}
          <Text style={[styles.note, { color: palette.muted }]}>
            {t("Tap a category to change its name, icon, color, or budget.")}
          </Text>
        </Card>

        <Card style={styles.rangeCard}>
          <View style={styles.rangeTop}>
            <Pressable
              accessibilityLabel={t("Previous period")}
              onPress={() => shiftRange(-1)}
              style={[styles.rangeArrow, { backgroundColor: palette.input }]}
            >
              <Ionicons name="chevron-back" size={20} color={palette.text} />
            </Pressable>
            <View style={styles.rangeTitle}>
              <Label>{t("REPORTING PERIOD")}</Label>
              <Text style={[styles.rangeLabel, { color: palette.text }]}>
                {rangeLabel}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("Next period")}
              disabled={rangeEnd >= currentMonth}
              onPress={() => shiftRange(1)}
              style={[
                styles.rangeArrow,
                { backgroundColor: palette.input },
                rangeEnd >= currentMonth && styles.disabled,
              ]}
            >
              <Ionicons name="chevron-forward" size={20} color={palette.text} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => setRangePickerOpen(true)}
            style={[styles.selectRange, { backgroundColor: palette.primary }]}
          >
            <Ionicons name="calendar-outline" size={19} color="#fff" />
            <Text style={styles.selectRangeText}>
              {t("Select month range")}
            </Text>
          </Pressable>
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
        {list.length > 0 && (
          <View style={styles.collectionHeader}>
            <View>
              <Title style={{ fontSize: 21 }}>{t("Your categories")}</Title>
              <Label>
                {list.length} {t("CATEGORIES")}
              </Label>
            </View>
            <View
              style={[
                styles.viewToggle,
                { backgroundColor: palette.primarySoft },
              ]}
            >
              {(["list", "grid"] as const).map((mode) => (
                <Pressable
                  key={mode}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    mode === "list" ? "List view" : "Grid view",
                  )}
                  onPress={() => changeViewMode(mode)}
                  style={[
                    styles.viewButton,
                    viewMode === mode && { backgroundColor: palette.card },
                  ]}
                >
                  <Ionicons
                    name={mode === "list" ? "list" : "grid"}
                    size={20}
                    color={viewMode === mode ? palette.primary : palette.muted}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}
        <View
          style={[
            styles.categoryCollection,
            viewMode === "grid" && styles.categoryGrid,
          ]}
        >
          {list.map((category) => {
            const categoryTransactions = rangeTransactions.filter(
              (transaction) => transaction.category_id === category.id,
            );
            const amount = categoryTransactions.reduce(
              (sum, transaction) => sum + transaction.amount,
              0,
            );
            const recordedBudget = categoryBudgetForRange(category);
            const percentage = recordedBudget
              ? (amount / recordedBudget) * 100
              : total > 0
                ? (amount / total) * 100
                : 0;
            const grid = viewMode === "grid";
            return (
              <Pressable
                key={category.id}
                onPress={() => setDetailId(category.id)}
                style={
                  grid
                    ? [
                        styles.gridPressable,
                        {
                          flexBasis: narrowGrid ? "47%" : "31%",
                          maxWidth: narrowGrid ? "48%" : "32%",
                        },
                      ]
                    : undefined
                }
              >
                {({ pressed }) => (
                  <Card
                    style={[
                      styles.category,
                      grid && styles.gridCategory,
                      { borderColor: `${category.color}55` },
                      pressed && styles.categoryPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.icon,
                        grid && styles.gridIcon,
                        { backgroundColor: `${category.color}18` },
                      ]}
                    >
                      <Ionicons
                        name={category.icon as keyof typeof Ionicons.glyphMap}
                        size={grid ? 25 : 28}
                        color={category.color}
                      />
                    </View>
                    <View
                      style={[styles.categoryInfo, grid && styles.gridInfo]}
                    >
                      <Text
                        style={[styles.name, { color: palette.text }]}
                        numberOfLines={grid ? 2 : 1}
                      >
                        {category.name}
                      </Text>
                      <Label>
                        {categoryTransactions.length} {t("TRANSACTIONS")}
                      </Label>
                      {recordedBudget > 0 && (
                        <Label>
                          {t("BUDGET")} {formatMMK(recordedBudget)}
                        </Label>
                      )}
                    </View>
                    <View style={[styles.value, grid && styles.gridValue]}>
                      <Text
                        style={[
                          styles.amount,
                          grid && styles.gridAmount,
                          { color: palette.text },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {formatMMK(amount)}
                      </Text>
                      <Progress
                        value={percentage}
                        danger={percentage > 100}
                        risk
                      />
                    </View>
                    {!grid && (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={palette.muted}
                      />
                    )}
                  </Card>
                )}
              </Pressable>
            );
          })}
        </View>
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
      <MonthRangePickerModal
        visible={rangePickerOpen}
        start={rangeStart}
        end={rangeEnd}
        maximumMonth={currentMonth}
        onClose={() => setRangePickerOpen(false)}
        onApply={(start, end) => {
          setRangeStart(start);
          setRangeEnd(end);
          setRangePickerOpen(false);
        }}
      />
    </>
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
  segment: { padding: 5, borderRadius: 20, flexDirection: "row" },
  segmentItem: { flex: 1, padding: 12, borderRadius: 16 },
  segmentText: {
    textAlign: "center",
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  summary: { gap: 12, borderRadius: 30 },
  rangeCard: { gap: 13 },
  rangeTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  rangeTitle: { flex: 1, alignItems: "center" },
  rangeLabel: { fontFamily: fonts.semibold, fontSize: 15, marginTop: 2 },
  rangeArrow: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.35 },
  selectRange: {
    minHeight: 46,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  selectRangeText: { color: "#fff", fontFamily: fonts.semibold, fontSize: 14 },
  note: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  empty: { alignItems: "center", gap: 7 },
  collectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  viewToggle: { flexDirection: "row", padding: 4, borderRadius: 15 },
  viewButton: {
    width: 40,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryCollection: { gap: 16 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridPressable: { flexGrow: 1 },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 98,
  },
  categoryPressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  gridCategory: {
    minHeight: 210,
    height: "100%",
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 10,
  },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  gridIcon: { width: 50, height: 50, borderRadius: 16 },
  categoryInfo: { flex: 1, gap: 3 },
  gridInfo: { width: "100%", flexGrow: 0 },
  name: { fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.35 },
  value: { maxWidth: "38%", minWidth: 88, gap: 10 },
  gridValue: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    marginTop: "auto",
    gap: 8,
  },
  amount: { fontFamily: fonts.regular, fontSize: 15, textAlign: "right" },
  gridAmount: { textAlign: "left", fontFamily: fonts.semibold, fontSize: 16 },
  add: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 22,
    padding: 22,
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  addText: { fontFamily: fonts.semibold, fontSize: 15 },
});
