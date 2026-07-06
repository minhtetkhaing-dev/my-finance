import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Category,
  CategoryBudgetHistory,
  MonthlyLimitHistory,
  Profile,
  Transaction,
  YearlyGoalHistory,
} from "../types";

const transactionPageSize = 1000;

async function fetchAllTransactions() {
  const rows: Transaction[] = [];
  let from = 0;
  while (true) {
    const result = await supabase
      .from("transactions")
      .select("*, category:categories(name,color,icon)")
      .order("occurred_at", { ascending: false })
      .range(from, from + transactionPageSize - 1);
    if (result.error) return { data: rows, error: result.error };
    const page = (result.data ?? []) as Transaction[];
    rows.push(...page);
    if (page.length < transactionPageSize) return { data: rows, error: null };
    from += transactionPageSize;
  }
}

export function useFinanceData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [monthlyLimitHistory, setMonthlyLimitHistory] = useState<
    MonthlyLimitHistory[]
  >([]);
  const [yearlyGoalHistory, setYearlyGoalHistory] = useState<
    YearlyGoalHistory[]
  >([]);
  const [categoryBudgetHistory, setCategoryBudgetHistory] = useState<
    CategoryBudgetHistory[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [c, t, p, monthlyPlans, yearlyPlans, categoryPlans] =
      await Promise.all([
        supabase.from("categories").select("*").order("created_at"),
        fetchAllTransactions(),
        supabase.from("profiles").select("*").maybeSingle(),
        supabase
          .from("monthly_limit_history")
          .select("id,effective_month,spending_limit,created_at,updated_at")
          .order("effective_month", { ascending: false }),
        supabase
          .from("yearly_goal_history")
          .select("id,effective_year,savings_goal,created_at,updated_at")
          .order("effective_year", { ascending: false }),
        supabase
          .from("category_budget_history")
          .select(
            "id,category_id,effective_month,monthly_budget,created_at,updated_at",
          )
          .order("effective_month", { ascending: false }),
      ]);
    const firstError =
      c.error ??
      t.error ??
      p.error ??
      monthlyPlans.error ??
      yearlyPlans.error ??
      categoryPlans.error;
    setError(firstError ? `Database: ${firstError.message}` : null);
    setCategories((c.data ?? []) as Category[]);
    setTransactions((t.data ?? []) as Transaction[]);
    if (p.data) setProfile(p.data as Profile);
    setMonthlyLimitHistory((monthlyPlans.data ?? []) as MonthlyLimitHistory[]);
    setYearlyGoalHistory((yearlyPlans.data ?? []) as YearlyGoalHistory[]);
    setCategoryBudgetHistory(
      (categoryPlans.data ?? []) as CategoryBudgetHistory[],
    );
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    const refreshSoon = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => refresh(true), 120);
    };
    const channel = supabase
      .channel("finance-data")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        refreshSoon,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        refreshSoon,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        refreshSoon,
      )
      .subscribe();
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [refresh]);
  return {
    categories,
    transactions,
    profile,
    monthlyLimitHistory,
    yearlyGoalHistory,
    categoryBudgetHistory,
    loading,
    error,
    refresh,
  };
}
