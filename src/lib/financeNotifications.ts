import { Category, Profile, Transaction } from "../types";
import { formatMMK } from "./currency";

export type FinanceNotification = {
  id: string;
  title: string;
  message: string;
  icon: "warning" | "trophy" | "pie-chart" | "pricetag";
  tone: "danger" | "success" | "primary";
  destination: "dashboard" | "history" | "categories" | "insights" | "profile";
};

export function buildFinanceNotifications(
  categories: Category[],
  transactions: Transaction[],
  profile: Profile | null,
  t: (value: string) => string,
) {
  const now = new Date();
  const period = `${now.getFullYear()}-${now.getMonth() + 1}`;
  const monthly = transactions.filter((item) => {
    const date = new Date(item.occurred_at);
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  });
  const monthlyExpense = monthly
    .filter((item) => item.kind === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const notifications: FinanceNotification[] = [];
  const cap = Number(profile?.monthly_spending_cap || 0);

  if (cap > 0 && monthlyExpense >= cap) {
    notifications.push({
      id: `spending-cap-over-${period}`,
      title: t("Monthly limit exceeded"),
      message: t("You have spent {spent}, which is above your {limit} limit.")
        .replace("{spent}", formatMMK(monthlyExpense))
        .replace("{limit}", formatMMK(cap)),
      icon: "warning",
      tone: "danger",
      destination: "insights",
    });
  } else if (cap > 0 && monthlyExpense >= cap * 0.8) {
    notifications.push({
      id: `spending-cap-warning-${period}`,
      title: t("Approaching your monthly limit"),
      message: t("You have used {percent}% of your spending limit.").replace(
        "{percent}",
        Math.round((monthlyExpense / cap) * 100).toString(),
      ),
      icon: "pie-chart",
      tone: "primary",
      destination: "insights",
    });
  }

  categories
    .filter(
      (category) =>
        category.kind === "expense" && Number(category.monthly_budget) > 0,
    )
    .forEach((category) => {
      const spent = monthly
        .filter(
          (item) => item.kind === "expense" && item.category_id === category.id,
        )
        .reduce((sum, item) => sum + item.amount, 0);
      const budget = Number(category.monthly_budget);
      if (spent > budget) {
        notifications.push({
          id: `category-over-${category.id}-${period}`,
          title: t("Category budget exceeded"),
          message: t("{category} is {amount} over budget.")
            .replace("{category}", category.name)
            .replace("{amount}", formatMMK(spent - budget)),
          icon: "warning",
          tone: "danger",
          destination: "categories",
        });
      }
    });

  const yearly = transactions.filter(
    (item) => new Date(item.occurred_at).getFullYear() === now.getFullYear(),
  );
  const yearNet = yearly.reduce(
    (sum, item) => sum + (item.kind === "income" ? item.amount : -item.amount),
    0,
  );
  const goal = Number(profile?.yearly_savings_goal || 0);
  if (goal > 0 && yearNet >= goal) {
    notifications.push({
      id: `savings-goal-${now.getFullYear()}`,
      title: t("Savings goal reached!"),
      message: t("You reached your {goal} yearly savings goal.").replace(
        "{goal}",
        formatMMK(goal),
      ),
      icon: "trophy",
      tone: "success",
      destination: "insights",
    });
  }

  const uncategorized = transactions.filter((item) => !item.category_id).length;
  if (uncategorized > 0) {
    notifications.push({
      id: `uncategorized-${period}`,
      title: t("Transactions need attention"),
      message: t("{count} transactions have no category.").replace(
        "{count}",
        uncategorized.toString(),
      ),
      icon: "pricetag",
      tone: "primary",
      destination: "history",
    });
  }

  return notifications;
}
