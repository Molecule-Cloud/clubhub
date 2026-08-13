import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import { spacing } from "@/theme/colors";

interface ComingSoonProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

/**
 * Used for tabs whose navigation shell exists (so the app doesn't crash
 * referencing a missing route) but whose actual screen is a later Phase 4
 * chunk. An honest "not built yet" beats a silently empty or broken tab.
 */
export function ComingSoon({ title, icon, description }: ComingSoonProps) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Ionicons name={icon} size={40} color={theme.mutedForeground} />
        <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
        <Text style={[styles.description, { color: theme.mutedForeground }]}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  title: { fontSize: 17, fontWeight: "700" },
  description: { fontSize: 13, textAlign: "center" },
});
