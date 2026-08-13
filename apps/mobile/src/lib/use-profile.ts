import { useMutation } from "@tanstack/react-query";
import { api } from "./api-client";

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
}

interface ProfileUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

// No queryClient invalidation here — the app doesn't hold user identity in
// a React Query cache, it holds it in AuthContext's local state (see
// lib/auth-context.tsx). After a successful mutation, call the context's
// refreshUser() to pull the updated profile back into that state, which is
// what everywhere reading useAuth().user actually observes.

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch<ProfileUser>("/auth/me", input),
  });
}

export function useUpdateAvatar() {
  return useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) =>
      api.uploadFile<ProfileUser>("/auth/me/avatar", "avatar", file),
  });
}
