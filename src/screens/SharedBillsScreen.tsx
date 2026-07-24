import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Category, Profile, SharedBill, Transaction } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button, Card, Field, Label, Progress, Title } from "../components/UI";
import { formatMMK } from "../lib/currency";
import { supabase } from "../lib/supabase";
import { fonts, shadow } from "../theme";
import { useLanguage } from "../contexts/LanguageContext";

type Props = {
  categories: Category[];
  transactions: Transaction[];
  sharedBills: SharedBill[];
  profile: Profile | null;
  refresh: () => Promise<void>;
  loading: boolean;
};

function parseAmount(value: string) {
  return Number(value.replace(/,/g, "").trim());
}

function paidTotal(bill: SharedBill) {
  return (bill.paybacks ?? []).reduce((sum, item) => sum + item.amount, 0);
}

function expectedPayback(bill: SharedBill) {
  return bill.expected_back_amount;
}

function remainingAmount(bill: SharedBill) {
  return Math.max(0, expectedPayback(bill) - paidTotal(bill));
}

export function SharedBillsScreen({
  categories,
  sharedBills,
  refresh,
}: Props) {
  const { session } = useAuth();
  const { palette } = useTheme();
  const { t } = useLanguage();
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.kind === "expense"),
    [categories],
  );
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [paybackOpen, setPaybackOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState("");
  const [people, setPeople] = useState("2");
  const [amountPerPerson, setAmountPerPerson] = useState("");
  const [manualShare, setManualShare] = useState(false);
  const [expectedBack, setExpectedBack] = useState("");
  const [manualExpectedBack, setManualExpectedBack] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editTotal, setEditTotal] = useState("");
  const [editPeople, setEditPeople] = useState("");
  const [editAmountPerPerson, setEditAmountPerPerson] = useState("");
  const [editExpectedBack, setEditExpectedBack] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [payerName, setPayerName] = useState("");
  const [paybackAmount, setPaybackAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const parsedTotal = parseAmount(total);
  const parsedPeople = Number(people.trim());
  const parsedShare = parseAmount(amountPerPerson);
  const parsedExpectedBack = parseAmount(expectedBack);
  const detailBill = sharedBills.find((bill) => bill.id === detailId) ?? null;
  const totals = sharedBills.reduce(
    (acc, bill) => {
      const expected = expectedPayback(bill);
      const paid = paidTotal(bill);
      return {
        expected: acc.expected + expected,
        paid: acc.paid + paid,
        open: acc.open + Math.max(0, expected - paid),
      };
    },
    { expected: 0, paid: 0, open: 0 },
  );

  useEffect(() => {
    if (manualShare) return;
    if (
      Number.isFinite(parsedTotal) &&
      parsedTotal > 0 &&
      Number.isFinite(parsedPeople) &&
      parsedPeople > 0
    ) {
      setAmountPerPerson(String(Math.round(parsedTotal / parsedPeople)));
    } else {
      setAmountPerPerson("");
    }
  }, [manualShare, parsedPeople, parsedTotal]);

  useEffect(() => {
    if (manualExpectedBack) return;
    if (
      Number.isFinite(parsedShare) &&
      parsedShare > 0 &&
      Number.isFinite(parsedPeople) &&
      parsedPeople > 0
    ) {
      setExpectedBack(String(Math.round(parsedShare * Math.max(0, parsedPeople - 1))));
    } else {
      setExpectedBack("");
    }
  }, [manualExpectedBack, parsedPeople, parsedShare]);

  function resetCreateForm() {
    setDescription("");
    setTotal("");
    setPeople("2");
    setAmountPerPerson("");
    setManualShare(false);
    setExpectedBack("");
    setManualExpectedBack(false);
    setCategoryId(null);
  }

  function openPaybackForm(bill: SharedBill) {
    setDetailId(bill.id);
    setPayerName("");
    setPaybackAmount(
      String(Math.min(bill.amount_per_person, remainingAmount(bill) || bill.amount_per_person)),
    );
    setPaybackOpen(true);
  }

  function openEditForm(bill: SharedBill) {
    setDetailId(bill.id);
    setEditDescription(bill.description);
    setEditTotal(String(bill.total_amount));
    setEditPeople(String(bill.people_count));
    setEditAmountPerPerson(String(bill.amount_per_person));
    setEditExpectedBack(String(bill.expected_back_amount));
    setEditCategoryId(bill.category_id);
    setEditOpen(true);
  }

  async function createSharedBill() {
    if (!session) return Alert.alert("Please sign in again");
    if (!description.trim()) return Alert.alert("Enter a description");
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0)
      return Alert.alert("Enter a valid total amount");
    if (!Number.isInteger(parsedPeople) || parsedPeople <= 0)
      return Alert.alert("Enter a valid number of people");
    if (!Number.isFinite(parsedShare) || parsedShare <= 0)
      return Alert.alert("Enter a valid amount per person");
    if (!Number.isFinite(parsedExpectedBack) || parsedExpectedBack < 0)
      return Alert.alert("Enter a valid expected back amount");
    if (parsedExpectedBack >= parsedTotal)
      return Alert.alert("Expected back amount must be less than the total");
    setBusy(true);
    const occurredAt = new Date().toISOString();
    const expense = await supabase
      .from("transactions")
      .insert({
        user_id: session.user.id,
        category_id: categoryId,
        amount: parsedTotal,
        kind: "expense",
        merchant: description.trim(),
        note: "Shared bill paid first",
        occurred_at: occurredAt,
      })
      .select("id")
      .single();
    if (expense.error) {
      setBusy(false);
      return Alert.alert("Could not create expense", expense.error.message);
    }
    const bill = await supabase
      .from("shared_bills")
      .insert({
        user_id: session.user.id,
        transaction_id: expense.data.id,
        category_id: categoryId,
        total_amount: parsedTotal,
        description: description.trim(),
        people_count: parsedPeople,
        amount_per_person: parsedShare,
        expected_back_amount: parsedExpectedBack,
        occurred_at: occurredAt,
        closed_at: parsedExpectedBack === 0 ? occurredAt : null,
      })
      .select("id")
      .single();
    if (bill.error) {
      await supabase
        .from("transactions")
        .delete()
        .eq("id", expense.data.id)
        .eq("user_id", session.user.id);
      setBusy(false);
      return Alert.alert("Could not create shared bill", bill.error.message);
    }
    resetCreateForm();
    setCreating(false);
    setDetailId(bill.data.id);
    setBusy(false);
    await refresh();
  }

  async function recordPayback() {
    if (!session) return Alert.alert("Please sign in again");
    if (!detailBill) return Alert.alert("Choose a shared bill");
    if (!payerName.trim()) return Alert.alert("Enter who paid back");
    const amount = parseAmount(paybackAmount);
    if (!Number.isFinite(amount) || amount <= 0)
      return Alert.alert("Enter a valid payback amount");
    const remaining = remainingAmount(detailBill);
    if (remaining <= 0)
      return Alert.alert("This shared bill is already closed");
    if (amount > remaining)
      return Alert.alert("Payback amount is more than the expected remaining amount");
    setBusy(true);
    try {
      const paidAt = new Date().toISOString();
      const payback = await supabase.from("shared_bill_paybacks").insert({
        user_id: session.user.id,
        shared_bill_id: detailBill.id,
        payer_name: payerName.trim(),
        amount,
        paid_at: paidAt,
      });
      if (payback.error) throw payback.error;
      setPayerName("");
      setPaybackAmount("");
      setPaybackOpen(false);
      await refresh();
    } catch (error) {
      Alert.alert(
        "Could not record payback",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSharedBillEdit() {
    if (!session) return Alert.alert("Please sign in again");
    if (!detailBill) return Alert.alert("Choose a shared bill");
    const nextTotal = parseAmount(editTotal);
    const nextPeople = Number(editPeople.trim());
    const nextShare = parseAmount(editAmountPerPerson);
    const nextExpected = parseAmount(editExpectedBack);
    const paid = paidTotal(detailBill);
    if (!editDescription.trim()) return Alert.alert("Enter a description");
    if (!Number.isFinite(nextTotal) || nextTotal <= 0)
      return Alert.alert("Enter a valid total amount");
    if (!Number.isInteger(nextPeople) || nextPeople <= 0)
      return Alert.alert("Enter a valid number of people");
    if (!Number.isFinite(nextShare) || nextShare <= 0)
      return Alert.alert("Enter a valid amount per person");
    if (!Number.isFinite(nextExpected) || nextExpected < 0)
      return Alert.alert("Enter a valid expected back amount");
    if (nextExpected >= nextTotal)
      return Alert.alert("Expected back amount must be less than the total");
    if (nextExpected < paid)
      return Alert.alert("Expected back amount cannot be less than paid back");
    setBusy(true);
    try {
      const closedAt =
        nextExpected > 0 && paid >= nextExpected
          ? (detailBill.closed_at ?? new Date().toISOString())
          : null;
      const billUpdate = await supabase
        .from("shared_bills")
        .update({
          category_id: editCategoryId,
          total_amount: nextTotal,
          description: editDescription.trim(),
          people_count: nextPeople,
          amount_per_person: nextShare,
          expected_back_amount: nextExpected,
          closed_at: closedAt,
        })
        .eq("id", detailBill.id)
        .eq("user_id", session.user.id);
      if (billUpdate.error) throw billUpdate.error;
      const expenseUpdate = await supabase
        .from("transactions")
        .update({
          category_id: editCategoryId,
          merchant: editDescription.trim(),
          amount: Math.max(0.01, nextTotal - Math.min(paid, nextExpected)),
          note: "Shared bill paid first",
        })
        .eq("id", detailBill.transaction_id)
        .eq("user_id", session.user.id);
      if (expenseUpdate.error) throw expenseUpdate.error;
      setEditOpen(false);
      await refresh();
    } catch (error) {
      Alert.alert(
        "Could not update shared bill",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <View style={{ flex: 1 }}>
            <Title style={styles.title}>{t("Shared Bills")}</Title>
            <Text style={[styles.sub, { color: palette.muted }]}>
              {t("Track bills you paid first and the money coming back.")}
            </Text>
          </View>
          <View
            style={[styles.totalPill, { backgroundColor: palette.primarySoft }]}
          >
            <Label>{t("OPEN")}</Label>
            <Text style={[styles.totalPillText, { color: palette.primary }]}>
              {formatMMK(totals.open)}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <MiniStat
            label={t("Expected back")}
            value={totals.expected}
            icon="people-outline"
          />
          <MiniStat
            label={t("Paid back")}
            value={totals.paid}
            icon="checkmark-done-outline"
            success
          />
        </View>

        <View style={styles.sectionTitle}>
          <Title>{t("Shared bill list")}</Title>
          <Label>{sharedBills.length} {t("BILLS")}</Label>
        </View>
        {sharedBills.length ? (
          sharedBills.map((bill) => (
            <Pressable key={bill.id} onPress={() => setDetailId(bill.id)}>
              <BillListCard bill={bill} />
            </Pressable>
          ))
        ) : (
          <Card style={styles.empty}>
            <Ionicons name="receipt-outline" size={30} color={palette.muted} />
            <Label>{t("NO SHARED BILLS RECORDED")}</Label>
          </Card>
        )}
        <View style={{ height: 88 }} />
      </ScrollView>

      <Fab onPress={() => setCreating(true)} />
      <CreateBillModal
        visible={creating}
        busy={busy}
        categories={expenseCategories}
        description={description}
        total={total}
        people={people}
        amountPerPerson={amountPerPerson}
        expectedBack={expectedBack}
        categoryId={categoryId}
        onDescription={setDescription}
        onTotal={setTotal}
        onPeople={(value) => {
          setPeople(value);
          setManualShare(false);
        }}
        onAmountPerPerson={(value) => {
          setAmountPerPerson(value);
          setManualShare(true);
          setManualExpectedBack(false);
        }}
        onExpectedBack={(value) => {
          setExpectedBack(value);
          setManualExpectedBack(true);
        }}
        onCategory={setCategoryId}
        onClose={() => {
          setCreating(false);
          resetCreateForm();
        }}
        onSave={createSharedBill}
      />
      <SharedBillDetailModal
        visible={Boolean(detailBill)}
        bill={detailBill}
        busy={busy}
        categories={expenseCategories}
        paybackOpen={paybackOpen}
        editOpen={editOpen}
        payerName={payerName}
        paybackAmount={paybackAmount}
        editDescription={editDescription}
        editTotal={editTotal}
        editPeople={editPeople}
        editAmountPerPerson={editAmountPerPerson}
        editExpectedBack={editExpectedBack}
        editCategoryId={editCategoryId}
        onPayerName={setPayerName}
        onPaybackAmount={setPaybackAmount}
        onEditDescription={setEditDescription}
        onEditTotal={setEditTotal}
        onEditPeople={setEditPeople}
        onEditAmountPerPerson={setEditAmountPerPerson}
        onEditExpectedBack={setEditExpectedBack}
        onEditCategory={setEditCategoryId}
        onClose={() => {
          setDetailId(null);
          setPaybackOpen(false);
          setEditOpen(false);
        }}
        onAddPayback={openPaybackForm}
        onEdit={openEditForm}
        onClosePayback={() => setPaybackOpen(false)}
        onCloseEdit={() => setEditOpen(false)}
        onSavePayback={recordPayback}
        onSaveEdit={saveSharedBillEdit}
      />
    </>
  );
}

function MiniStat({
  label,
  value,
  icon,
  success,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  success?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <Card
      style={[
        styles.stat,
        { backgroundColor: success ? palette.successSoft : palette.primarySoft },
      ]}
    >
      <View
        style={[
          styles.statIcon,
          { backgroundColor: success ? palette.success : palette.primary },
        ]}
      >
        <Ionicons name={icon} size={20} color="#fff" />
      </View>
      <Label>{label.toUpperCase()}</Label>
      <Title style={styles.statValue}>{formatMMK(value)}</Title>
    </Card>
  );
}

function BillListCard({ bill }: { bill: SharedBill }) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  const paid = paidTotal(bill);
  const expected = expectedPayback(bill);
  const remaining = Math.max(0, expected - paid);
  const complete = remaining <= 0 || Boolean(bill.closed_at);
  return (
    <Card style={styles.billCard}>
      <View style={styles.billTop}>
        <View style={[styles.billIcon, { backgroundColor: palette.primarySoft }]}>
          <Ionicons name="receipt-outline" size={21} color={palette.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Title style={styles.billTitle}>{bill.description}</Title>
          <Label>
            {bill.people_count} {t("people")} • {t("Net expense")}{" "}
            {formatMMK(Math.max(0, bill.total_amount - paid))}
          </Label>
        </View>
        <View
          style={[
            styles.status,
            { backgroundColor: complete ? palette.successSoft : palette.dangerSoft },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: complete ? palette.success : palette.danger },
            ]}
          >
            {complete ? t("Paid") : t("Open")}
          </Text>
        </View>
      </View>
      <View style={styles.billAmounts}>
        <AmountBlock label={t("Expected back")} value={expected} />
        <AmountBlock label={t("Paid back")} value={paid} success />
        <AmountBlock label={t("Remaining")} value={remaining} danger={remaining > 0} />
      </View>
      <Progress value={expected > 0 ? (paid / expected) * 100 : 100} danger={remaining > 0} risk />
    </Card>
  );
}

function SharedBillDetailModal({
  visible,
  bill,
  busy,
  categories,
  paybackOpen,
  editOpen,
  payerName,
  paybackAmount,
  editDescription,
  editTotal,
  editPeople,
  editAmountPerPerson,
  editExpectedBack,
  editCategoryId,
  onPayerName,
  onPaybackAmount,
  onEditDescription,
  onEditTotal,
  onEditPeople,
  onEditAmountPerPerson,
  onEditExpectedBack,
  onEditCategory,
  onClose,
  onAddPayback,
  onEdit,
  onClosePayback,
  onCloseEdit,
  onSavePayback,
  onSaveEdit,
}: {
  visible: boolean;
  bill: SharedBill | null;
  busy: boolean;
  categories: Category[];
  paybackOpen: boolean;
  editOpen: boolean;
  payerName: string;
  paybackAmount: string;
  editDescription: string;
  editTotal: string;
  editPeople: string;
  editAmountPerPerson: string;
  editExpectedBack: string;
  editCategoryId: string | null;
  onPayerName: (value: string) => void;
  onPaybackAmount: (value: string) => void;
  onEditDescription: (value: string) => void;
  onEditTotal: (value: string) => void;
  onEditPeople: (value: string) => void;
  onEditAmountPerPerson: (value: string) => void;
  onEditExpectedBack: (value: string) => void;
  onEditCategory: (value: string | null) => void;
  onClose: () => void;
  onAddPayback: (bill: SharedBill) => void;
  onEdit: (bill: SharedBill) => void;
  onClosePayback: () => void;
  onCloseEdit: () => void;
  onSavePayback: () => void;
  onSaveEdit: () => void;
}) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  if (!bill) return null;
  const paid = paidTotal(bill);
  const expected = expectedPayback(bill);
  const remaining = Math.max(0, expected - paid);
  const complete = remaining <= 0 || Boolean(bill.closed_at);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalPage, { backgroundColor: palette.background }]}>
        <View
          style={[
            styles.modalHeader,
            { backgroundColor: palette.background, borderColor: palette.border },
          ]}
        >
          <Pressable
            onPress={onClose}
            accessibilityLabel={t("Back")}
            style={[styles.roundButton, { backgroundColor: palette.card }]}
          >
            <Ionicons name="arrow-back" size={23} color={palette.text} />
          </Pressable>
          <Title style={styles.modalTitle}>{t("Shared bill detail")}</Title>
          <Pressable
            onPress={() => onEdit(bill)}
            accessibilityLabel={t("Edit")}
            style={[styles.headerAction, { backgroundColor: palette.primary }]}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.detailContent}>
          <Card
            style={[
              styles.detailHeroCard,
              { backgroundColor: palette.ink, borderColor: palette.ink },
            ]}
          >
            <View style={[styles.heroGlow, { backgroundColor: palette.primary }]} />
            <View style={[styles.heroGlowSmall, { backgroundColor: palette.highlight }]} />
            <View style={styles.heroTop}>
              <View style={styles.heroMark}>
                <Ionicons name="receipt" size={27} color="#fff" />
              </View>
              <View
                style={[
                  styles.closedPill,
                  { backgroundColor: complete ? palette.successSoft : "rgba(255,255,255,.14)" },
                ]}
              >
                <Text
                  style={[
                    styles.closedPillText,
                    { color: complete ? palette.success : "#fff" },
                  ]}
                >
                  {t(complete ? "Closed" : "Open")}
                </Text>
              </View>
            </View>
            <Text style={styles.detailHeroTitle}>{bill.description}</Text>
            <Text style={styles.detailHeroSub}>
              {new Date(bill.occurred_at).toLocaleString()} • {bill.people_count} {t("people")}
            </Text>
            <Text style={styles.netExpenseValue}>
              {formatMMK(Math.max(0, bill.total_amount - paid))}
            </Text>
            <Text style={styles.netExpenseLabel}>{t("NET EXPENSE AFTER PAYBACKS")}</Text>
          </Card>

          <Card style={styles.detailTotals}>
            <View style={styles.billAmounts}>
              <AmountBlock label={t("Original expense")} value={bill.total_amount} />
              <AmountBlock label={t("Expected back")} value={expected} />
            </View>
            <View style={styles.billAmounts}>
              <AmountBlock label={t("Paid back")} value={paid} success />
              <AmountBlock label={t("Remaining")} value={remaining} danger={remaining > 0} />
            </View>
            <Progress
              value={expected > 0 ? (paid / expected) * 100 : 100}
              danger={remaining > 0}
              risk
            />
          </Card>
          <View style={styles.sectionTitle}>
            <Title style={{ fontSize: 21 }}>{t("Payback history")}</Title>
            <Label>{(bill.paybacks ?? []).length} {t("RECORDS")}</Label>
          </View>
          {(bill.paybacks ?? []).length ? (
            (bill.paybacks ?? []).map((payback) => (
              <Card key={payback.id} style={styles.paybackCard}>
                <View style={[styles.billIcon, { backgroundColor: palette.successSoft }]}>
                  <Ionicons name="cash-outline" size={21} color={palette.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paybackName, { color: palette.text }]}>
                    {payback.payer_name}
                  </Text>
                  <Label>{new Date(payback.paid_at).toLocaleString()}</Label>
                </View>
                <Text style={[styles.paybackAmount, { color: palette.success }]}>
                  {formatMMK(payback.amount)}
                </Text>
              </Card>
            ))
          ) : (
            <Card style={styles.empty}>
              <Label>{t("NO PAYBACKS YET")}</Label>
            </Card>
          )}
          <View style={{ height: 88 }} />
        </ScrollView>
        {!complete && <Fab onPress={() => onAddPayback(bill)} />}
        {paybackOpen && (
          <InlineSheet title={t("Add payback history")} onClose={onClosePayback}>
            <View style={styles.selectedBill}>
              <Label>{t("SHARED BILL")}</Label>
              <Title style={{ fontSize: 18 }}>{bill.description}</Title>
            </View>
            <Label>{t("WHO PAID BACK")}</Label>
            <Field
              value={payerName}
              onChangeText={onPayerName}
              placeholder={t("Name")}
              maxLength={120}
            />
            <Label>{t("PAYBACK AMOUNT")}</Label>
            <Field
              value={paybackAmount}
              onChangeText={onPaybackAmount}
              keyboardType="numeric"
              placeholder="12500"
            />
            <Button
              title={busy ? t("Saving...") : t("Save payback")}
              onPress={onSavePayback}
              icon="cash-outline"
              disabled={busy}
            />
          </InlineSheet>
        )}
        {editOpen && (
          <InlineSheet title={t("Edit shared bill")} onClose={onCloseEdit}>
            <Label>{t("DESCRIPTION")}</Label>
            <Field
              value={editDescription}
              onChangeText={onEditDescription}
              placeholder={t("Dinner, utilities, trip booking...")}
              maxLength={120}
            />
            <Label>{t("CATEGORY")}</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              <Chip
                label={t("Uncategorized")}
                active={editCategoryId === null}
                onPress={() => onEditCategory(null)}
              />
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  icon={category.icon as keyof typeof Ionicons.glyphMap}
                  color={category.color}
                  active={editCategoryId === category.id}
                  onPress={() => onEditCategory(category.id)}
                />
              ))}
            </ScrollView>
            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Label>{t("TOTAL AMOUNT")}</Label>
                <Field
                  value={editTotal}
                  onChangeText={onEditTotal}
                  keyboardType="numeric"
                  placeholder="25000"
                />
              </View>
              <View style={styles.gridItem}>
                <Label>{t("PEOPLE")}</Label>
                <Field
                  value={editPeople}
                  onChangeText={onEditPeople}
                  keyboardType="numeric"
                  placeholder="2"
                />
              </View>
            </View>
            <Label>{t("AMOUNT PER PERSON")}</Label>
            <Field
              value={editAmountPerPerson}
              onChangeText={onEditAmountPerPerson}
              keyboardType="numeric"
              placeholder="12500"
            />
            <Label>{t("EXPECTED BACK AMOUNT")}</Label>
            <Field
              value={editExpectedBack}
              onChangeText={onEditExpectedBack}
              keyboardType="numeric"
              placeholder="12500"
            />
            <Button
              title={busy ? t("Saving...") : t("Save shared bill")}
              onPress={onSaveEdit}
              icon="checkmark-outline"
              disabled={busy}
            />
          </InlineSheet>
        )}
      </View>
    </Modal>
  );
}

function CreateBillModal({
  visible,
  busy,
  categories,
  description,
  total,
  people,
  amountPerPerson,
  expectedBack,
  categoryId,
  onDescription,
  onTotal,
  onPeople,
  onAmountPerPerson,
  onExpectedBack,
  onCategory,
  onClose,
  onSave,
}: {
  visible: boolean;
  busy: boolean;
  categories: Category[];
  description: string;
  total: string;
  people: string;
  amountPerPerson: string;
  expectedBack: string;
  categoryId: string | null;
  onDescription: (value: string) => void;
  onTotal: (value: string) => void;
  onPeople: (value: string) => void;
  onAmountPerPerson: (value: string) => void;
  onExpectedBack: (value: string) => void;
  onCategory: (value: string | null) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { palette } = useTheme();
  const { t } = useLanguage();
  return (
    <SheetModal visible={visible} title={t("Create shared bill")} onClose={onClose}>
      <Label>{t("DESCRIPTION")}</Label>
      <Field
        value={description}
        onChangeText={onDescription}
        placeholder={t("Dinner, utilities, trip booking...")}
        maxLength={120}
      />
      <Label>{t("CATEGORY")}</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label={t("Uncategorized")} active={categoryId === null} onPress={() => onCategory(null)} />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            icon={category.icon as keyof typeof Ionicons.glyphMap}
            color={category.color}
            active={categoryId === category.id}
            onPress={() => onCategory(category.id)}
          />
        ))}
      </ScrollView>
      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Label>{t("TOTAL AMOUNT")}</Label>
          <Field value={total} onChangeText={onTotal} keyboardType="numeric" placeholder="25000" />
        </View>
        <View style={styles.gridItem}>
          <Label>{t("PEOPLE")}</Label>
          <Field value={people} onChangeText={onPeople} keyboardType="numeric" placeholder="2" />
        </View>
      </View>
      <Label>{t("AMOUNT PER PERSON")}</Label>
      <Field
        value={amountPerPerson}
        onChangeText={onAmountPerPerson}
        keyboardType="numeric"
        placeholder="12500"
      />
      <Label>{t("EXPECTED BACK AMOUNT")}</Label>
      <Field
        value={expectedBack}
        onChangeText={onExpectedBack}
        keyboardType="numeric"
        placeholder="12500"
      />
      <Text style={[styles.help, { color: palette.muted }]}>
        {t("Paybacks reduce the linked expense until this expected amount is reached.")}
      </Text>
      <Button
        title={busy ? t("Saving...") : t("Create shared bill")}
        onPress={onSave}
        icon="receipt-outline"
        disabled={busy}
      />
    </SheetModal>
  );
}

function InlineSheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.inlineOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.inlineSheet, shadow, { backgroundColor: palette.card }]}>
        <View style={styles.sheetHeader}>
          <Title>{title}</Title>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={28} color={palette.text} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.sheetForm}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

function SheetModal({
  visible,
  title,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: palette.card }]}>
          <View style={styles.sheetHeader}>
            <Title>{title}</Title>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={28} color={palette.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetForm} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Chip({
  label,
  active,
  onPress,
  icon,
  color,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}) {
  const { palette } = useTheme();
  const tint = color ?? palette.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: tint,
          backgroundColor: active ? tint : "transparent",
        },
      ]}
    >
      {icon && <Ionicons name={icon} size={17} color={active ? "#fff" : tint} />}
      <Text
        style={[styles.chipText, { color: active ? "#fff" : palette.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function AmountBlock({
  label,
  value,
  danger,
  success,
}: {
  label: string;
  value: number;
  danger?: boolean;
  success?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.amountBlock}>
      <Label>{label.toUpperCase()}</Label>
      <Text
        style={[
          styles.amountBlockValue,
          { color: danger ? palette.danger : success ? palette.success : palette.text },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatMMK(value)}
      </Text>
    </View>
  );
}

function Fab({ onPress }: { onPress: () => void }) {
  const { palette } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      damping: 13,
      stiffness: 360,
      mass: 0.4,
    }).start();
  }
  return (
    <Animated.View style={[styles.fabWrap, shadow, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animate(0.9)}
        onPressOut={() => animate(1)}
        android_ripple={{ color: "rgba(255,255,255,.25)", radius: 28 }}
        style={[styles.fab, { backgroundColor: palette.primary }]}
      >
        <Ionicons name="add" size={34} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 16,
    maxWidth: 760,
    width: "100%",
    alignSelf: "center",
  },
  intro: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontSize: 32 },
  sub: { fontFamily: fonts.regular, fontSize: 14, marginTop: 4 },
  totalPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    minWidth: 116,
  },
  totalPillText: { fontFamily: fonts.bold, fontSize: 15, marginTop: 2 },
  stats: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, gap: 8 },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 18 },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  billCard: { gap: 14 },
  billTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  billIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  billTitle: { fontSize: 20 },
  status: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  statusText: { fontFamily: fonts.semibold, fontSize: 12 },
  billAmounts: { flexDirection: "row", gap: 10 },
  amountBlock: { flex: 1, gap: 4 },
  amountBlockValue: { fontFamily: fonts.semibold, fontSize: 14 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 28,
  },
  modalPage: { flex: 1 },
  modalHeader: {
    minHeight: 76,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalTitle: { flex: 1, fontSize: 20 },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  detailContent: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    padding: 18,
    paddingBottom: 40,
    gap: 18,
  },
  hero: { alignItems: "center", paddingVertical: 18, gap: 8 },
  heroIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitle: { fontSize: 26, textAlign: "center" },
  closedPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 99,
    marginTop: 3,
  },
  closedPillText: { fontFamily: fonts.semibold, fontSize: 12 },
  detailHeroCard: {
    gap: 10,
    overflow: "hidden",
    borderRadius: 28,
    padding: 22,
  },
  heroGlow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -70,
    top: -92,
    opacity: 0.5,
  },
  heroGlowSmall: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    right: 96,
    bottom: -18,
    opacity: 0.85,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 1,
  },
  heroMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailHeroTitle: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 28,
    zIndex: 1,
  },
  detailHeroSub: {
    color: "#D8D5E3",
    fontFamily: fonts.regular,
    fontSize: 14,
    zIndex: 1,
  },
  netExpenseValue: {
    color: "#fff",
    fontFamily: fonts.bold,
    fontSize: 34,
    marginTop: 8,
    zIndex: 1,
  },
  netExpenseLabel: {
    color: "#D8D5E3",
    fontFamily: fonts.mono,
    fontSize: 11,
    zIndex: 1,
  },
  detailTotals: { gap: 14 },
  paybackCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paybackName: { fontFamily: fonts.semibold, fontSize: 15 },
  paybackAmount: { fontFamily: fonts.bold, fontSize: 15 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,14,25,.66)",
    justifyContent: "flex-end",
  },
  inlineOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15,14,25,.52)",
    justifyContent: "flex-end",
    zIndex: 80,
  },
  inlineSheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "86%",
    alignSelf: "center",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    paddingBottom: 36,
  },
  sheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "88%",
    alignSelf: "center",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sheetForm: { gap: 14 },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    minHeight: 42,
    maxWidth: 220,
    borderWidth: 1,
    paddingHorizontal: 13,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chipText: { fontFamily: fonts.mono, fontSize: 12 },
  grid: { flexDirection: "row", gap: 12 },
  gridItem: { flex: 1, gap: 8 },
  help: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  selectedBill: { gap: 4 },
  fabWrap: {
    position: "absolute",
    right: 22,
    bottom: 104,
    borderRadius: 22,
    zIndex: 30,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
