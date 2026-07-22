import {
  Category,
  CategoryBudgetHistory,
  MonthlyLimitHistory,
  Profile,
  YearlyGoalHistory,
} from "../types";

export function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseMonth(value: string) {
  return new Date(`${value}T00:00:00`);
}

function monthsBetweenInclusive(start: Date, end: Date) {
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    end.getMonth() -
    start.getMonth() +
    1
  );
}

export function effectiveMonthlyLimitForMonth(
  history: MonthlyLimitHistory[],
  profile: Profile | null,
  month: Date,
) {
  const effective = [...history]
    .filter((item) => parseMonth(item.effective_month) <= month)
    .sort(
      (a, b) =>
        parseMonth(a.effective_month).getTime() -
        parseMonth(b.effective_month).getTime(),
    )
    .at(-1);
  return Number(effective?.spending_limit ?? profile?.monthly_spending_cap ?? 0);
}

export function totalMonthlyLimitForRange(
  history: MonthlyLimitHistory[],
  profile: Profile | null,
  start: Date,
  end: Date,
) {
  const monthCount = monthsBetweenInclusive(start, end);
  return Array.from({ length: monthCount }).reduce<number>((sum, _, index) => {
    const month = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return sum + effectiveMonthlyLimitForMonth(history, profile, month);
  }, 0);
}

export function effectiveYearlyGoalForYear(
  history: YearlyGoalHistory[],
  profile: Profile | null,
  year: number,
) {
  const effective = [...history]
    .filter((item) => item.effective_year <= year)
    .sort((a, b) => a.effective_year - b.effective_year)
    .at(-1);
  return Number(effective?.savings_goal ?? profile?.yearly_savings_goal ?? 0);
}

export function effectiveCategoryBudgetForMonth(
  history: CategoryBudgetHistory[],
  category: Category,
  month: Date,
) {
  const effective = history
    .filter(
      (item) =>
        item.category_id === category.id &&
        parseMonth(item.effective_month) <= month,
    )
    .sort(
      (a, b) =>
        parseMonth(a.effective_month).getTime() -
        parseMonth(b.effective_month).getTime(),
    )
    .at(-1);
  return Number(effective?.monthly_budget ?? category.monthly_budget ?? 0);
}

export function totalCategoryBudgetForRange(
  history: CategoryBudgetHistory[],
  category: Category,
  start: Date,
  end: Date,
) {
  const monthCount = monthsBetweenInclusive(start, end);
  return Array.from({ length: monthCount }).reduce<number>((sum, _, index) => {
    const month = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return sum + effectiveCategoryBudgetForMonth(history, category, month);
  }, 0);
}
