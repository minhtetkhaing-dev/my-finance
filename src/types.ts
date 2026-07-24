export type CategoryKind = "income" | "expense";
export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  monthly_budget: number | null;
};
export type Transaction = {
  id: string;
  category_id: string | null;
  amount: number;
  kind: CategoryKind;
  merchant: string;
  note: string | null;
  occurred_at: string;
  category?: Pick<Category, "name" | "color" | "icon"> | null;
};
export type SharedBill = {
  id: string;
  transaction_id: string;
  category_id: string | null;
  total_amount: number;
  description: string;
  people_count: number;
  amount_per_person: number;
  expected_back_amount: number;
  occurred_at: string;
  closed_at: string | null;
  created_at: string;
  category?: Pick<Category, "name" | "color" | "icon"> | null;
  expense?: Pick<
    Transaction,
    "id" | "amount" | "merchant" | "note" | "occurred_at"
  > | null;
  paybacks?: SharedBillPayback[];
};
export type SharedBillPayback = {
  id: string;
  shared_bill_id: string;
  payer_name: string;
  amount: number;
  paid_at: string;
  created_at: string;
};
export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  language: "en" | "my";
  initial_capital: number | null;
  initial_capital_locked: boolean;
  monthly_spending_cap: number;
  yearly_savings_goal: number;
};

export type MonthlyLimitHistory = {
  id: string;
  effective_month: string;
  spending_limit: number;
  created_at: string;
  updated_at: string;
};

export type YearlyGoalHistory = {
  id: string;
  effective_year: number;
  savings_goal: number;
  created_at: string;
  updated_at: string;
};

export type CategoryBudgetHistory = {
  id: string;
  category_id: string;
  effective_month: string;
  monthly_budget: number;
  created_at: string;
  updated_at: string;
};
