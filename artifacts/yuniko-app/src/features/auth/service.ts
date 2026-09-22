import { supabase, requireSupabase } from "../../lib/supabase";
import { signInSchema, signUpSchema, type SignInInput, type SignUpInput } from "./schemas";

const AUTH_ALIAS_DOMAIN = "auth.yuniko.local";
const API_BASE_URL = (import.meta.env.VITE_YUNIKO_API_URL || "https://yuniko-api.lafatriniainaallane.workers.dev").replace(/\/+$/, "");
const AUTH_TOKEN_KEY = "yuniko-auth-token";
const AUTH_USER_KEY = "yuniko-auth-user";

type ApiUser = { id: string; username: string; display_name: string };
type ApiSession = { access_token: string; token_type: "bearer"; expires_at: string; user: ApiUser };
type ApiAuthPayload = { user: ApiUser; session: ApiSession | null };
type AuthError = { message: string; status?: number };

function authEmail(username: string) {
  return username.trim().toLowerCase() + "@" + AUTH_ALIAS_DOMAIN;
}

function localStorageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function clearApiSession() {
  if (!localStorageAvailable()) return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

function saveApiSession(payload: ApiAuthPayload) {
  if (!localStorageAvailable() || !payload.session) return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, payload.session.access_token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(payload.user));
}

function apiError(error: unknown, status?: number): AuthError {
  return { message: error instanceof Error ? error.message : "Authentication request failed.", status };
}

async function apiRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (localStorageAvailable()) {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) headers.set("authorization", "Bearer " + token);
  }

  const response = await fetch(API_BASE_URL + path, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload?.error || "Authentication request failed (" + response.status + ")."), { status: response.status });
  }
  return payload;
}

export async function signIn(input: SignInInput) {
  const data = signInSchema.parse(input);
  if (supabase) {
    const client = requireSupabase();
    const result = await client.auth.signInWithPassword({ email: authEmail(data.username), password: data.password });
    if (!result.error && result.data.user) {
      void client.rpc("record_login_event", {
        p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        p_country: null,
        p_is_new_device: false,
      });
    }
    return result;
  }

  try {
    const payload = await apiRequest("/api/auth/signin", { method: "POST", body: JSON.stringify(data) }) as ApiAuthPayload;
    saveApiSession(payload);
    return { data: { user: payload.user, session: payload.session }, error: null };
  } catch (error: any) {
    return { data: { user: null, session: null }, error: apiError(error, error?.status) };
  }
}

export async function registerUser(input: SignUpInput) {
  const data = signUpSchema.parse(input);
  if (supabase) {
    return requireSupabase().auth.signUp({
      email: authEmail(data.username),
      password: data.password,
      options: { data: { username: data.username, display_name: data.displayName } },
    });
  }

  try {
    const payload = await apiRequest("/api/auth/signup", { method: "POST", body: JSON.stringify(data) }) as ApiAuthPayload;
    saveApiSession(payload);
    return { data: { user: payload.user, session: payload.session }, error: null };
  } catch (error: any) {
    return { data: { user: null, session: null }, error: apiError(error, error?.status) };
  }
}

export async function signOut() {
  if (supabase) return requireSupabase().auth.signOut();
  try { await apiRequest("/api/auth/signout", { method: "POST" }); } finally { clearApiSession(); }
  return { error: null };
}

export async function getSession() {
  if (supabase) return requireSupabase().auth.getSession();
  if (!localStorageAvailable() || !window.localStorage.getItem(AUTH_TOKEN_KEY)) {
    return { data: { session: null }, error: null };
  }
  try {
    const payload = await apiRequest("/api/auth/session") as { user: ApiUser };
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY) as string;
    const storedUser = payload.user;
    return {
      data: { session: { access_token: token, token_type: "bearer", user: storedUser }, user: storedUser },
      error: null,
    };
  } catch (error: any) {
    clearApiSession();
    return { data: { session: null }, error: apiError(error, error?.status) };
  }
}
