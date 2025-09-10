const AUTH_KEY = "auth";

export type AuthData = {
  accessToken: string | null;
  refreshToken?: string | null;
};

export function saveAuth(data: AuthData, opts?: { remember?: boolean }) {
  const payload = JSON.stringify(data);
  try {
    if (opts?.remember) {
      localStorage.setItem(AUTH_KEY, payload);
      sessionStorage.removeItem(AUTH_KEY);
    } else {
      sessionStorage.setItem(AUTH_KEY, payload);
      localStorage.removeItem(AUTH_KEY);
    }
  } catch {
    try {
      localStorage.setItem(AUTH_KEY, payload);
    } catch {}
  }
}

export function readAuth(): AuthData {  
  try {
    const raw = sessionStorage.getItem(AUTH_KEY) ?? localStorage.getItem(AUTH_KEY) ?? "{}";
    return JSON.parse(raw);
  } catch {
    return { accessToken: null };
  }
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
}
