"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { initialSettings } from "@/rules/initial-settings";
import { createSessionClient } from "@/server/supabase";

export type SignInState = { error: string; email: string } | null;

const UNIQUE_VIOLATION = "23505";

const signInForm = z.object({
  email: z.string().trim(),
  password: z.string(),
  time_zone: z.string(),
  locale: z.string(),
});

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const form = signInForm.safeParse(Object.fromEntries(formData));
  if (!form.success) {
    return { error: "Enter your email and password.", email: "" };
  }
  const { email, password, time_zone, locale } = form.data;

  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "Wrong email or password.", email };
  }

  const { data: settings, error: readError } = await supabase.from("settings").select("owner_id").maybeSingle();
  if (readError) {
    throw readError;
  }
  if (!settings) {
    const { error: claimError } = await supabase
      .from("settings")
      .insert({ owner_id: data.user.id, ...initialSettings(time_zone, locale) });
    if (claimError?.code === UNIQUE_VIOLATION) {
      await supabase.auth.signOut();
      return { error: "This account doesn't own this app.", email };
    }
    if (claimError) {
      throw claimError;
    }
  }
  redirect("/");
}
