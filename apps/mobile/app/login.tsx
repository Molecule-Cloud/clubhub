import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth, ApiClientError } from "@/lib/auth-context";
import { useTheme } from "@/theme/useTheme";
import { OrgAvatar } from "@/components/OrgAvatar";
import { spacing, radius } from "@/theme/colors";

export default function LoginScreen() {
  const { login } = useAuth();
  const theme = useTheme();
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    console.log("BUTTON PRESSED")
    if (!organizationSlug || !email || !password) {
      setError("Please fill in every field.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password, organizationSlug);
    } catch (err) {
      console.log("LOGIN ERROR:", err, "| isApiClientError:", err instanceof ApiClientError, "| name:", (err as any)?.name, "| message:", (err as any)?.message);
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[theme.primary + "33", "transparent"]}
        style={styles.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <View style={styles.content}>
            <View style={styles.header}>
              <OrgAvatar seed="clubhub" size={52} />
              <Text style={[styles.title, { color: theme.foreground }]}>ClubHub</Text>
              <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
                One Platform. Every Club. Unlimited Possibilities.
              </Text>
            </View>

            <View style={styles.form}>
              <Field label="Organization" value={organizationSlug} onChangeText={setOrganizationSlug} placeholder="rotary-accra" autoCapitalize="none" theme={theme} />
              <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" theme={theme} />
              <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry theme={theme} />

              {error && (
                <View style={[styles.errorBox, { backgroundColor: theme.destructive + "1A" }]}>
                  <Text style={{ color: theme.destructive, fontSize: 13 }}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleSubmit}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: theme.primary, opacity: pressed || isSubmitting ? 0.85 : 1 },
                ]}
              >
                {isSubmitting ? <ActivityIndicator color={theme.primaryForeground} /> : <Text style={[styles.buttonText, { color: theme.primaryForeground }]}>Sign in</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
  theme: ReturnType<typeof useTheme>;
}

function Field({ label, theme, ...inputProps }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={theme.mutedForeground}
        style={[styles.input, { borderColor: theme.border, color: theme.foreground, backgroundColor: theme.card }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { position: "absolute", top: 0, left: 0, right: 0, height: 320 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: spacing.lg },
  header: { alignItems: "center", gap: spacing.sm, marginBottom: spacing.xl },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, textAlign: "center" },
  form: { gap: spacing.md },
  fieldGroup: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: "500" },
  input: { height: 46, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 15 },
  errorBox: { borderRadius: radius.sm, padding: spacing.sm },
  button: { height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginTop: spacing.xs },
  buttonText: { fontSize: 15, fontWeight: "600" },
});
