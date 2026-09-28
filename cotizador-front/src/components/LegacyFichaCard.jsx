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

// Ficha técnica tal cual quedó en el sistema anterior (solo lectura). Sale de
// quote.payload.legacy_ficha, cargada por scripts/import_legacy_acopio_2026-09.mjs.
export default function LegacyFichaCard({ quote }) {
  const ficha = quote?.payload?.legacy_ficha || {};
  const opciones = Array.isArray(ficha.opciones) ? ficha.opciones : [];
  return (
    <div className="card" style={{ background: "var(--dg-info-bg)", border: "1px solid var(--dg-info-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div style={{ fontWeight: 900 }}>Ficha técnica (sistema anterior)</div>
        <div className="muted" style={{ fontSize: 12 }}>
          Vendido y facturado en el sistema anterior · no genera NV en Odoo
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
