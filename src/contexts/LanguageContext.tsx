import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
export type Language = "en" | "my";
const my: Record<string, string> = {
  Dashboard: "ပင်မ",
  History: "မှတ်တမ်း",
  Categories: "အမျိုးအစားများ",
  Profile: "ကိုယ်ရေး",
  English: "အင်္ဂလိပ်",
  Myanmar: "မြန်မာ",
  Language: "ဘာသာစကား",
  "Sign In": "အကောင့်ဝင်ရန်",
  "Sign Up": "အကောင့်ဖွင့်ရန်",
  "Forgot password?": "စကားဝှက်မေ့နေပါသလား?",
  "Email Address": "အီးမေးလ်လိပ်စာ",
  Password: "စကားဝှက်",
  "Confirm Password": "စကားဝှက်အတည်ပြုရန်",
  "Continue with Google": "Google ဖြင့် ဆက်လုပ်ရန်",
  "Create account": "အကောင့်ဖွင့်ရန်",
  "Send reset link": "ပြန်လည်သတ်မှတ်ရန် လင့်ခ်ပို့ရန်",
  "Back to sign in": "အကောင့်ဝင်ရန် ပြန်သွားမည်",
  "Welcome to Clarity Finance": "Clarity Finance မှ ကြိုဆိုပါသည်",
  "Recover your account": "သင့်အကောင့်ကို ပြန်လည်ရယူပါ",
  "Current Balance": "လက်ရှိလက်ကျန်",
  "This Month Income": "ယခုလ ဝင်ငွေ",
  "This Month Expense": "ယခုလ ထွက်ငွေ",
  "Budget vs Actual": "ဘတ်ဂျက်နှင့် အမှန်တကယ်",
  "Recent Transactions": "မကြာသေးမီ ငွေစာရင်းများ",
  "No transactions yet": "ငွေစာရင်း မရှိသေးပါ",
  "Tap to edit": "ပြင်ရန် နှိပ်ပါ",
  "Financial History": "ငွေကြေးမှတ်တမ်း",
  Monthly: "လစဉ်",
  Yearly: "နှစ်စဉ်",
  Activity: "လှုပ်ရှားမှု",
  Expenses: "ထွက်ငွေ",
  Income: "ဝင်ငွေ",
  "Add New Category": "အမျိုးအစားအသစ် ထည့်ရန်",
  Transactions: "ငွေစာရင်းများ",
  Edit: "ပြင်ရန်",
  "Personal Information": "ကိုယ်ရေးအချက်အလက်",
  Preferences: "စိတ်ကြိုက်ချိန်ညှိမှု",
  "Financial Settings": "ငွေကြေးဆိုင်ရာ သတ်မှတ်ချက်များ",
  Appearance: "အသွင်အပြင်",
  "Light Mode": "အလင်းမုဒ်",
  "Dark Mode": "အမှောင်မုဒ်",
  "Starting Capital": "အစပြုမတည်ငွေ",
  "Spending Cap": "အသုံးစရိတ်ကန့်သတ်ချက်",
  "Savings Goal": "စုဆောင်းငွေ ရည်မှန်းချက်",
  "Edit profile and financial settings":
    "ကိုယ်ရေးနှင့် ငွေကြေးသတ်မှတ်ချက်များ ပြင်ရန်",
  "Save all changes": "ပြောင်းလဲမှုအားလုံး သိမ်းရန်",
  Cancel: "မလုပ်တော့ပါ",
  Logout: "အကောင့်ထွက်ရန်",
  "Change photo": "ဓာတ်ပုံပြောင်းရန်",
  Remove: "ဖယ်ရှားရန်",
  "Add transaction": "ငွေစာရင်းထည့်ရန်",
  "Edit transaction": "ငွေစာရင်းပြင်ရန်",
  Amount: "ပမာဏ",
  Category: "အမျိုးအစား",
  Uncategorized: "အမျိုးအစားမသတ်မှတ်ထား",
  Note: "မှတ်ချက်",
  "Delete transaction": "ငွေစာရင်းဖျက်ရန်",
  "Choose a new password": "စကားဝှက်အသစ် ရွေးချယ်ပါ",
  "New Password": "စကားဝှက်အသစ်",
  "Update password": "စကားဝှက် ပြောင်းရန်",
  "Set your starting capital": "အစပြုမတည်ငွေ သတ်မှတ်ပါ",
  "Start tracking": "စာရင်းစတင်ရန်",
};
const Context = createContext<{
  language: Language;
  setLanguage: (v: Language) => void;
  t: (s: string) => string;
}>({ language: "en", setLanguage: () => {}, t: (s) => s });
export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setValue] = useState<Language>("en");
  useEffect(() => {
    AsyncStorage.getItem("clarity-language").then((v) => {
      if (v === "en" || v === "my") setValue(v);
    });
  }, []);
  const value = useMemo(
    () => ({
      language,
      setLanguage: (v: Language) => {
        setValue(v);
        AsyncStorage.setItem("clarity-language", v);
      },
      t: (s: string) => (language === "my" ? (my[s] ?? s) : s),
    }),
    [language],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useLanguage = () => useContext(Context);
