import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Router, type IRouter, type Request } from "express";
import { pool } from "@workspace/db";

const scrypt = promisify(scryptCallback);
const router: IRouter = Router();
const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;
const PASSWORD_MIN_LENGTH = 12;
const SESSION_TTL_DAYS = 30;

let schemaPromise: Promise<void> | undefined;

function ensureAuthSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = pool.query(`
      create table if not exists public.yuniko_auth_accounts (
        id text primary key,
        username text not null,
        username_normalized text not null unique,
        display_name text not null,
        password_hash text not null,
        created_at timestamptz not null default now()
      );
      create table if not exists public.yuniko_auth_sessions (
        token_hash text primary key,
        user_id text not null references public.yuniko_auth_accounts(id) on delete cascade,
        expires_at timestamptz not null,
        created_at timestamptz not null default now()
      );
      create index if not exists yuniko_auth_sessions_user_idx
        on public.yuniko_auth_sessions(user_id);
      create index if not exists yuniko_auth_sessions_expiry_idx
        on public.yuniko_auth_sessions(expires_at);
    `).then(() => undefined).catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  return schemaPromise;
}

function normalizeUsername(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isStrongPassword(value: string): boolean {
  return value.length >= PASSWORD_MIN_LENGTH && value.length <= 128 &&
    /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
}

function publicUser(row: { id: string; username: string; display_name: string }) {
  return { id: row.id, username: row.username, display_name: row.display_name };
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [, salt, encodedKey] = encoded.split("$");
  if (!salt || !encodedKey) return false;
  const expected = Buffer.from(encodedKey, "hex");
  const actual = await scrypt(password, salt, expected.length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function bearerToken(req: Request): string | null {
  const header = req.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    "insert into public.yuniko_auth_sessions(token_hash, user_id, expires_at) values ($1, $2, $3)",
    [hashToken(token), userId, expiresAt],
  );
  return { access_token: token, token_type: "bearer", expires_at: expiresAt.toISOString() };
}

async function sessionUser(req: Request) {
  const token = bearerToken(req);
  if (!token) return null;
  const result = await pool.query(
    `select a.id, a.username, a.display_name
       from public.yuniko_auth_sessions s
       join public.yuniko_auth_accounts a on a.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  return result.rows[0] ?? null;
}

router.post("/signup", async (req, res) => {
  try {
    await ensureAuthSchema();
    const username = normalizeUsername(req.body?.username);
    const displayName = typeof req.body?.displayName === "string" ? req.body.displayName.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (username.length < 3 || username.length > 30 || !USERNAME_PATTERN.test(username)) {
      res.status(400).json({ error: "Username must contain 3-30 letters, numbers, underscores or dots." });
      return;
    }
    if (!displayName || displayName.length > 80) {
      res.status(400).json({ error: "Display name is required and must be at most 80 characters." });
      return;
    }
    if (!isStrongPassword(password)) {
      res.status(400).json({ error: "Password must be 12-128 characters and include lower, upper, number and symbol." });
      return;
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `insert into public.yuniko_auth_accounts(id, username, username_normalized, display_name, password_hash)
       values ($1, $2, $3, $4, $5)
       returning id, username, display_name`,
      [id, username, username, displayName, passwordHash],
    );
    const user = publicUser(result.rows[0]);
    const session = await createSession(user.id);
    res.status(201).json({ user, session });
  } catch (error: any) {
    if (error?.code === "23505") {
      res.status(409).json({ error: "Username already exists." });
      return;
    }
    console.error("Yuniko signup failed", error);
    res.status(500).json({ error: "Unable to create the account." });
  }
});

router.post("/signin", async (req, res) => {
  try {
    await ensureAuthSchema();
    const username = normalizeUsername(req.body?.username);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }

    const result = await pool.query(
      `select id, username, display_name, password_hash
         from public.yuniko_auth_accounts
        where username_normalized = $1`,
      [username],
    );
    const account = result.rows[0];
    if (!account || !(await verifyPassword(password, account.password_hash))) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const user = publicUser(account);
    const session = await createSession(user.id);
    res.json({ user, session });
  } catch (error) {
    console.error("Yuniko signin failed", error);
    res.status(500).json({ error: "Unable to sign in." });
  }
});

router.get("/session", async (req, res) => {
  try {
    await ensureAuthSchema();
    const user = await sessionUser(req);
    if (!user) {
      res.status(401).json({ error: "No active session." });
      return;
    }
    res.json({ user });
  } catch (error) {
    console.error("Yuniko session lookup failed", error);
    res.status(500).json({ error: "Unable to read the session." });
  }
});

router.post("/signout", async (req, res) => {
  try {
    await ensureAuthSchema();
    const token = bearerToken(req);
    if (token) await pool.query("delete from public.yuniko_auth_sessions where token_hash = $1", [hashToken(token)]);
    res.status(204).send();
  } catch (error) {
    console.error("Yuniko signout failed", error);
    res.status(500).json({ error: "Unable to sign out." });
  }
});

export default router;
