import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import Button from "../ui/Button.jsx";
import { useAuthStore } from "../domain/auth/store.js";
import { getPendingClientAcceptance } from "../api/quotes.js";

// Argentina (America/Argentina/Buenos_Aires) es UTC-3 fijo, sin horario de
// verano desde 2009 - no hace falta una lib de timezones para esto.
const ARGENTINA_OFFSET_MS = 3 * 60 * 60 * 1000;
const SLOTS = [
  { key: "09", minutes: 9 * 60 },
  { key: "12", minutes: 12 * 60 },
  { key: "17", minutes: 17 * 60 },
];
const CHECK_INTERVAL_MS = 60 * 1000;

function currentSlotKey(date = new Date()) {
  const art = new Date(date.getTime() - ARGENTINA_OFFSET_MS);
  const y = art.getUTCFullYear();
  const m = String(art.getUTCMonth() + 1).padStart(2, "0");
  const d = String(art.getUTCDate()).padStart(2, "0");
  const minutesNow = art.getUTCHours() * 60 + art.getUTCMinutes();

  let activeSlot = null;
  for (const slot of SLOTS) {
    if (minutesNow >= slot.minutes) activeSlot = slot.key;
  }
  if (!activeSlot) return null; // antes de las 09:00 ART todavia no hay slot del dia

  return `${y}-${m}-${d}-${activeSlot}`;
}

function useCurrentSlotKey() {
  const [slotKey, setSlotKey] = useState(() => currentSlotKey());
  useEffect(() => {
    const interval = setInterval(() => setSlotKey(currentSlotKey()), CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
  return slotKey;
}

function readStoredSlot(storageKey) {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeStoredSlot(storageKey, slotKey) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, slotKey);
  } catch {
    // No bloquear la UI si el navegador no permite localStorage.
  }
}

function nvReference(q) {
  return q?.final_sale_order_name || q?.odoo_sale_order_name || (q?.quote_number ? `#${q.quote_number}` : "—");
}

function buildAcceptanceUrl(token) {
  if (!token || typeof window === "undefined") return null;
  return `${window.location.origin}/aceptacion-cliente/${token}`;
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000)));
}

function daysBadgeColor(days) {
  if (days === null) return { color: "var(--dg-muted)", background: "var(--dg-tint)", border: "var(--dg-border)" };
  if (days >= 7) return { color: "var(--dg-danger-text)", background: "var(--dg-danger-bg)", border: "var(--dg-danger-border)" };
  if (days >= 3) return { color: "var(--dg-warning-text)", background: "var(--dg-warning-bg)", border: "var(--dg-warning-border)" };
  return { color: "var(--dg-success-text)", background: "var(--dg-success-bg)", border: "var(--dg-success-border)" };
}

function DaysPendingBadge({ dateStr, unit = "sin firmar" }) {
  const days = daysSince(dateStr);
  const tone = daysBadgeColor(days);
  return (
    <div style={{ textAlign: "center", flexShrink: 0 }}>
      <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: tone.color }}>
        {days === null ? "—" : days}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: tone.color, whiteSpace: "nowrap" }}>
        {days === 1 ? `día ${unit}` : `días ${unit}`}
      </div>
    </div>
  );
}

function quoteEditorPath(q) {
  const kind = String(q?.catalog_kind || "porton").toLowerCase();
  if (kind === "ipanel") return `/cotizador/ipanel/${q.id}`;
  if (kind === "plegados") return `/cotizador/plegados/${q.id}`;
  if (kind === "otros") return `/cotizador/otros/${q.id}`;
  return `/cotizador/${q.id}`;
}

function PendingItemRow({ quote, showOwner }) {
  const [copied, setCopied] = useState(false);
  const url = buildAcceptanceUrl(quote?.measurement_share_token);
  const tone = daysBadgeColor(daysSince(quote?.measurement_share_enabled_at));

  function copyLink() {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: `1px solid ${tone.border}`, background: tone.background, borderRadius: 10, padding: "8px 12px" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 800 }}>{nvReference(quote)} · {quote?.end_customer?.name || "Cliente sin nombre"}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {quote?.end_customer?.city || ""}
          {showOwner ? `${quote?.end_customer?.city ? " · " : ""}Distribuidor: ${quote?.created_by_full_name || quote?.created_by_username || "—"}` : ""}
        </div>
      </div>
      <DaysPendingBadge dateStr={quote?.measurement_share_enabled_at} />
      {url ? (
        <Button variant="ghost" onClick={copyLink}>{copied ? "✓ Copiado" : "Copiar link"}</Button>
      ) : null}
    </div>
  );
}

function PendingSection({ title, items, showOwner }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title} ({items.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
        {items.map((quote) => (
          <PendingItemRow key={quote.id} quote={quote} showOwner={showOwner} />
        ))}
      </div>
    </div>
  );
}

// Devuelto por medición/técnica/comercial (measurement_status='returned_to_seller'): el
// vendedor tiene que entrar, revisar la diferencia de superficie medida y confirmar de
// nuevo para que el presupuesto siga a Enc. Comercial - sin este aviso puede quedar
// trabado en borrador indefinidamente sin que nadie se dé cuenta.
function ReturnedItemRow({ quote, showOwner, onGo }) {
  const tone = daysBadgeColor(daysSince(quote?.measurement_review_at));
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, border: `1px solid ${tone.border}`, background: tone.background, borderRadius: 10, padding: "8px 12px" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 800 }}>{nvReference(quote)} · {quote?.end_customer?.name || "Cliente sin nombre"}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {quote?.end_customer?.city || ""}
          {showOwner ? `${quote?.end_customer?.city ? " · " : ""}Distribuidor: ${quote?.created_by_full_name || quote?.created_by_username || "—"}` : ""}
        </div>
        {quote?.measurement_review_notes ? (
          <div className="muted" style={{ fontSize: 12, marginTop: 2, fontStyle: "italic" }}>"{quote.measurement_review_notes}"</div>
        ) : null}
      </div>
      <DaysPendingBadge dateStr={quote?.measurement_review_at} unit="sin revisar" />
      <Button variant="ghost" onClick={() => onGo(quote)}>Revisar y confirmar</Button>
    </div>
  );
}

function ReturnedSection({ title, items, showOwner, onGo }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title} ({items.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
        {items.map((quote) => (
          <ReturnedItemRow key={quote.id} quote={quote} showOwner={showOwner} onGo={onGo} />
        ))}
      </div>
    </div>
  );
}

export default function PendingClientAcceptanceModal() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const userId = Number(user?.user_id || user?.id || 0);
  const isVendedor = !!user?.is_vendedor;
  const isDistribuidor = !!user?.is_distribuidor;
  const shouldTrack = !!userId && (isVendedor || isDistribuidor);

  const activeSlotKey = useCurrentSlotKey();
  const storageKey = userId ? `pending_client_acceptance_last_slot_${userId}` : null;
  const [dismissedSlotKey, setDismissedSlotKey] = useState(() => readStoredSlot(storageKey));

  useEffect(() => {
    setDismissedSlotKey(readStoredSlot(storageKey));
  }, [storageKey]);

  const shouldCheck = shouldTrack && !!activeSlotKey && activeSlotKey !== dismissedSlotKey;

  const pendingQ = useQuery({
    queryKey: ["pendingClientAcceptance", userId, activeSlotKey],
    queryFn: getPendingClientAcceptance,
    enabled: shouldCheck,
    staleTime: 5 * 60 * 1000,
  });

  const own = pendingQ.data?.own || [];
  const distributors = pendingQ.data?.distributors || [];
  const returnedOwn = pendingQ.data?.returned_own || [];
  const returnedDistributors = pendingQ.data?.returned_distributors || [];
  const total = own.length + distributors.length + returnedOwn.length + returnedDistributors.length;

  function dismiss() {
    if (storageKey && activeSlotKey) writeStoredSlot(storageKey, activeSlotKey);
    setDismissedSlotKey(activeSlotKey);
  }

  function goToReturned(quote) {
    dismiss();
    navigate(quoteEditorPath(quote));
  }

  // Si no hay nada pendiente, el slot igual se marca como consultado para no
  // reintentar en loop hasta el proximo horario (09/12/17).
  useEffect(() => {
    if (shouldCheck && pendingQ.isSuccess && total === 0) dismiss();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCheck, pendingQ.isSuccess, total]);

  if (!shouldCheck || !pendingQ.isSuccess || total === 0) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(17,24,39,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={dismiss}
    >
      <div
        className="card"
        style={{ maxWidth: 620, width: "100%", maxHeight: "88vh", overflowY: "auto", borderRadius: 16, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 900, fontSize: 23, color: "var(--dg-text)" }}>
          Pendientes de atender ({total})
        </div>

        {(own.length || distributors.length) ? (
          <>
            <div style={{ fontSize: 15, marginTop: 10, fontWeight: 800 }}>Firma del cliente pendiente</div>
            <div style={{ fontSize: 14, marginTop: 2 }}>
              Estas notas de venta ya tienen el link de aceptación enviado, pero el cliente todavía no firmó.
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Este aviso sale a las 9, 12 y 17 hs. Mientras tanto, el link está siempre disponible en <b>Mis presupuestos</b>, en la fila de cada cliente (🔗).
            </div>
            <div style={{ marginTop: 8, border: "1px solid var(--dg-danger-border)", background: "var(--dg-danger-bg)", color: "var(--dg-danger-text)", borderRadius: 10, padding: "10px 12px", fontWeight: 800, fontSize: 14 }}>
              ⚠️ El producto no ingresa a producción hasta que el cliente complete la aceptación.
            </div>

            {isVendedor ? (
              <>
                <PendingSection title="Portones propios" items={own} showOwner={false} />
                <PendingSection title="Portones de distribuidores" items={distributors} showOwner />
              </>
            ) : (
              <PendingSection title="Pendientes de firma" items={own} showOwner={false} />
            )}
          </>
        ) : null}

        {(returnedOwn.length || returnedDistributors.length) ? (
          <>
            <div style={{ fontSize: 15, marginTop: 18, fontWeight: 800 }}>Postmedición pendiente de revisar</div>
            <div style={{ fontSize: 14, marginTop: 2 }}>
              Técnica devolvió estos presupuestos: la medida final quedó distinta a lo presupuestado. Hay que revisarlos y confirmarlos de nuevo para que sigan a Enc. Comercial.
            </div>
            <div style={{ marginTop: 8, border: "1px solid var(--dg-warning-border)", background: "var(--dg-warning-bg)", color: "var(--dg-warning-text)", borderRadius: 10, padding: "10px 12px", fontWeight: 800, fontSize: 14 }}>
              ⚠️ No avanzan a Comercial hasta que los confirmes de nuevo.
            </div>

            {isVendedor ? (
              <>
                <ReturnedSection title="Portones propios" items={returnedOwn} showOwner={false} onGo={goToReturned} />
                <ReturnedSection title="Portones de distribuidores" items={returnedDistributors} showOwner onGo={goToReturned} />
              </>
            ) : (
              <ReturnedSection title="Pendientes de revisar" items={returnedOwn} showOwner={false} onGo={goToReturned} />
            )}
          </>
        ) : null}

        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onClick={() => { dismiss(); navigate("/presupuestos", { state: { filter: "produccion" } }); }}>Ver mis presupuestos</Button>
          <Button onClick={dismiss}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
}
