import { Stack } from "expo-router";

export default function EventsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[eventId]" />
      <Stack.Screen name="scan" options={{ presentation: "modal" }} />
    </Stack>
  );
}
