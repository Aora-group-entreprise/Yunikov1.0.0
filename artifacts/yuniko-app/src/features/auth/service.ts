import { requireSupabase } from "../../lib/supabase";
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from "./schemas";

export async function signIn(input: SignInInput) {
  const data = signInSchema.parse(input);
  const client = requireSupabase();
  const result = await client.auth.signInWithPassword({ email: data.email, password: data.password });
  if (!result.error && result.data.user) {
    void client.rpc("record_login_event", {
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      p_country: null,
      p_is_new_device: false,
    });
  }
  return result;
}

export async function registerUser(input: SignUpInput) {
  const data = signUpSchema.parse(input);
  return requireSupabase().auth.signUp({
    email: data.email,
    password: data.password,
    options: { data: { username: data.username, display_name: data.displayName } },
  });
}

export async function signOut() {
  return requireSupabase().auth.signOut();
}

export async function getSession() {
  return requireSupabase().auth.getSession();
}
