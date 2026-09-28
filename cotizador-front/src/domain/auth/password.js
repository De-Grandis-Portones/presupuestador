// Mismo minimo que valida el back (validateNewPassword en passwordReset.js).
export const MIN_PASSWORD_LENGTH = 8;

export function newPasswordError(password, confirm) {
  if (!password) return "";
  if (password.length < MIN_PASSWORD_LENGTH) return `Tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (confirm && password !== confirm) return "Las contraseñas no coinciden.";
  return "";
}
