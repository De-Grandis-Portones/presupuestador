import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

import Input from "../../ui/Input.jsx";
import Button from "../../ui/Button.jsx";
import NewPasswordFields from "../../components/NewPasswordFields.jsx";
import { MIN_PASSWORD_LENGTH } from "../../domain/auth/password.js";
import { changePassword, updateMyEmail } from "../../api/auth.js";
import { useAuthStore } from "../../domain/auth/store.js";

function EmailCard() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const current = String(user?.recovery_email || "");
  const [email, setEmail] = useState(current);

  useEffect(() => { setEmail(current); }, [current]);

  const m = useMutation({
    mutationFn: () => updateMyEmail(email.trim()),
    onSuccess: (data) => {
      setUser({ ...user, recovery_email: data.recovery_email ?? null });
      toast.success("Email guardado");
    },
    onError: (e) => toast.error(e?.message || "No se pudo guardar el email"),
  });

  const changed = email.trim().toLowerCase() !== current.toLowerCase();

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Email para recuperar la contraseña</h3>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
        Si te olvidás la contraseña, te mandamos a este email un link para elegir una nueva.
      </div>
      {!current ? (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, fontSize: 13, background: "var(--dg-warning-bg)", border: "1px solid var(--dg-warning-border)", color: "var(--dg-warning-text)" }}>
          Todavía no tenés un email cargado.
        </div>
      ) : null}
      <div className="spacer" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (changed && email.trim() && !m.isPending) m.mutate();
        }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
      >
        <Input
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="tu@email.com"
          autoComplete="email"
          style={{ flex: 1, minWidth: 220 }}
        />
        <Button type="submit" variant="secondary" disabled={!changed || !email.trim() || m.isPending}>
          {m.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </div>
  );
}

function ChangePasswordCard() {
  const setSession = useAuthStore((s) => s.setSession);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const m = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword: password }),
    onSuccess: (data) => {
      // El cambio invalida todas las sesiones anteriores; el back devuelve un token nuevo
      // para seguir usando esta.
      setSession({ token: data.token, user: data.user });
      setCurrentPassword("");
      setPassword("");
      setConfirm("");
      toast.success("Contraseña cambiada. Se cerraron tus sesiones en otros dispositivos.");
    },
  });

  const canSubmit = !!currentPassword && password.length >= MIN_PASSWORD_LENGTH && password === confirm && !m.isPending;

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Cambiar contraseña</h3>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
        Al cambiarla se cierra tu sesión en los otros dispositivos. La nueva contraseña es privada: no la ve nadie más.
      </div>
      <div className="spacer" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) m.mutate();
        }}
        style={{ maxWidth: 420 }}
      >
        <div className="muted">Contraseña actual</div>
        <Input
          type={show ? "text" : "password"}
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder="Contraseña actual"
          autoComplete="current-password"
          style={{ width: "100%" }}
        />
        <div className="spacer" />
        <NewPasswordFields
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
          show={show}
          onShowChange={setShow}
        />
        <div className="spacer" />
        {m.isError && <div style={{ color: "var(--dg-danger-text)", fontSize: 13, marginBottom: 8 }}>{m.error.message}</div>}
        <Button type="submit" disabled={!canSubmit}>
          {m.isPending ? "Guardando..." : "Cambiar contraseña"}
        </Button>
      </form>
    </div>
  );
}

export default function MyAccountPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <div className="spacer" />
      <div className="card">
        <h2 style={{ margin: 0 }}>Mi cuenta</h2>
        <div className="muted" style={{ fontSize: 13 }}>Usuario: {user?.username || "..."}</div>
      </div>
      <div className="spacer" />
      <EmailCard />
      <div className="spacer" />
      <ChangePasswordCard />
    </div>
  );
}
