import { useState } from "react";
import Button from "../ui/Button.jsx";
import Input from "../ui/Input.jsx";

function formatMeters(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })} m`;
}

function formatQty(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

function formatDate(v) {
  const s = String(v || "").slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (s || "—");
}

function metersToInput(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? String(n) : "";
}

function buildDraft(quote) {
  const ficha = quote?.payload?.legacy_ficha || {};
  const endCustomer = quote?.end_customer || {};
  const opciones = Array.isArray(ficha.opciones) ? ficha.opciones : [];
  return {
    end_customer: { name: endCustomer.name || "", phone: endCustomer.phone || "", address: endCustomer.address || "" },
    ficha: {
      fecha_nv: String(ficha.fecha_nv || "").slice(0, 10),
      ancho: metersToInput(ficha.ancho),
      alto: metersToInput(ficha.alto),
      sistema: ficha.sistema || "",
      razon_social: ficha.razon_social || "",
      observaciones: ficha.observaciones || "",
    },
    opciones: opciones.map((o) => ({
      titulo: o?.titulo || "",
      rubro: o?.rubro ?? "",
      descripcion: o?.descripcion || "",
      codigo: o?.codigo || "",
      cantidad: o?.cantidad != null ? String(o.cantidad) : "",
      observ: o?.observ || "",
    })),
  };
}

// Ficha técnica tal cual quedó en el sistema anterior. Sale de
// quote.payload.legacy_ficha, cargada por scripts/import_legacy_acopio_2026-09.mjs.
// Si canEdit=true (solo antes de solicitar el paso de acopio a producción, ver
// PUT /api/quotes/:id/legacy-ficha), se puede corregir cualquier dato cargado al
// migrarlo - útil porque esa carga fue manual y puede tener errores de tipeo.
export default function LegacyFichaCard({ quote, canEdit = false, onSave }) {
  const ficha = quote?.payload?.legacy_ficha || {};
  const opciones = Array.isArray(ficha.opciones) ? ficha.opciones : [];
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);

  function startEdit() {
    setDraft(buildDraft(quote));
    setError(null);
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft(null);
    setError(null);
  }
  function setOpcion(i, field, value) {
    setDraft((d) => ({ ...d, opciones: d.opciones.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)) }));
  }
  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        end_customer: { ...(quote?.end_customer || {}), ...draft.end_customer },
        legacy_ficha: {
          fecha_nv: draft.ficha.fecha_nv || null,
          ancho: draft.ficha.ancho !== "" ? Number(draft.ficha.ancho) : null,
          alto: draft.ficha.alto !== "" ? Number(draft.ficha.alto) : null,
          sistema: draft.ficha.sistema || null,
          razon_social: draft.ficha.razon_social || null,
          observaciones: draft.ficha.observaciones || null,
          opciones: draft.opciones.map((o) => ({ ...o, cantidad: o.cantidad !== "" ? Number(o.cantidad) : null })),
        },
      });
      setEditing(false);
      setDraft(null);
    } catch (e) {
      setError(e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (editing && draft) {
    return (
      <div className="card" style={{ background: "var(--dg-info-bg)", border: "1px solid var(--dg-info-border)" }}>
        <div style={{ fontWeight: 900 }}>Editando ficha técnica (sistema anterior)</div>
        <div className="spacer" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div><div className="muted">Cliente</div><Input value={draft.end_customer.name} onChange={(v) => setDraft((d) => ({ ...d, end_customer: { ...d.end_customer, name: v } }))} style={{ width: "100%" }} /></div>
          <div><div className="muted">Teléfono</div><Input value={draft.end_customer.phone} onChange={(v) => setDraft((d) => ({ ...d, end_customer: { ...d.end_customer, phone: v } }))} style={{ width: "100%" }} /></div>
          <div style={{ gridColumn: "span 2" }}><div className="muted">Dirección</div><Input value={draft.end_customer.address} onChange={(v) => setDraft((d) => ({ ...d, end_customer: { ...d.end_customer, address: v } }))} style={{ width: "100%" }} /></div>
          <div><div className="muted">Fecha NV</div><Input type="date" value={draft.ficha.fecha_nv} onChange={(v) => setDraft((d) => ({ ...d, ficha: { ...d.ficha, fecha_nv: v } }))} style={{ width: "100%" }} /></div>
          <div><div className="muted">Ancho (m)</div><Input type="number" step="0.001" value={draft.ficha.ancho} onChange={(v) => setDraft((d) => ({ ...d, ficha: { ...d.ficha, ancho: v } }))} style={{ width: "100%" }} /></div>
          <div><div className="muted">Alto (m)</div><Input type="number" step="0.001" value={draft.ficha.alto} onChange={(v) => setDraft((d) => ({ ...d, ficha: { ...d.ficha, alto: v } }))} style={{ width: "100%" }} /></div>
          <div style={{ gridColumn: "span 2" }}><div className="muted">Sistema</div><Input value={draft.ficha.sistema} onChange={(v) => setDraft((d) => ({ ...d, ficha: { ...d.ficha, sistema: v } }))} style={{ width: "100%" }} /></div>
          <div style={{ gridColumn: "span 2" }}><div className="muted">Distribuidor / razón social</div><Input value={draft.ficha.razon_social} onChange={(v) => setDraft((d) => ({ ...d, ficha: { ...d.ficha, razon_social: v } }))} style={{ width: "100%" }} /></div>
        </div>
        <div className="spacer" />
        <div className="muted">Observaciones</div>
        <textarea
          value={draft.ficha.observaciones}
          onChange={(e) => setDraft((d) => ({ ...d, ficha: { ...d.ficha, observaciones: e.target.value } }))}
          style={{ width: "100%", minHeight: 60, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--dg-border)", outline: "none", resize: "vertical" }}
        />
        <div className="spacer" />
        {!draft.opciones.length ? (
          <div className="muted">Sin opciones cargadas en el sistema anterior.</div>
        ) : (
          <table>
            <thead><tr><th>Rubro</th><th>Opción (descripción)</th><th>Código</th><th className="right">Cant.</th></tr></thead>
            <tbody>
              {draft.opciones.map((o, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, verticalAlign: "top" }}>{o.titulo || `Rubro ${o.rubro || "?"}`}</td>
                  <td><Input value={o.descripcion} onChange={(v) => setOpcion(i, "descripcion", v)} style={{ width: "100%" }} /></td>
                  <td><Input value={o.codigo} onChange={(v) => setOpcion(i, "codigo", v)} style={{ width: 110 }} /></td>
                  <td className="right"><Input type="number" value={o.cantidad} onChange={(v) => setOpcion(i, "cantidad", v)} style={{ width: 70, textAlign: "right" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {error ? <div style={{ color: "var(--dg-danger-text)", fontSize: 13, marginTop: 10 }}>{error}</div> : null}
        <div className="spacer" />
        <div style={{ display: "flex", gap: 8 }}>
          <Button disabled={saving} onClick={save}>{saving ? "Guardando..." : "Guardar"}</Button>
          <Button variant="ghost" disabled={saving} onClick={cancelEdit}>Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ background: "var(--dg-info-bg)", border: "1px solid var(--dg-info-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div style={{ fontWeight: 900 }}>Ficha técnica (sistema anterior)</div>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <div className="muted" style={{ fontSize: 12 }}>
            Vendido y facturado en el sistema anterior · no genera NV en Odoo
          </div>
          {canEdit ? <Button variant="ghost" onClick={startEdit}>Editar ficha</Button> : null}
        </div>
      </div>
      <div className="spacer" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <div><div className="muted">NV</div><div style={{ fontWeight: 800 }}>{ficha.nv ? `NV${ficha.nv}` : "—"}</div></div>
        <div><div className="muted">Fecha NV</div><div style={{ fontWeight: 800 }}>{formatDate(ficha.fecha_nv)}</div></div>
        <div><div className="muted">Ancho</div><div style={{ fontWeight: 800 }}>{formatMeters(ficha.ancho)}</div></div>
        <div><div className="muted">Alto</div><div style={{ fontWeight: 800 }}>{formatMeters(ficha.alto)}</div></div>
        <div style={{ gridColumn: "span 2" }}><div className="muted">Sistema</div><div style={{ fontWeight: 800 }}>{ficha.sistema || "—"}</div></div>
        <div style={{ gridColumn: "span 2" }}><div className="muted">Distribuidor / razón social</div><div style={{ fontWeight: 800 }}>{ficha.razon_social || "—"}</div></div>
      </div>
      {ficha.observaciones ? (
        <>
          <div className="spacer" />
          <div className="muted">Observaciones</div>
          <div style={{ whiteSpace: "pre-wrap", fontWeight: 700 }}>{ficha.observaciones}</div>
        </>
      ) : null}
      <div className="spacer" />
      {!opciones.length ? (
        <div className="muted">Sin opciones cargadas en el sistema anterior.</div>
      ) : (
        <table>
          <thead>
            <tr><th>Rubro</th><th>Opción</th><th className="right">Cant.</th></tr>
          </thead>
          <tbody>
            {opciones.map((o, i) => (
              <tr key={`${o?.codigo || "op"}-${i}`}>
                <td style={{ fontWeight: 700, verticalAlign: "top" }}>{o?.titulo || `Rubro ${o?.rubro || "?"}`}</td>
                <td>
                  <div>{o?.descripcion || "—"}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Código {o?.codigo || "—"}{o?.observ ? ` · ${o.observ}` : ""}
                  </div>
                </td>
                <td className="right" style={{ verticalAlign: "top" }}>{formatQty(o?.cantidad)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
