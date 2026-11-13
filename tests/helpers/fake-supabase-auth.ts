/**
 * A small stand-in for the Supabase Auth (GoTrue) HTTP API, so the real @supabase/ssr and supabase-js code in the app can be
 * exercised end to end without a Supabase project: password sign-in, token refresh, getUser, sign-out, password
 * recovery (verify), updateUser and the admin user endpoints used by scripts/grant-staff-role.ts.
 * It also exposes test controls: expire tokens, back-date a sign-in, read the "emails" it would have sent.
 * Test use only; nothing here is a security boundary.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";

export type FakeUser = {
  id: string;
  email: string;
  password: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
};

type AccessToken = { userId: string; exp: number };

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

export class FakeSupabaseAuth {
  users = new Map<string, FakeUser>();
  private access = new Map<string, AccessToken>();
  private refresh = new Map<string, { userId: string; revoked: boolean }>();
  private recoveries = new Map<string, string>();
  /** Recovery emails the server "sent": email + token_hash, in order. */
  sentRecoveries: { email: string; tokenHash: string }[] = [];
  requests: string[] = [];
  /** Lifetime of new access tokens. Under ~90s the client treats them as already expiring and refreshes at once. */
  tokenTtlSeconds = 3600;
  private server: Server | null = null;
  url = "";

  addUser(input: { email: string; password: string; confirmed?: boolean; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }): FakeUser {
    const u: FakeUser = {
      id: randomUUID(),
      email: input.email.toLowerCase(),
      password: input.password,
      email_confirmed_at: input.confirmed === false ? null : new Date().toISOString(),
      last_sign_in_at: null,
      user_metadata: input.user_metadata ?? {},
      app_metadata: { provider: "email", providers: ["email"], ...(input.app_metadata ?? {}) },
    };
    this.users.set(u.id, u);
    return u;
  }

  /** Makes every access token of the user expired (the client will try to refresh). */
  expireAccessTokens(userId: string) {
    for (const t of this.access.values()) if (t.userId === userId) t.exp = Math.floor(Date.now() / 1000) - 10;
  }
  /** Revokes the refresh tokens too, as a sign-out elsewhere or a server-side session limit would. */
  revokeSessions(userId: string) {
    for (const [k, t] of this.access) if (t.userId === userId) this.access.delete(k);
    for (const r of this.refresh.values()) if (r.userId === userId) r.revoked = true;
  }
  setLastSignIn(userId: string, when: Date) {
    const u = this.users.get(userId);
    if (u) u.last_sign_in_at = when.toISOString();
  }
  hasLiveAccessToken(token: string) {
    const t = this.access.get(token);
    return !!t && t.exp > Date.now() / 1000;
  }

  private userJson(u: FakeUser) {
    return {
      id: u.id,
      aud: "authenticated",
      role: "authenticated",
      email: u.email,
      email_confirmed_at: u.email_confirmed_at,
      phone: "",
      last_sign_in_at: u.last_sign_in_at,
      app_metadata: u.app_metadata,
      user_metadata: u.user_metadata,
      identities: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: new Date().toISOString(),
    };
  }

  private session(u: FakeUser) {
    const ttl = this.tokenTtlSeconds;
    const exp = Math.floor(Date.now() / 1000) + ttl;
    const accessToken = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: u.id, aud: "authenticated", role: "authenticated", email: u.email, exp, iat: exp - ttl })}.${randomBytes(16).toString("base64url")}`;
    const refreshToken = randomBytes(12).toString("base64url");
    this.access.set(accessToken, { userId: u.id, exp });
    this.refresh.set(refreshToken, { userId: u.id, revoked: false });
    return { access_token: accessToken, token_type: "bearer", expires_in: ttl, expires_at: exp, refresh_token: refreshToken, user: this.userJson(u) };
  }

  private userFor(req: IncomingMessage): FakeUser | null {
    const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
    const t = this.access.get(token);
    if (!t || t.exp <= Date.now() / 1000) return null;
    return this.users.get(t.userId) ?? null;
  }

  private async handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://x");
    const path = url.pathname.replace(/^\/auth\/v1/, "");
    this.requests.push(`${req.method} ${path}`);
    const raw = await new Promise<string>((resolve) => {
      let s = "";
      req.on("data", (d) => (s += d)).on("end", () => resolve(s));
    });
    const body: { email?: string; password?: string; type?: string; token_hash?: string; refresh_token?: string; email_confirm?: boolean } = raw ? JSON.parse(raw) : {};
    const send = (status: number, data?: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(data === undefined ? "" : JSON.stringify(data));
    };
    const err = (status: number, code: string, msg: string) => send(status, { code: status, error_code: code, msg });

    if (req.method === "POST" && path === "/token") {
      const grant = url.searchParams.get("grant_type");
      if (grant === "password") {
        const u = [...this.users.values()].find((x) => x.email === String(body.email ?? "").toLowerCase());
        if (!u || u.password !== body.password) return err(400, "invalid_credentials", "Invalid login credentials");
        if (!u.email_confirmed_at) return err(400, "email_not_confirmed", "Email not confirmed");
        u.last_sign_in_at = new Date().toISOString();
        return send(200, this.session(u));
      }
      if (grant === "refresh_token") {
        const r = this.refresh.get(String(body.refresh_token));
        const u = r && !r.revoked ? this.users.get(r.userId) : undefined;
        if (!r || !u) return err(400, "refresh_token_not_found", "Invalid Refresh Token: Refresh Token Not Found");
        r.revoked = true;
        return send(200, this.session(u));
      }
    }
    if (req.method === "GET" && path === "/user") {
      const u = this.userFor(req);
      return u ? send(200, this.userJson(u)) : err(401, "bad_jwt", "invalid JWT: unable to parse or verify signature, token is expired");
    }
    if (req.method === "PUT" && path === "/user") {
      const u = this.userFor(req);
      if (!u) return err(401, "bad_jwt", "invalid JWT");
      if (typeof body.password === "string") {
        if (body.password === u.password) return err(422, "same_password", "New password should be different from the old password.");
        u.password = body.password;
      }
      return send(200, this.userJson(u));
    }
    if (req.method === "POST" && path === "/logout") {
      const u = this.userFor(req);
      if (u) this.revokeSessions(u.id);
      return send(204);
    }
    if (req.method === "POST" && path === "/recover") {
      const u = [...this.users.values()].find((x) => x.email === String(body.email ?? "").toLowerCase());
      if (u) {
        const tokenHash = `th_${randomBytes(16).toString("hex")}`;
        this.recoveries.set(tokenHash, u.id);
        this.sentRecoveries.push({ email: u.email, tokenHash });
      }
      return send(200, {});
    }
    if (req.method === "POST" && path === "/verify") {
      const id = this.recoveries.get(String(body.token_hash));
      const u = id ? this.users.get(id) : undefined;
      if (body.type !== "recovery" || !u) return err(403, "otp_expired", "Email link is invalid or has expired");
      this.recoveries.delete(String(body.token_hash));
      u.last_sign_in_at = new Date().toISOString();
      return send(200, this.session(u));
    }
    // Admin API (service key), used by scripts/grant-staff-role.ts.
    if (path === "/admin/users" && req.method === "GET") return send(200, { users: [...this.users.values()].map((u) => this.userJson(u)), aud: "authenticated" });
    if (path === "/admin/users" && req.method === "POST") {
      const u = this.addUser({ email: String(body.email ?? ""), password: String(body.password ?? ""), confirmed: !!body.email_confirm });
      return send(200, this.userJson(u));
    }
    const m = path.match(/^\/admin\/users\/([0-9a-f-]+)$/);
    if (m && req.method === "GET") {
      const u = this.users.get(m[1]);
      return u ? send(200, this.userJson(u)) : err(404, "user_not_found", "User not found");
    }
    if (m && req.method === "PUT") {
      const u = this.users.get(m[1]);
      if (!u) return err(404, "user_not_found", "User not found");
      if (typeof body.password === "string") u.password = body.password;
      if (body.email_confirm) u.email_confirmed_at ??= new Date().toISOString();
      return send(200, this.userJson(u));
    }
    if (m && req.method === "DELETE") {
      this.users.delete(m[1]);
      this.revokeSessions(m[1]);
      return send(200, {});
    }
    return err(404, "not_found", `No route for ${req.method} ${path}`);
  }

  async start(port = 0): Promise<string> {
    this.server = createServer((req, res) => {
      this.handle(req, res).catch((e) => {
        res.writeHead(500);
        res.end(String(e));
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(port, "127.0.0.1", resolve));
    const addr = this.server.address();
    this.url = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : port}`;
    return this.url;
  }

  async stop() {
    await new Promise<void>((resolve) => (this.server ? this.server.close(() => resolve()) : resolve()));
  }
}
