"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loginSchema, registerSchema, forgotPasswordSchema } from "./schemas";
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
} from "./schemas";

export async function login(data: LoginInput) {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function register(data: RegisterInput) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
      },
    },
  });

  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(data: ForgotPasswordInput) {
  const parsed = forgotPasswordSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    },
  );

  if (error) return { error: error.message };
  return { success: "Check your email for a reset link" };
}

// Helper: get current user profile (for Server Components)
export async function getCurrentUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}
