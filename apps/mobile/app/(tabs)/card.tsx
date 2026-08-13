import { View, Text, Image, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMembershipCard } from "@/lib/use-membership-card";
import { useTheme } from "@/theme/useTheme";
import { spacing, radius } from "@/theme/colors";
import { OrgAvatar } from "@/components/OrgAvatar";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GH", { year: "numeric", month: "long", day: "numeric" });
}

export default function MembershipCardScreen() {
  const theme = useTheme();
  const { data: card, isLoading } = useMembershipCard();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["membership-card"] });
    setRefreshing(false);
  }

  // The card's own brand color (set per-organization in the admin Settings
  // page) takes priority over the default ClubHub blue — same fallback
  // pattern used for generated PDF receipts on the backend, so a club's
  // branding is consistent everywhere it shows up.
  const brandColor = card?.primaryColor || theme.primary;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
      >
        <Text style={[styles.screenTitle, { color: theme.foreground }]}>My Membership Card</Text>

        {isLoading || !card ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.foreground }]}>
            <LinearGradient
              colors={[brandColor, shadeColor(brandColor, -20)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeader}
            >
              <View style={styles.cardHeaderRow}>
                {card.organizationLogoUrl ? (
                  <Image source={{ uri: card.organizationLogoUrl }} style={styles.orgLogo} />
                ) : (
                  <View style={styles.orgLogoFallback}>
                    <OrgAvatar seed={card.organizationName} size={32} />
                  </View>
                )}
                <Text style={styles.orgName} numberOfLines={1}>
                  {card.organizationName}
                </Text>
              </View>
              <Text style={styles.cardLabel}>Membership Card</Text>
            </LinearGradient>

            <View style={styles.cardBody}>
              <Text style={[styles.memberName, { color: theme.foreground }]}>{card.memberName}</Text>
              <Text style={[styles.memberRole, { color: theme.mutedForeground }]}>{card.role}</Text>

              <View style={styles.detailsRow}>
                <View>
                  <Text style={[styles.detailLabel, { color: theme.mutedForeground }]}>Membership No.</Text>
                  <Text style={[styles.detailValue, { color: theme.foreground }]}>{card.membershipNumber}</Text>
                </View>
                <View>
                  <Text style={[styles.detailLabel, { color: theme.mutedForeground }]}>Member since</Text>
                  <Text style={[styles.detailValue, { color: theme.foreground }]}>{formatDate(card.joinedAt)}</Text>
                </View>
              </View>

              <View style={styles.qrContainer}>
                <Image source={{ uri: card.qrCodeDataUrl }} style={styles.qrCode} resizeMode="contain" />
                <Text style={[styles.qrHint, { color: theme.mutedForeground }]}>
                  Show this at check-in to verify your membership
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Darkens a hex color by a percentage — used to build the card header's
 * gradient from the org's single stored brand color, without needing a
 * second color value in the database. */
function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { padding: spacing.lg, gap: spacing.lg },
  screenTitle: { fontSize: 20, fontWeight: "700" },
  loadingBox: { height: 300, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardHeader: { padding: spacing.lg, gap: spacing.xs },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  orgLogo: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#fff" },
  orgLogoFallback: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  orgName: { color: "#fff", fontSize: 15, fontWeight: "600", flexShrink: 1 },
  cardLabel: { color: "#ffffffcc", fontSize: 12 },
  cardBody: { padding: spacing.lg, gap: spacing.md },
  memberName: { fontSize: 20, fontWeight: "700" },
  memberRole: { fontSize: 14, marginTop: -8 },
  detailsRow: { flexDirection: "row", justifyContent: "space-between" },
  detailLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontWeight: "600", marginTop: 2, fontVariant: ["tabular-nums"] },
  qrContainer: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.md },
  qrCode: { width: 180, height: 180 },
  qrHint: { fontSize: 12, textAlign: "center" },
});
