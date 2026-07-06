import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";
import { Button, Label, Title } from "./UI";
import { fonts } from "../theme";

type Props = {
  visible: boolean;
  start: Date;
  end: Date;
  maximumMonth: Date;
  onClose: () => void;
  onApply: (start: Date, end: Date) => void;
};

function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function MonthRangePickerModal({
  visible,
  start,
  end,
  maximumMonth,
  onClose,
  onApply,
}: Props) {
  const { palette } = useTheme();
  const { language, t } = useLanguage();
  const [draftStart, setDraftStart] = useState(monthStart(start));
  const [draftEnd, setDraftEnd] = useState(monthStart(end));

  useEffect(() => {
    if (!visible) return;
    setDraftStart(monthStart(start));
    setDraftEnd(monthStart(end));
  }, [end, start, visible]);

  function chooseStart(value: Date) {
    setDraftStart(value);
    if (value > draftEnd) setDraftEnd(value);
  }

  function chooseEnd(value: Date) {
    setDraftEnd(value);
    if (value < draftStart) setDraftStart(value);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: palette.card }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Title>{t("Select reporting period")}</Title>
              <Text style={[styles.help, { color: palette.muted }]}>
                {t("Choose months and years only. Days are not included.")}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel={t("Cancel")}
              style={[styles.close, { backgroundColor: palette.input }]}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <MonthPanel
              label={t("START MONTH")}
              value={draftStart}
              maximumMonth={maximumMonth}
              language={language}
              onChange={chooseStart}
            />
            <MonthPanel
              label={t("END MONTH")}
              value={draftEnd}
              maximumMonth={maximumMonth}
              language={language}
              onChange={chooseEnd}
            />
            <View
              style={[
                styles.selection,
                { backgroundColor: palette.primarySoft },
              ]}
            >
              <Ionicons name="calendar" size={21} color={palette.primary} />
              <Text style={[styles.selectionText, { color: palette.text }]}>
                {formatMonth(draftStart, language)} —{" "}
                {formatMonth(draftEnd, language)}
              </Text>
            </View>
            <Button
              title={t("Apply month range")}
              onPress={() => onApply(draftStart, draftEnd)}
            />
            <Button title={t("Cancel")} onPress={onClose} secondary />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function MonthPanel({
  label,
  value,
  maximumMonth,
  language,
  onChange,
}: {
  label: string;
  value: Date;
  maximumMonth: Date;
  language: "en" | "my";
  onChange: (value: Date) => void;
}) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const year = value.getFullYear();
  const maximumYear = maximumMonth.getFullYear();
  return (
    <View style={[styles.panel, { borderColor: palette.border }]}>
      <Label>{label}</Label>
      <View style={styles.yearRow}>
        <Pressable
          accessibilityLabel={t("Previous year")}
          onPress={() => onChange(new Date(year - 1, value.getMonth(), 1))}
          style={[styles.yearButton, { backgroundColor: palette.input }]}
        >
          <Ionicons name="chevron-back" size={19} color={palette.text} />
        </Pressable>
        <Text style={[styles.year, { color: palette.text }]}>{year}</Text>
        <Pressable
          accessibilityLabel={t("Next year")}
          disabled={year >= maximumYear}
          onPress={() => onChange(new Date(year + 1, value.getMonth(), 1))}
          style={[
            styles.yearButton,
            { backgroundColor: palette.input },
            year >= maximumYear && styles.disabled,
          ]}
        >
          <Ionicons name="chevron-forward" size={19} color={palette.text} />
        </Pressable>
      </View>
      <View style={styles.monthGrid}>
        {Array.from({ length: 12 }, (_, month) => {
          const option = new Date(year, month, 1);
          const selected =
            value.getFullYear() === year && value.getMonth() === month;
          const disabled = option > maximumMonth;
          return (
            <Pressable
              key={month}
              disabled={disabled}
              onPress={() => onChange(option)}
              style={[
                styles.month,
                {
                  backgroundColor: selected ? palette.primary : palette.input,
                },
                disabled && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.monthText,
                  { color: selected ? "#fff" : palette.text },
                ]}
              >
                {option.toLocaleDateString(
                  language === "my" ? "my-MM" : "en-US",
                  {
                    month: "short",
                  },
                )}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function formatMonth(value: Date, language: "en" | "my") {
  return value.toLocaleDateString(language === "my" ? "my-MM" : "en-US", {
    month: "short",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,14,25,.68)",
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "92%",
    alignSelf: "center",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 18,
    paddingBottom: 30,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  help: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  close: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { gap: 14, paddingTop: 16 },
  panel: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 11 },
  yearRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  yearButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  year: { flex: 1, textAlign: "center", fontFamily: fonts.bold, fontSize: 18 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  month: {
    flexBasis: "22%",
    flexGrow: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  monthText: { fontFamily: fonts.semibold, fontSize: 12 },
  disabled: { opacity: 0.32 },
  selection: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectionText: { flex: 1, fontFamily: fonts.semibold, fontSize: 14 },
});
