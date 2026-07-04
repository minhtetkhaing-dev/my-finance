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
export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  language: "en" | "my";
  initial_capital: number | null;
  monthly_spending_cap: number;
  yearly_savings_goal: number;
};
