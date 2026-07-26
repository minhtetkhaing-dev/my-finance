import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
};

const maxQuestionLength = 900;
const monthNames = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type TransactionTotalRow = {
  amount: unknown;
  kind: string;
  occurred_at: string;
  merchant?: string | null;
  note?: string | null;
  category_id?: string | null;
  category?: { name?: string | null; kind?: string | null } | null;
};

function badRequest(message: string, status = 400) {
  return Response.json({ error: message }, { status, headers: corsHeaders });
}

function asNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function getAmount(item: { amount?: unknown }) {
  return asNumber(item.amount);
}

function sumBy<T extends { amount?: unknown }>(
  items: T[],
  predicate: (item: T) => boolean,
) {
  return items.reduce(
    (total, item) => total + (predicate(item) ? getAmount(item) : 0),
    0,
  );
}

function getMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

async function fetchTransactionTotals(
  admin: { from: (table: string) => any },
  userId: string,
) {
  const rows: TransactionTotalRow[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await admin
      .from("transactions")
      .select(
        "amount,kind,occurred_at,merchant,note,category_id,category:categories(name,kind)",
      )
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
    from += pageSize;
  }
}

function monthRangeForQuestion(question: string, now = new Date()) {
  const normalized = question.toLowerCase();
  const wantsReport =
    /\breport\b|\bsummary\b|\brecap\b|\bfully\b|\bfull\b/.test(normalized);
  const monthIndex = monthNames.findIndex((month) =>
    new RegExp(`\\b${month}\\b`).test(normalized),
  );
  if (!wantsReport || monthIndex < 0) return null;

  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  const currentYear = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Yangon",
      year: "numeric",
    }).format(now),
  );
  const year = yearMatch ? Number(yearMatch[1]) : currentYear;
  const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return {
    key: start,
    label: `${monthNames[monthIndex][0].toUpperCase()}${monthNames[
      monthIndex
    ].slice(1)} ${year}`,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Yangon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function buildCategoryBreakdown(rows: TransactionTotalRow[], kind: string) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.kind !== kind) continue;
    const name = row.category?.name ?? "Uncategorized";
    totals.set(name, (totals.get(name) ?? 0) + asNumber(row.amount));
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

function buildMonthReport(
  question: string,
  rows: TransactionTotalRow[],
  profile: { initial_capital?: unknown } | null,
) {
  const range = monthRangeForQuestion(question);
  if (!range) return null;

  const monthRows = rows.filter((item) =>
    String(item.occurred_at).startsWith(range.key),
  );
  const beforeMonthRows = rows.filter(
    (item) => String(item.occurred_at).slice(0, 7) < range.key,
  );
  const income = sumBy(monthRows, (item) => item.kind === "income");
  const expense = sumBy(monthRows, (item) => item.kind === "expense");
  const openingBalance =
    asNumber(profile?.initial_capital) +
    sumBy(beforeMonthRows, (item) => item.kind === "income") -
    sumBy(beforeMonthRows, (item) => item.kind === "expense");
  const closingBalance = openingBalance + income - expense;
  const topTransactions = [...monthRows]
    .sort((a, b) => asNumber(b.amount) - asNumber(a.amount))
    .slice(0, 12)
    .map((item) => ({
      date: formatDate(item.occurred_at),
      kind: item.kind,
      merchant: item.merchant,
      amount: asNumber(item.amount),
      category: item.category?.name ?? "Uncategorized",
      note: item.note,
    }));

  return {
    period: range.label,
    monthKey: range.key,
    transactionCount: monthRows.length,
    income,
    expense,
    netCashFlow: income - expense,
    openingBalance,
    closingBalance,
    expenseByCategory: buildCategoryBreakdown(monthRows, "expense"),
    incomeByCategory: buildCategoryBreakdown(monthRows, "income"),
    topTransactions,
  };
}

function compactHistory(history: ChatMessage[] | undefined) {
  return (history ?? [])
    .filter(
      (item) =>
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim(),
    )
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, maxQuestionLength),
    }));
}

function textFromGemini(data: {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}) {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() || ""
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const accessToken = authorization.replace(/^Bearer\s+/i, "");
    if (!accessToken) return badRequest("Missing authorization token", 401);

    const geminiKey =
      Deno.env.get("GEMINI_KEY") ?? Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) return badRequest("Missing Gemini server secret", 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(accessToken);
    if (userError || !user) return badRequest("Invalid user session", 401);

    const { question, history } = await request.json();
    if (typeof question !== "string" || !question.trim()) {
      return badRequest("question is required");
    }
    const cleanQuestion = question.trim().slice(0, maxQuestionLength);
    const cleanHistory = compactHistory(history);

    const [
      profileResult,
      categoriesResult,
      transactionsResult,
      transactionTotalRows,
      sharedBillsResult,
      monthlyPlansResult,
      yearlyPlansResult,
      categoryPlansResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "id,full_name,language,initial_capital,monthly_spending_cap,yearly_savings_goal",
        )
        .eq("id", user.id)
        .maybeSingle(),
      admin
        .from("categories")
        .select("id,name,kind,color,icon,monthly_budget")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      admin
        .from("transactions")
        .select(
          "id,category_id,amount,kind,merchant,note,occurred_at,category:categories(name,kind)",
        )
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(250),
      fetchTransactionTotals(admin, user.id),
      admin
        .from("shared_bills")
        .select(
          "id,total_amount,description,people_count,amount_per_person,expected_back_amount,occurred_at,closed_at,paybacks:shared_bill_paybacks(payer_name,amount,paid_at)",
        )
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(80),
      admin
        .from("monthly_limit_history")
        .select("effective_month,spending_limit")
        .eq("user_id", user.id)
        .order("effective_month", { ascending: false })
        .limit(18),
      admin
        .from("yearly_goal_history")
        .select("effective_year,savings_goal")
        .eq("user_id", user.id)
        .order("effective_year", { ascending: false })
        .limit(8),
      admin
        .from("category_budget_history")
        .select("category_id,effective_month,monthly_budget")
        .eq("user_id", user.id)
        .order("effective_month", { ascending: false })
        .limit(120),
    ]);

    const firstError =
      profileResult.error ??
      categoriesResult.error ??
      transactionsResult.error ??
      sharedBillsResult.error ??
      monthlyPlansResult.error ??
      yearlyPlansResult.error ??
      categoryPlansResult.error;
    if (firstError) throw firstError;

    const transactions = transactionsResult.data ?? [];
    const monthReport = buildMonthReport(
      cleanQuestion,
      transactionTotalRows,
      profileResult.data,
    );
    const monthKey = getMonthKey();
    const monthTransactions = transactionTotalRows.filter((item) =>
      String(item.occurred_at).startsWith(monthKey),
    );
    const totalIncome = sumBy(
      transactionTotalRows,
      (item) => item.kind === "income",
    );
    const totalExpense = sumBy(
      transactionTotalRows,
      (item) => item.kind === "expense",
    );
    const monthIncome = sumBy(
      monthTransactions,
      (item) => item.kind === "income",
    );
    const monthExpense = sumBy(
      monthTransactions,
      (item) => item.kind === "expense",
    );
    const currentBalance =
      asNumber(profileResult.data?.initial_capital) +
      totalIncome -
      totalExpense;

    const financeContext = {
      app: "My Finance",
      privacyScope:
        "This context contains only the authenticated user's profile, categories, transactions, shared bills, and planning history.",
      generatedAt: new Date().toISOString(),
      profile: profileResult.data,
      summary: {
        currentBalance,
        allTimeIncome: totalIncome,
        allTimeExpense: totalExpense,
        thisMonthIncome: monthIncome,
        thisMonthExpense: monthExpense,
        transactionRowsIncluded: transactionTotalRows.length,
        recentTransactionRowsIncluded: transactions.length,
      },
      databaseTablesAvailable: [
        "profiles",
        "categories",
        "transactions",
        "shared_bills",
        "shared_bill_paybacks",
        "monthly_limit_history",
        "yearly_goal_history",
        "category_budget_history",
      ],
      categories: categoriesResult.data ?? [],
      allTransactions: transactionTotalRows.map((item) => ({
        date: formatDate(item.occurred_at),
        occurred_at: item.occurred_at,
        kind: item.kind,
        amount: asNumber(item.amount),
        merchant: item.merchant,
        note: item.note,
        category: item.category?.name ?? "Uncategorized",
      })),
      recentTransactions: transactions,
      sharedBills: sharedBillsResult.data ?? [],
      monthlyLimitHistory: monthlyPlansResult.data ?? [],
      yearlyGoalHistory: yearlyPlansResult.data ?? [],
      categoryBudgetHistory: categoryPlansResult.data ?? [],
      requestedMonthReport: monthReport,
    };

    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.5-flash";
    const prompt = [
      "You are the private AI assistant inside a personal finance app named My Finance.",
      "The app context below is your private database access for this request. It contains rows fetched from Supabase for only the authenticated user.",
      "Understand the user's prompt, inspect the database context, calculate what is needed, and then write a natural understandable answer.",
      "Answer only using the database context below and general explanations of how this app's finance data works.",
      "Never mention, infer, compare, or reveal data from any other user. If asked for other users' data, refuse briefly.",
      "If the answer is not available in the app context, say you do not have that information in the app.",
      "Do not invent transactions, balances, people, dates, or profile details.",
      "Use only plain text. Do not use Markdown tables, backticks, code fences, or raw JSON.",
      "For report requests, calculate from allTransactions and database summaries. requestedMonthReport is only a helpful database-derived focus object, not a fixed response.",
      "If a requested month has no transactions, say there are no transactions for that exact period and do not list transactions from other months or years.",
      "When listing transactions, always include the full date as YYYY-MM-DD so the year is clear.",
      "For money, use MMK and include thousands separators.",
      "Write complete sentences. Never stop after a heading or label.",
      "Be practical and friendly. Use the user's language when it is clear from the question or profile language.",
      "",
      "Recent chat:",
      JSON.stringify(cleanHistory),
      "",
      "App context:",
      JSON.stringify(financeContext),
      "",
      `User question: ${cleanQuestion}`,
    ].join("\n");

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 1800,
          },
        }),
      },
    );

    const geminiData = await geminiResponse.json();
    if (!geminiResponse.ok) {
      throw new Error(geminiData.error?.message ?? "Gemini request failed");
    }

    const answer = textFromGemini(geminiData);
    if (!answer) throw new Error("Gemini returned an empty answer");

    return Response.json({ answer }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "AI chat failed",
      },
      { status: 400, headers: corsHeaders },
    );
  }
});
