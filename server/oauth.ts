import type { Express, Request } from "express";
import { randomBytes } from "crypto";

// Sign-in for Google Drive and OneDrive using the standard OAuth 2.0
// "authorization code" flow. Tokens are kept in the server-side session
// and refreshed automatically when they are about to expire.

export type Provider = "google" | "microsoft";

interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // ms since epoch
}

declare module "express-session" {
  interface SessionData {
    tokens?: Partial<Record<Provider, StoredToken>>;
    oauthState?: { value: string; provider: Provider };
  }
}

interface ProviderConfig {
  authUrl: string;
  tokenUrl: string;
  scope: string;
  clientId: string | undefined;
  clientSecret: string | undefined;
  extraAuthParams: Record<string, string>;
  // Name the front end uses for this provider
  appName: "gdrive" | "onedrive";
}

function config(provider: Provider): ProviderConfig {
  if (provider === "google") {
    return {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/drive",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // offline + consent makes Google return a refresh token
      extraAuthParams: { access_type: "offline", prompt: "consent" },
      appName: "gdrive",
    };
  }
  const tenant = process.env.MICROSOFT_TENANT || "common";
  return {
    authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    scope: "offline_access Files.ReadWrite User.Read",
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    extraAuthParams: { prompt: "select_account" },
    appName: "onedrive",
  };
}

function appUrl(): string {
  return (process.env.APP_URL || `http://localhost:${process.env.PORT || "5000"}`).replace(/\/$/, "");
}

function redirectUri(provider: Provider): string {
  return `${appUrl()}/auth/${provider}/callback`;
}

/** An error the API routes turn into a 401 so the app shows its sign-in screen. */
export class NotSignedInError extends Error {
  statusCode = 401;
  constructor(provider: Provider) {
    super(`Not signed in to ${provider === "google" ? "Google Drive" : "OneDrive"}`);
  }
}

async function requestToken(provider: Provider, params: Record<string, string>): Promise<StoredToken> {
  const cfg = config(provider);
  const body = new URLSearchParams({
    client_id: cfg.clientId!,
    client_secret: cfg.clientSecret!,
    ...params,
  });
  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`${provider} token request failed: ${data.error_description || data.error || res.status}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
}

/**
 * Returns a valid access token for the signed-in user, refreshing it if it
 * expires within the next minute. Throws NotSignedInError if there is none.
 */
export async function getAccessToken(req: Request, provider: Provider): Promise<string> {
  const token = req.session.tokens?.[provider];
  if (!token) throw new NotSignedInError(provider);

  if (token.expiresAt - Date.now() > 60_000) return token.accessToken;

  if (!token.refreshToken) {
    delete req.session.tokens![provider];
    throw new NotSignedInError(provider);
  }

  try {
    const refreshed = await requestToken(provider, {
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      scope: config(provider).scope,
    });
    // Google doesn't always send a new refresh token; keep the old one
    refreshed.refreshToken = refreshed.refreshToken || token.refreshToken;
    req.session.tokens![provider] = refreshed;
    return refreshed.accessToken;
  } catch (error) {
    console.error(`Refreshing ${provider} sign-in failed:`, error);
    delete req.session.tokens![provider];
    throw new NotSignedInError(provider);
  }
}

function parseProvider(value: string): Provider | null {
  return value === "google" || value === "microsoft" ? value : null;
}

export function registerAuthRoutes(app: Express) {
  // Start sign-in: /auth/google or /auth/microsoft
  app.get("/auth/:provider", (req, res) => {
    const provider = parseProvider(req.params.provider);
    if (!provider) return res.status(404).send("Unknown provider");

    const cfg = config(provider);
    if (!cfg.clientId || !cfg.clientSecret) {
      return res
        .status(500)
        .send(`${provider} sign-in isn't set up yet: add its client ID and secret to the environment (see README).`);
    }

    const state = randomBytes(16).toString("hex");
    req.session.oauthState = { value: state, provider };

    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: redirectUri(provider),
      response_type: "code",
      scope: cfg.scope,
      state,
      ...cfg.extraAuthParams,
    });
    req.session.save(() => res.redirect(`${cfg.authUrl}?${params}`));
  });

  // Provider sends the user back here after they approve access
  app.get("/auth/:provider/callback", async (req, res) => {
    const provider = parseProvider(req.params.provider);
    if (!provider) return res.status(404).send("Unknown provider");

    const expected = req.session.oauthState;
    delete req.session.oauthState;

    if (req.query.error) {
      console.error(`${provider} sign-in was cancelled or refused:`, req.query.error_description || req.query.error);
      return res.redirect("/");
    }
    if (!expected || expected.provider !== provider || expected.value !== req.query.state) {
      return res.status(400).send("Sign-in link expired or invalid. Please go back and try again.");
    }

    try {
      const token = await requestToken(provider, {
        grant_type: "authorization_code",
        code: String(req.query.code || ""),
        redirect_uri: redirectUri(provider),
      });
      req.session.tokens = { ...(req.session.tokens || {}), [provider]: token };
      req.session.save(() => res.redirect(`/?connected=${config(provider).appName}`));
    } catch (error: any) {
      console.error(`${provider} sign-in failed:`, error);
      res.status(500).send("Sign-in failed. Please go back and try again.");
    }
  });

  // Which providers the user is signed in to
  app.get("/api/auth/status", (req, res) => {
    const tokens = req.session.tokens || {};
    res.json({ gdrive: !!tokens.google, onedrive: !!tokens.microsoft });
  });

  // Sign out of one provider
  app.post("/api/auth/:provider/logout", (req, res) => {
    const provider = parseProvider(req.params.provider);
    if (!provider) return res.status(404).json({ error: "Unknown provider" });
    if (req.session.tokens) delete req.session.tokens[provider];
    res.json({ success: true });
  });
}
