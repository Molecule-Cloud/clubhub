import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentCategories, useMyPayments, useInitializePayment, useVerifyPayment, type PaymentCategory, type Payment } from "@/lib/use-payments";
import { useTheme } from "@/theme/useTheme";
import { spacing, radius } from "@/theme/colors";

function formatMoney(minorUnits: number, currency = "GHS") {
  return `${currency} ${(minorUnits / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLORS: Record<Payment["status"], "nodeEmerald" | "nodeAmber" | "destructive" | "mutedForeground"> = {
  SUCCESS: "nodeEmerald",
  PENDING: "nodeAmber",
  FAILED: "destructive",
  REFUNDED: "mutedForeground",
};

export default function PaymentsScreen() {
  const theme = useTheme();
  const { data: categories, isLoading: categoriesLoading } = usePaymentCategories();
  const { data: payments, isLoading: paymentsLoading } = useMyPayments();
  const initializePayment = useInitializePayment();
  const verifyPayment = useVerifyPayment();

  const [selectedCategory, setSelectedCategory] = useState<PaymentCategory | null>(null);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  function selectCategory(category: PaymentCategory) {
    setSelectedCategory(category);
    setAmount(category.defaultAmount ? (category.defaultAmount / 100).toFixed(2) : "");
  }

  async function handlePay() {
    if (!selectedCategory) return;
    const amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      Alert.alert("Enter an amount", "Please enter a valid amount to pay.");
      return;
    }

    setIsProcessing(true);
    try {
      // expo-linking builds the correct redirect scheme for whatever
      // context the app is running in (Expo Go's exp:// during dev,
      // the app's own custom scheme in a standalone build) — hardcoding
      // "clubhub://..." would work in production but silently fail to
      // redirect back during Expo Go development testing.
      const redirectUrl = Linking.createURL("payment-callback");

      const initResult = await initializePayment.mutateAsync({
        categoryId: selectedCategory.id,
        amount: Math.round(amountValue * 100),
        callbackUrl: redirectUrl,
      });

      const browserResult = await WebBrowser.openAuthSessionAsync(initResult.data.authorizationUrl, redirectUrl);

      if (browserResult.type === "success") {
        // The webhook is still the authoritative source of truth for
        // payment status (see backend's handlePaystackWebhookEvent) — this
        // verify call is purely so the app doesn't sit showing "pending"
        // for however long the webhook takes to arrive, since Paystack's
        // redirect firing means checkout very likely already succeeded.
        await verifyPayment.mutateAsync(initResult.data.reference);
        Alert.alert("Payment complete", "Thank you! Your payment has been recorded.");
      }
      // type === "cancel" or "dismiss" — person backed out of checkout;
      // the PENDING payment row stays as-is, no error shown, since
      // abandoning checkout isn't a failure state worth alarming over.

      setSelectedCategory(null);
      setAmount("");
    } catch {
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.foreground }]}>Payments</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.mutedForeground }]}>Make a payment</Text>
          {categoriesLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <View style={styles.categoryGrid}>
              {categories?.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => selectCategory(cat)}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: selectedCategory?.id === cat.id ? theme.primary : theme.border,
                      backgroundColor: selectedCategory?.id === cat.id ? theme.primary + "14" : theme.card,
                    },
                  ]}
                >
                  <Text style={[styles.categoryChipText, { color: selectedCategory?.id === cat.id ? theme.primary : theme.foreground }]}>
                    {cat.name}
                  </Text>
                  {cat.defaultAmount && (
                    <Text style={[styles.categoryChipAmount, { color: theme.mutedForeground }]}>{formatMoney(cat.defaultAmount)}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {selectedCategory && (
            <View style={[styles.payBox, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.payLabel, { color: theme.mutedForeground }]}>Amount (GHS)</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.mutedForeground}
                style={[styles.amountInput, { color: theme.foreground, borderColor: theme.border }]}
              />
              <Pressable
                onPress={handlePay}
                disabled={isProcessing}
                style={({ pressed }) => [styles.payButton, { backgroundColor: theme.primary, opacity: pressed || isProcessing ? 0.85 : 1 }]}
              >
                {isProcessing ? (
                  <ActivityIndicator color={theme.primaryForeground} />
                ) : (
                  <Text style={[styles.payButtonText, { color: theme.primaryForeground }]}>Pay with Paystack</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.mutedForeground }]}>Payment history</Text>
          {paymentsLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : !payments?.length ? (
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>No payments yet.</Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {payments.map((p) => (
                <View key={p.id} style={[styles.historyRow, { borderColor: theme.border, backgroundColor: theme.card }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyCategory, { color: theme.foreground }]}>{p.category.name}</Text>
                    <Text style={[styles.historyDate, { color: theme.mutedForeground }]}>{formatDate(p.paidAt ?? p.createdAt)}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={[styles.historyAmount, { color: theme.foreground }]}>{formatMoney(p.amount, p.currency)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: theme[STATUS_COLORS[p.status]] + "1A" }]}>
                      <Text style={[styles.statusText, { color: theme[STATUS_COLORS[p.status]] }]}>{p.status}</Text>
                    </View>
                  </View>
                  {p.receipt && (
                    <Pressable onPress={() => WebBrowser.openBrowserAsync(p.receipt!.pdfUrl)} style={styles.receiptButton}>
                      <Ionicons name="download-outline" size={18} color={theme.primary} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.xl },
  title: { fontSize: 20, fontWeight: "700" },
  section: { gap: spacing.sm },
  sectionLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "600" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryChip: { borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  categoryChipText: { fontSize: 13, fontWeight: "600" },
  categoryChipAmount: { fontSize: 11, marginTop: 2 },
  payBox: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, marginTop: spacing.xs },
  payLabel: { fontSize: 12, fontWeight: "500" },
  amountInput: { height: 44, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: 16, fontVariant: ["tabular-nums"] },
  payButton: { height: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  payButtonText: { fontSize: 14, fontWeight: "700" },
  emptyText: { fontSize: 13 },
  historyRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  historyCategory: { fontSize: 14, fontWeight: "600" },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyAmount: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  statusBadge: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: "700" },
  receiptButton: { padding: spacing.xs },
});
