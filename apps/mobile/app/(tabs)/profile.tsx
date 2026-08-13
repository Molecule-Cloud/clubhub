import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Image, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, ApiClientError } from "@/lib/auth-context";
import { useUpdateProfile, useUpdateAvatar } from "@/lib/use-profile";
import { useTheme } from "@/theme/useTheme";
import { spacing, radius } from "@/theme/colors";
import { OrgAvatar } from "@/components/OrgAvatar";

export default function ProfileScreen() {
  const { user, organization, logout, refreshUser } = useAuth();
  const theme = useTheme();
  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateAvatar();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);

  function startEditing() {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setPhone(user?.phone ?? "");
    setIsEditing(true);
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Missing info", "First and last name can't be empty.");
      return;
    }
    try {
      await updateProfile.mutateAsync({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || null });
      await refreshUser();
      setIsEditing(false);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof ApiClientError ? err.message : "Please try again.");
    }
  }

  async function handleChangeAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Please allow photo library access to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      // Derives a filename/mime type from the picked asset — ImagePicker
      // doesn't always provide a clean filename, so this falls back to a
      // generic one with an extension guessed from the asset's own type.
      const extension = asset.uri.split(".").pop() ?? "jpg";
      await updateAvatar.mutateAsync({
        uri: asset.uri,
        name: `avatar.${extension}`,
        type: asset.mimeType ?? `image/${extension}`,
      });
      await refreshUser();
    } catch (err) {
      Alert.alert("Couldn't update photo", err instanceof ApiClientError ? err.message : "Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.foreground }]}>Profile</Text>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Pressable onPress={handleChangeAvatar} disabled={avatarUploading} style={styles.avatarWrapper}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <OrgAvatar seed={user?.id ?? "member"} size={72} />
            )}
            <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary }]}>
              {avatarUploading ? (
                <ActivityIndicator size="small" color={theme.primaryForeground} />
              ) : (
                <Ionicons name="camera" size={12} color={theme.primaryForeground} />
              )}
            </View>
          </Pressable>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={theme.mutedForeground}
                style={[styles.input, { borderColor: theme.border, color: theme.foreground, backgroundColor: theme.background }]}
              />
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={theme.mutedForeground}
                style={[styles.input, { borderColor: theme.border, color: theme.foreground, backgroundColor: theme.background }]}
              />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone (optional)"
                keyboardType="phone-pad"
                placeholderTextColor={theme.mutedForeground}
                style={[styles.input, { borderColor: theme.border, color: theme.foreground, backgroundColor: theme.background }]}
              />
              <View style={styles.editActions}>
                <Pressable onPress={() => setIsEditing(false)} style={[styles.secondaryButton, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.foreground, fontSize: 14, fontWeight: "600" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={updateProfile.isPending}
                  style={[styles.primaryButtonSmall, { backgroundColor: theme.primary }]}
                >
                  {updateProfile.isPending ? (
                    <ActivityIndicator size="small" color={theme.primaryForeground} />
                  ) : (
                    <Text style={{ color: theme.primaryForeground, fontSize: 14, fontWeight: "700" }}>Save</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={[styles.name, { color: theme.foreground }]}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={[styles.email, { color: theme.mutedForeground }]}>{user?.email}</Text>
              {user?.phone && <Text style={[styles.email, { color: theme.mutedForeground }]}>{user.phone}</Text>}
              <Text style={[styles.org, { color: theme.mutedForeground }]}>{organization?.name}</Text>

              <Pressable onPress={startEditing} style={[styles.editButton, { borderColor: theme.border }]}>
                <Ionicons name="create-outline" size={16} color={theme.foreground} />
                <Text style={{ color: theme.foreground, fontSize: 13, fontWeight: "600" }}>Edit profile</Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable
          onPress={() => logout()}
          style={({ pressed }) => [styles.logoutButton, { borderColor: theme.destructive, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.destructive} />
          <Text style={[styles.logoutText, { color: theme.destructive }]}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: 20, fontWeight: "700" },
  card: { alignItems: "center", gap: spacing.xs, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1 },
  avatarWrapper: { position: "relative" },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarEditBadge: { position: "absolute", bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  name: { fontSize: 18, fontWeight: "700", marginTop: spacing.sm },
  email: { fontSize: 13 },
  org: { fontSize: 13, marginTop: spacing.xs },
  editButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  editForm: { width: "100%", gap: spacing.sm, marginTop: spacing.sm },
  input: { height: 44, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: 14 },
  editActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  secondaryButton: { flex: 1, height: 42, borderRadius: radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  primaryButtonSmall: { flex: 1, height: 42, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    height: 46,
    marginTop: "auto",
  },
  logoutText: { fontSize: 15, fontWeight: "600" },
});
