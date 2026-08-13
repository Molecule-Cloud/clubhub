import { useState, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCheckIn } from "@/lib/use-events";
import { ApiClientError } from "@/lib/auth-context";
import { useTheme } from "@/theme/useTheme";
import { spacing, radius } from "@/theme/colors";

/**
 * The QR code being scanned here is the one the ADMIN dashboard displays/
 * prints at the venue (GET /events/:id/checkin-qr on the backend), which
 * encodes JSON: {"eventId": "...", "code": "..."}. This screen decodes
 * that payload and submits it to the self-check-in endpoint — it does not
 * generate or display a QR code itself (that's the member's membership
 * card QR, a different code entirely, shown on the Card tab).
 */
export default function ScanScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const checkIn = useCheckIn();
  const [scanned, setScanned] = useState(false);
  const isProcessing = useRef(false);

  async function handleBarcodeScanned(result: BarcodeScanningResult) {
    // Guards against firing multiple times per second while the camera
    // keeps detecting the same still-visible code — CameraView calls this
    // repeatedly, not once, until scanning is explicitly paused.
    if (isProcessing.current) return;
    isProcessing.current = true;
    setScanned(true);

    let payload: { eventId?: string; code?: string };
    try {
      payload = JSON.parse(result.data);
    } catch {
      Alert.alert("Not a ClubHub check-in code", "This doesn't look like a ClubHub event QR code.", [
        { text: "Try again", onPress: () => reset() },
      ]);
      return;
    }

    if (!payload.eventId || !payload.code) {
      Alert.alert("Invalid code", "This QR code is missing required check-in information.", [
        { text: "Try again", onPress: () => reset() },
      ]);
      return;
    }

    try {
      await checkIn.mutateAsync({ eventId: payload.eventId, code: payload.code });
      Alert.alert("Checked in!", "You've successfully checked in to this event.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("Check-in failed", err instanceof ApiClientError ? err.message : "Please try again.", [
        { text: "Try again", onPress: () => reset() },
        { text: "Cancel", style: "cancel", onPress: () => router.back() },
      ]);
    }
  }

  function reset() {
    isProcessing.current = false;
    setScanned(false);
  }

  if (!permission) {
    return <View style={[styles.container, { backgroundColor: "#000" }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="camera-outline" size={40} color={theme.mutedForeground} />
        <Text style={[styles.permissionTitle, { color: theme.foreground }]}>Camera access needed</Text>
        <Text style={[styles.permissionText, { color: theme.mutedForeground }]}>
          ClubHub needs your camera to scan the event check-in code.
        </Text>
        <Pressable onPress={requestPermission} style={[styles.permissionButton, { backgroundColor: theme.primary }]}>
          <Text style={[styles.permissionButtonText, { color: theme.primaryForeground }]}>Grant access</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.cancelLink}>
          <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.instructions}>Point your camera at the event's check-in QR code</Text>
      </View>
      <Pressable onPress={() => router.back()} style={styles.closeButton}>
        <Ionicons name="close" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  frame: { width: 240, height: 240, borderRadius: radius.lg, borderWidth: 3, borderColor: "#fff" },
  instructions: { color: "#fff", fontSize: 14, textAlign: "center", paddingHorizontal: spacing.xl },
  closeButton: { position: "absolute", top: 56, right: spacing.lg, width: 40, height: 40, borderRadius: 20, backgroundColor: "#00000080", alignItems: "center", justifyContent: "center" },
  permissionContainer: { alignItems: "center", justifyContent: "center", gap: spacing.sm, padding: spacing.xl },
  permissionTitle: { fontSize: 17, fontWeight: "700", marginTop: spacing.sm },
  permissionText: { fontSize: 13, textAlign: "center" },
  permissionButton: { marginTop: spacing.md, height: 46, paddingHorizontal: spacing.xl, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  permissionButtonText: { fontSize: 14, fontWeight: "600" },
  cancelLink: { marginTop: spacing.sm, padding: spacing.sm },
});
