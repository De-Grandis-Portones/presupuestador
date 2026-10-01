import { http } from "./http.js";

export async function login({ username, password }) {
  const { data } = await http.post("/api/auth/login", { username, password });
  if (!data?.ok) throw new Error(data?.error || "Login falló");
  return data; // { ok, token, user }
}

export async function getMe() {
  const { data } = await http.get("/api/auth/me");
  if (!data?.ok) throw new Error(data?.error || "No pude obtener sesión");
  return data.user;
}

// true solo si el envio de emails funciona de verdad (si no, no se muestra "¿Olvidaste tu
// contraseña?"). Ante cualquier error, false.
export async function getPasswordResetEnabled() {
  try {
    const { data } = await http.get("/api/auth/password-reset/status");
    return data?.ok === true && data?.enabled === true;
  } catch {
    return false;
  }
}

export async function forgotPassword(identifier) {
  const { data } = await http.post("/api/auth/forgot-password", { identifier });
  if (!data?.ok) throw new Error(data?.error || "No se pudo enviar el pedido");
  return data;
}

export async function checkResetToken(token) {
  const { data } = await http.post("/api/auth/reset-password/check", { token });
  if (!data?.ok) throw new Error(data?.error || "El link no es válido o ya venció");
  return data; // { ok, username }
}

export async function resetPassword({ token, password }) {
  const { data } = await http.post("/api/auth/reset-password", { token, password });
  if (!data?.ok) throw new Error(data?.error || "No se pudo cambiar la contraseña");
  return data; // { ok, username }
}

// "Mi cuenta": manda al email de la cuenta un link para elegir la contraseña nueva.
export async function changePassword() {
  const { data } = await http.post("/api/auth/change-password");
  if (!data?.ok) throw new Error(data?.error || "No se pudo mandar el email para cambiar la contraseña");
  return data; // { ok, sent_to }
}

export async function updateMyEmail(email) {
  const { data } = await http.put("/api/auth/me/email", { email });
  if (!data?.ok) throw new Error(data?.error || "No se pudo guardar el email");
  return data; // { ok, email, recovery_email }
}
