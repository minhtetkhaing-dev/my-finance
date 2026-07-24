import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Transaction } from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { fonts } from "../theme";
import { formatMMK } from "../lib/currency";
export function TransactionRow({
  item,
  sharedBill,
}: {
  item: Transaction;
  sharedBill?: boolean;
}) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const expense = item.kind === "expense";
  const categoryColor =
    item.category?.color ?? (expense ? palette.danger : palette.success);
  const categoryIcon =
    (item.category?.icon as keyof typeof Ionicons.glyphMap | undefined) ??
    (expense ? "card-outline" : "cash-outline");
  return (
    <View style={[s.row, { borderBottomColor: palette.border }]}>
      <View
        style={[
          s.icon,
          {
            backgroundColor: `${categoryColor}18`,
          },
        ]}
      >
        <Ionicons name={categoryIcon} size={23} color={categoryColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.name, { color: palette.text }]} numberOfLines={1}>
          {item.merchant}
        </Text>
        <View style={s.metaRow}>
          <Text
            style={[s.note, { color: palette.muted }]}
            numberOfLines={1}
          >
            {new Date(item.occurred_at).toLocaleDateString()} •{" "}
            {item.category?.name || item.note || t("Other")}
          </Text>
          {sharedBill && (
            <View
              style={[
                s.badge,
                {
                  backgroundColor: palette.primarySoft,
                  borderColor: `${palette.primary}44`,
                },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={12}
                color={palette.primary}
              />
              <Text style={[s.badgeText, { color: palette.primary }]}>
                {t("Shared")}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text
        style={[
          s.amount,
          { color: expense ? palette.danger : palette.success },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {expense ? "-" : "+"}
        {formatMMK(item.amount)}
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  row: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
  },
  icon: {
    height: 48,
    width: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: fonts.semibold, fontSize: 16 },
  note: { fontFamily: fonts.regular, fontSize: 13, marginTop: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  badge: {
    minHeight: 22,
    borderRadius: 9,
    borderWidth: 1,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11 },
  amount: { fontFamily: fonts.bold, fontSize: 16, maxWidth: "38%" },
});
