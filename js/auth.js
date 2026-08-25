const SESSION_KEY = "tnj3d_admin_session";
const ADMIN_EMAIL = "nicholas.maceio.al@gmail.com";
const ADMIN_PASSWORD = atob("TmljSDE/b2w=");

export const login = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (normalizedEmail !== ADMIN_EMAIL || normalizedPassword !== ADMIN_PASSWORD) {
    throw new Error("E-mail ou senha incorretos. Verifique e tente novamente.");
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
