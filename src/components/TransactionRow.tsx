import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Transaction } from "../types";
import { useTheme } from "../contexts/ThemeContext";
import { fonts } from "../theme";
import { formatMMK } from "../lib/currency";
export function TransactionRow({ item }: { item: Transaction }) {
  const { palette } = useTheme();
  const expense = item.kind === "expense";
  return (
    <View style={[s.row, { borderBottomColor: palette.border }]}>
      <View
        style={[
          s.icon,
          {
            backgroundColor: expense
              ? palette.primarySoft
              : palette.successSoft,
          },
        ]}
      >
        <Ionicons
          name={
            (item.category?.icon as keyof typeof Ionicons.glyphMap) ||
            "card-outline"
          }
          size={23}
          color={expense ? palette.primary : palette.success}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.name, { color: palette.text }]} numberOfLines={1}>
          {item.merchant}
        </Text>
        <Text style={[s.note, { color: palette.muted }]} numberOfLines={1}>
          {new Date(item.occurred_at).toLocaleDateString()} •{" "}
          {item.category?.name || item.note || "Other"}
        </Text>
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
  amount: { fontFamily: fonts.bold, fontSize: 16, maxWidth: "38%" },
});
