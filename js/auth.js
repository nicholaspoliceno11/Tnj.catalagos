const SESSION_KEY = "tnj3d_admin_session";
const ADMIN_EMAIL = "nicholas.maceio.al@gmail.com";
const ADMIN_PASSWORD_HASH = "223dd58dd888801f29a153a3127b9532503b119531338c1596dd626ac9204ecd";

const hashPassword = async (password) => {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const login = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  if (normalizedEmail !== ADMIN_EMAIL || passwordHash !== ADMIN_PASSWORD_HASH) {
    throw new Error("E-mail ou senha incorretos.");
  }

  const session = {
    email: normalizedEmail,
    expiresAt: Date.now() + 1000 * 60 * 60 * 8,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
};

export const logout = () => {
  sessionStorage.removeItem(SESSION_KEY);
};

export const isAuthenticated = () => {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return false;

  try {
    const session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      logout();
      return false;
    }
    return true;
  } catch {
    logout();
    return false;
  }
};

export const requireAuth = () => {
  if (!isAuthenticated()) {
    window.location.href = "admin.html";
    return false;
  }
  return true;
};
