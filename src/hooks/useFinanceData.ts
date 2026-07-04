import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Category, Profile, Transaction } from "../types";

export function useFinanceData() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    const [c, t, p] = await Promise.all([
      supabase.from("categories").select("*").order("created_at"),
      supabase
        .from("transactions")
        .select("*, category:categories(name,color,icon)")
        .order("occurred_at", { ascending: false })
        .limit(100),
      supabase.from("profiles").select("*").maybeSingle(),
    ]);
    const firstError = c.error ?? t.error ?? p.error;
    setError(firstError ? `Database: ${firstError.message}` : null);
    setCategories((c.data ?? []) as Category[]);
    setTransactions((t.data ?? []) as Transaction[]);
    if (p.data) setProfile(p.data as Profile);
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { categories, transactions, profile, loading, error, refresh };
}
