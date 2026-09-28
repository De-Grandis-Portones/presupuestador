import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import Button from "../../ui/Button.jsx";
import PublicAuthCard from "../../components/PublicAuthCard.jsx";
import NewPasswordFields from "../../components/NewPasswordFields.jsx";
import { MIN_PASSWORD_LENGTH } from "../../domain/auth/password.js";
import { checkResetToken, resetPassword } from "../../api/auth.js";
import { useAuthStore } from "../../domain/auth/store.js";

// El link del email trae el token en el hash (#token=...), no en la query, para que no
// viaje al servidor ni quede en logs (ver requestPasswordReset en el back).
function readTokenFromHash() {
  const hash = String(window.location.hash || "").replace(/^#/, "");
  return new URLSearchParams(hash).get("token") || "";
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [token] = useState(readTokenFromHash);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const checkQ = useQuery({
    queryKey: ["passwordResetToken", token],
    queryFn: () => checkResetToken(token),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const m = useMutation({
    mutationFn: () => resetPassword({ token, password }),
    onSuccess: () => {
      // Si en este navegador habia una sesion abierta, ya no sirve (el cambio cierra todas).
      logout();
    },
  });

  const canSubmit = password.length >= MIN_PASSWORD_LENGTH && password === confirm && !m.isPending;

  if (m.isSuccess) {
    return (
      <PublicAuthCard title="Listo, tu contraseña cambió">
        <div className="spacer" />
        <div style={{ fontSize: 14, lineHeight: 1.5, textAlign: "center" }}>
          Ya podés entrar con tu nueva contraseña.
        </div>
        <div className="spacer" />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Button onClick={() => navigate("/login", { replace: true })}>Iniciar sesión</Button>
        </div>
      </PublicAuthCard>
    );
  }

  if (!token || checkQ.isError) {
    return (
      <PublicAuthCard title="El link no es válido o ya venció">
        <div className="spacer" />
        <div style={{ fontSize: 14, lineHeight: 1.5, textAlign: "center" }}>
          Los links sirven una sola vez y vencen a los 30 minutos. Pedí uno nuevo.
        </div>
        <div className="spacer" />
        <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <Link to="/recuperar-contrasena" style={{ fontSize: 14, fontWeight: 700 }}>Pedir un link nuevo</Link>
          <Link to="/login" style={{ fontSize: 14 }}>Iniciar sesión</Link>
        </div>
      </PublicAuthCard>
    );
  }

  if (checkQ.isLoading) {
    return (
      <PublicAuthCard title="Elegí una nueva contraseña">
        <div className="spacer" />
        <div className="muted" style={{ textAlign: "center", fontSize: 13 }}>Verificando el link...</div>
      </PublicAuthCard>
    );
  }

  return (
    <PublicAuthCard title="Elegí una nueva contraseña">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) m.mutate();
        }}
      >
        <div className="spacer" />
        <div className="muted" style={{ fontSize: 13, textAlign: "center" }}>
          Usuario: <strong style={{ color: "var(--dg-text)" }}>{checkQ.data?.username}</strong>
        </div>
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
        {m.isError && <div style={{ color: "var(--dg-danger-text)", fontSize: 13 }}>{m.error.message}</div>}
        <div className="spacer" />

        <div style={{ display: "flex", justifyContent: "center" }}>
          <Button type="submit" disabled={!canSubmit}>
            {m.isPending ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </div>
      </form>
    </PublicAuthCard>
  );
}
