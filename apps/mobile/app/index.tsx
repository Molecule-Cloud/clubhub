import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/theme/useTheme";

export default function Index() {
  const { user, isLoading } = useAuth();
  const theme = useTheme();

  // Waits for the silent-refresh attempt in AuthProvider to resolve before
  // deciding where to send the person — redirecting to /login and then
  // immediately bouncing to /(tabs)/card a moment later (once the stored
  // refresh token turns out to be valid) would be a visible, jarring flash.
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)/card" : "/login"} />;
}
