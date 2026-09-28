import Input from "../ui/Input.jsx";
import { MIN_PASSWORD_LENGTH, newPasswordError } from "../domain/auth/password.js";

export default function NewPasswordFields({ password, confirm, onPasswordChange, onConfirmChange, show, onShowChange }) {
  const error = newPasswordError(password, confirm);
  return (
    <>
      <div className="muted">Nueva contraseña</div>
      <Input
        type={show ? "text" : "password"}
        value={password}
        onChange={onPasswordChange}
        placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
        autoComplete="new-password"
        style={{ width: "100%" }}
      />
      <div className="spacer" />
      <div className="muted">Repetir nueva contraseña</div>
      <Input
        type={show ? "text" : "password"}
        value={confirm}
        onChange={onConfirmChange}
        placeholder="Repetir contraseña"
        autoComplete="new-password"
        style={{ width: "100%" }}
      />
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: 13 }}>
        <input type="checkbox" checked={show} onChange={(e) => onShowChange(e.target.checked)} />
        Mostrar contraseñas
      </label>
      {error ? <div style={{ color: "var(--dg-danger-text)", fontSize: 13, marginTop: 6 }}>{error}</div> : null}
    </>
  );
}
