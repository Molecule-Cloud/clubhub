import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEvent, useRegisterForEvent, useCancelRegistration } from "@/lib/use-events";
import { ApiClientError } from "@/lib/auth-context";
import { useTheme } from "@/theme/useTheme";
import { spacing, radius } from "@/theme/colors";

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GH", { hour: "numeric", minute: "2-digit" });
}

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const theme = useTheme();
  const { data: event, isLoading } = useEvent(eventId);
  const registerForEvent = useRegisterForEvent();
  const cancelRegistration = useCancelRegistration();

  const isRegistered =
    event?.myRegistrationStatus === "REGISTERED" || event?.myRegistrationStatus === "CONFIRMED" || event?.myRegistrationStatus === "ATTENDED";
  const isFull = event?.spotsRemaining === 0 && !isRegistered;

  async function handleRegister() {
    if (!eventId) return;
    try {
      await registerForEvent.mutateAsync(eventId);
    } catch (err) {
      Alert.alert("Couldn't register", err instanceof ApiClientError ? err.message : "Please try again.");
    }
  }

  async function handleCancel() {
    if (!eventId) return;
    Alert.alert("Cancel registration?", "You can register again later if you change your mind.", [
      { text: "Keep my spot", style: "cancel" },
      {
        text: "Cancel registration",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelRegistration.mutateAsync(eventId);
          } catch (err) {
            Alert.alert("Couldn't cancel", err instanceof ApiClientError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  }

  if (isLoading || !event) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={theme.foreground} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: theme.foreground }]}>{event.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={theme.mutedForeground} />
          <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
            {formatFullDate(event.startsAt)} · {formatTime(event.startsAt)}
          </Text>
        </View>
        {event.location && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={theme.mutedForeground} />
            <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{event.location}</Text>
          </View>
        )}
        {event.capacity && (
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={16} color={theme.mutedForeground} />
            <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
              {event.spotsRemaining} of {event.capacity} spots remaining
            </Text>
          </View>
        )}

        {event.description && <Text style={[styles.description, { color: theme.foreground }]}>{event.description}</Text>}

        <View style={styles.actions}>
          {isRegistered ? (
            <>
              <View style={[styles.registeredBanner, { backgroundColor: theme.nodeEmerald + "14" }]}>
                <Ionicons name="checkmark-circle" size={18} color={theme.nodeEmerald} />
                <Text style={[styles.registeredText, { color: theme.nodeEmerald }]}>You're registered for this event</Text>
              </View>
              <Pressable
                onPress={handleCancel}
                disabled={cancelRegistration.isPending}
                style={({ pressed }) => [styles.secondaryButton, { borderColor: theme.destructive, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.destructive }]}>
                  {cancelRegistration.isPending ? "Cancelling…" : "Cancel my registration"}
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={handleRegister}
              disabled={isFull || registerForEvent.isPending}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: isFull ? theme.muted : theme.primary, opacity: pressed || registerForEvent.isPending ? 0.85 : 1 },
              ]}
            >
              {registerForEvent.isPending ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={[styles.primaryButtonText, { color: isFull ? theme.mutedForeground : theme.primaryForeground }]}>
                  {isFull ? "Event full" : "Register"}
                </Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  backButton: { padding: spacing.xs, alignSelf: "flex-start" },
  loadingBox: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "700", marginBottom: spacing.xs },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  metaText: { fontSize: 13 },
  description: { fontSize: 14, lineHeight: 21, marginTop: spacing.md },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  registeredBanner: { flexDirection: "row", alignItems: "center", gap: spacing.xs, padding: spacing.md, borderRadius: radius.md },
  registeredText: { fontSize: 13, fontWeight: "600" },
  primaryButton: { height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { fontSize: 15, fontWeight: "700" },
  secondaryButton: { height: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  secondaryButtonText: { fontSize: 14, fontWeight: "600" },
});
