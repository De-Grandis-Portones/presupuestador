import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

import Input from "../../ui/Input.jsx";
import Button from "../../ui/Button.jsx";
import { changePassword, updateMyEmail, getPasswordResetEnabled } from "../../api/auth.js";
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
  const user = useAuthStore((s) => s.user);
  const [sentTo, setSentTo] = useState("");

  // El cambio se hace desde un link que llega por email: sin envio de emails no se puede.
  const mailQ = useQuery({
    queryKey: ["passwordResetEnabled"],
    queryFn: getPasswordResetEnabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const hasEmail = !!user?.recovery_email;
  const mailReady = mailQ.data === true;

  const m = useMutation({
    mutationFn: () => changePassword(),
    onSuccess: (data) => setSentTo(data.sent_to || "tu email"),
  });

  const notice = (tone, content) => (
    <div
      style={{
        marginTop: 10, padding: "10px 12px", borderRadius: 10, fontSize: 13, lineHeight: 1.5,
        background: `var(--dg-${tone}-bg)`, border: `1px solid var(--dg-${tone}-border)`, color: `var(--dg-${tone}-text)`,
      }}
    >
      {content}
    </div>
  );

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Cambiar contraseña</h3>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
        Te mandamos un email con un botón para elegir tu nueva contraseña. Cuando la cambies se cierran todas tus sesiones,
        también esta, y entrás con la nueva. La nueva contraseña es privada: no la ve nadie más.
      </div>
      {sentTo
        ? notice("success", <>Te mandamos un email a <strong>{sentTo}</strong>. Entrá a tu correo y tocá <strong>"Cambiar contraseña"</strong>. El link vence en 30 minutos; si no lo ves, revisá la carpeta de spam.</>)
        : null}
      {!hasEmail ? notice("warning", "Primero cargá tu email arriba: ahí te mandamos el link para cambiar la contraseña.") : null}
      {hasEmail && mailQ.data === false
        ? notice("warning", "El envío de emails todavía no está disponible, así que por ahora no se puede cambiar la contraseña desde acá. Pedile a tu vendedor que te la cambie.")
        : null}
      {m.isError ? <div style={{ color: "var(--dg-danger-text)", fontSize: 13, marginTop: 10 }}>{m.error.message}</div> : null}
      <div className="spacer" />
      <Button
        onClick={() => {
          setSentTo("");
          m.mutate();
        }}
        disabled={!hasEmail || !mailReady || m.isPending}
      >
        {m.isPending ? "Enviando email..." : sentTo ? "Mandar el email de nuevo" : "Cambiar contraseña"}
      </Button>
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
