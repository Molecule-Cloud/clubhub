import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEvents, type ClubEvent } from "@/lib/use-events";
import { useTheme } from "@/theme/useTheme";
import { spacing, radius } from "@/theme/colors";

function formatEventDate(iso: string) {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString("en-GH", { day: "2-digit" }),
    month: date.toLocaleDateString("en-GH", { month: "short" }).toUpperCase(),
    time: date.toLocaleTimeString("en-GH", { hour: "numeric", minute: "2-digit" }),
  };
}

function EventCard({ event, theme }: { event: ClubEvent; theme: ReturnType<typeof useTheme> }) {
  const { day, month, time } = formatEventDate(event.startsAt);
  const isRegistered = event.myRegistrationStatus === "REGISTERED" || event.myRegistrationStatus === "CONFIRMED" || event.myRegistrationStatus === "ATTENDED";

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/events/${event.id}`)}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.card, borderColor: theme.border, opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={[styles.dateBlock, { backgroundColor: theme.primary + "14" }]}>
        <Text style={[styles.dateDay, { color: theme.primary }]}>{day}</Text>
        <Text style={[styles.dateMonth, { color: theme.primary }]}>{month}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: theme.foreground }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.cardMeta, { color: theme.mutedForeground }]}>
          {time}
          {event.location ? ` · ${event.location}` : ""}
        </Text>
        {isRegistered && (
          <View style={[styles.badge, { backgroundColor: theme.nodeEmerald + "1A" }]}>
            <Ionicons name="checkmark-circle" size={12} color={theme.nodeEmerald} />
            <Text style={[styles.badgeText, { color: theme.nodeEmerald }]}>You're registered</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.mutedForeground} />
    </Pressable>
  );
}

export default function EventsListScreen() {
  const theme = useTheme();
  const { data: events, isLoading, refetch, isRefetching } = useEvents();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.foreground }]}>Events</Text>
        <Pressable onPress={() => router.push("/(tabs)/events/scan")} style={[styles.scanButton, { backgroundColor: theme.primary }]}>
          <Ionicons name="qr-code-outline" size={16} color={theme.primaryForeground} />
          <Text style={[styles.scanButtonText, { color: theme.primaryForeground }]}>Check in</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => <EventCard event={item} theme={theme} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={32} color={theme.mutedForeground} />
              <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>No upcoming events.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { fontSize: 20, fontWeight: "700" },
  scanButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  scanButtonText: { fontSize: 13, fontWeight: "600" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  dateBlock: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  dateDay: { fontSize: 18, fontWeight: "700", lineHeight: 20 },
  dateMonth: { fontSize: 11, fontWeight: "600" },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardMeta: { fontSize: 12 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "700" },
  emptyBox: { alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingTop: spacing.xl * 2 },
  emptyText: { fontSize: 13 },
});
