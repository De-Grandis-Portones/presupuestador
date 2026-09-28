import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import Input from "../../ui/Input.jsx";
import Button from "../../ui/Button.jsx";
import PublicAuthCard from "../../components/PublicAuthCard.jsx";
import { forgotPassword } from "../../api/auth.js";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");

  const m = useMutation({ mutationFn: () => forgotPassword(identifier.trim()) });

  if (m.isSuccess) {
    return (
      <PublicAuthCard title="Revisá tu email">
        <div className="spacer" />
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>
          Si el usuario existe y tiene un email cargado, te mandamos un link para elegir una nueva contraseña.
          El link vence en 30 minutos.
        </div>
        <div className="spacer" />
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Revisá también la carpeta de spam. Si no te llega, pedile a tu vendedor que te resetee la contraseña.
        </div>
        <div className="spacer" />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link to="/login" style={{ fontSize: 14, fontWeight: 700 }}>Volver a iniciar sesión</Link>
        </div>
      </PublicAuthCard>
    );
  }

  return (
    <PublicAuthCard title="¿Olvidaste tu contraseña?">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (m.isPending || !identifier.trim()) return;
          m.mutate();
        }}
      >
        <div className="spacer" />
        <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
          Escribí tu usuario o tu email y te mandamos un link para elegir una nueva.
        </div>
        <div className="spacer" />
        <div className="muted">Usuario o email</div>
        <Input
          value={identifier}
          onChange={setIdentifier}
          placeholder="Usuario o email"
          autoComplete="username"
          autoFocus
          style={{ width: "100%" }}
        />

        <div className="spacer" />
        {m.isError && <div style={{ color: "var(--dg-danger-text)", fontSize: 13 }}>{m.error.message}</div>}
        <div className="spacer" />

        <div style={{ display: "flex", justifyContent: "center" }}>
          <Button type="submit" disabled={m.isPending || !identifier.trim()}>
            {m.isPending ? "Enviando..." : "Enviar link"}
          </Button>
        </div>
        <div className="spacer" />
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link to="/login" style={{ fontSize: 13 }}>Volver a iniciar sesión</Link>
        </div>
      </form>
    </PublicAuthCard>
  );
}
