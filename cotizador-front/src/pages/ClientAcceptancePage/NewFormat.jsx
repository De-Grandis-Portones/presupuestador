// Formato nuevo del link de aceptación del cliente (porton/ipanel/puerta), gateado por
// fecha en index.jsx (quoteUsesNewAcceptanceFormat) - ver el comentario ahí para el porqué
// del corte. Reusa toda la lógica de datos ya calculada en index.jsx (se la recibe como
// props, nada se recalcula acá) y los componentes de esquema que ya existen en el editor
// (ParantesDistributionScheme, IpanelDivisionsSketch, PanelSketch) para no desincronizarse
// nunca de las reglas reales del presupuesto.
import Button from "../../ui/Button.jsx";
import Input from "../../ui/Input.jsx";
import { text, toNumberLike, MeasurementSchemeVisual, TermsModal } from "./index.jsx";
import { ParantesDistributionScheme } from "../../components/ParantesDistributionScheme.jsx";
import { computeCommercialLinesDiff } from "../../domain/quote/commercialDiff.js";
import { IpanelDivisionsSketch, IPANEL_LAMAS_22_PRODUCT_IDS, APTOS_PARA_REVESTIR_TYPE } from "../CotizadorPage/components/PortonDimensions.jsx";
import {
  PanelSketch,
  DOOR_PANEL_CONFIGS,
  lineMatchesProductIds,
  getPanelState,
} from "../PresupuestadorPuertasPage/components/PuertaDimensions.jsx";

function Section({ title, tag, children }) {
  return (
    <div className="caf-card">
      <div className="caf-card-head">
        <h2>{title}</h2>
        {tag ? <span className="caf-tag">{tag}</span> : null}
      </div>
      <div className="caf-card-body">{children}</div>
    </div>
  );
}
function KvGrid({ children }) {
  return <div className="caf-kv-grid">{children}</div>;
}
function Kv({ label, value }) {
  return (
    <div className="caf-kv">
      <div className="caf-kv-k">{label}</div>
      <div className="caf-kv-v">{value || <span className="caf-muted">—</span>}</div>
    </div>
  );
}
function NvStrip({ quote }) {
  const nvNumber = quote?.final_sale_order_name || quote?.odoo_sale_order_name || quote?.quote_number || "";
  return (
    <div className="caf-nv-strip">
      <div>
        <div className="caf-nv-label">Nota de venta</div>
        <div className="caf-nv-num">{nvNumber}</div>
      </div>
      <div className="caf-nv-who">
        <div className="caf-nv-name">{quote?.end_customer?.name}</div>
        <div className="caf-nv-sub">{quote?.end_customer?.city}</div>
      </div>
    </div>
  );
}
function ClientDataSection({ quote }) {
  return (
    <Section title="Datos del cliente">
      <KvGrid>
        <Kv label="Cliente" value={quote?.end_customer?.name} />
        <Kv label="Teléfono" value={quote?.end_customer?.phone} />
        <Kv label="Dirección" value={quote?.end_customer?.address} />
        <Kv label="Localidad" value={quote?.end_customer?.city} />
        <Kv label="Vendedor" value={quote?.created_by_full_name || quote?.created_by_username} />
        <Kv
          label="Ubicación"
          value={
            quote?.end_customer?.maps_url ? (
              <a href={quote.end_customer.maps_url} target="_blank" rel="noopener noreferrer">
                Ver en Google Maps ↗
              </a>
            ) : (
              ""
            )
          }
        />
      </KvGrid>
    </Section>
  );
}
function measurementDateLabel(quote) {
  const raw = quote?.measurement_review_at;
  if (!raw) return "";
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("es-AR") : "";
}
function hasRealMeasurementScheme(form) {
  const altos = Array.isArray(form?.esquema?.alto) ? form.esquema.alto : [];
  const anchos = Array.isArray(form?.esquema?.ancho) ? form.esquema.ancho : [];
  return altos.some((v) => text(v)) || anchos.some((v) => text(v));
}
function PortonMeasurementSection({ quote, form }) {
  if (!hasRealMeasurementScheme(form)) return null;
  return (
    <Section title="Medición registrada" tag={measurementDateLabel(quote)}>
      <MeasurementSchemeVisual form={form} />
    </Section>
  );
}

// Esquema de medición propio para puerta: solo 2 puntos de control por eje (a diferencia
// del de portón, que tiene 3 puntos y usa una imagen de fondo con 3 casilleros fijos por
// eje). Idéntico al aprobado en el mockup (Artifact "Link de Puerta" v4) - flechas dibujadas
// como polígonos fijos verticales en vez de <marker orient="auto">, que rotaba mal.
function DoorMeasurementScheme({ altoValues, anchoValues }) {
  const w = 620;
  const h = 300;
  const wallW = 34;
  const vanoX = 60;
  const vanoRight = 420;
  const vanoTop = 26;
  const vanoBottom = h - 20;
  const altoXs = [vanoX + (vanoRight - vanoX) * 0.32, vanoX + (vanoRight - vanoX) * 0.68];
  const boxY = vanoTop + 90;
  const boxH = 46;
  const boxW = 86;
  const anchoX = vanoRight + wallW + 40;
  const anchoYs = [vanoTop + 60, vanoTop + 140];
  const aboxW = 110;
  const aboxH = 44;
  return (
    <div className="caf-scheme-box">
      <div className="caf-scheme-wrap" style={{ maxWidth: 480 }}>
        <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
          <rect x={vanoX - wallW} y={vanoTop} width={wallW} height={vanoBottom - vanoTop} fill="#9aa3a4" />
          <rect x={vanoRight} y={vanoTop} width={wallW} height={vanoBottom - vanoTop} fill="#9aa3a4" />
          <line x1={vanoX} y1={vanoTop} x2={vanoRight} y2={vanoTop} stroke="#9aa3a4" strokeWidth="6" />
          <text className="caf-panel-label" x={(vanoX + vanoRight) / 2} y={vanoTop + 26} fontSize="20" textAnchor="middle">
            Alto
          </text>
          {altoValues.slice(0, 2).map((val, i) => {
            const cx = altoXs[i];
            const topLineTop = vanoTop + 40;
            const topLineBottom = boxY - 14;
            const botLineTop = boxY + boxH + 14;
            const botLineBottom = vanoBottom - 24;
            return (
              <g key={`alto-${i}`}>
                <line x1={cx} y1={topLineTop} x2={cx} y2={topLineBottom} stroke="var(--dg-text)" strokeWidth="2" />
                <polygon points={`${cx - 6},${topLineBottom - 8} ${cx + 6},${topLineBottom - 8} ${cx},${topLineBottom}`} fill="var(--dg-text)" />
                <line x1={cx} y1={botLineTop} x2={cx} y2={botLineBottom} stroke="var(--dg-text)" strokeWidth="2" />
                <polygon points={`${cx - 6},${botLineBottom + 8} ${cx + 6},${botLineBottom + 8} ${cx},${botLineBottom}`} fill="var(--dg-text)" />
                <rect x={cx - boxW / 2} y={boxY} width={boxW} height={boxH} fill="var(--dg-card)" stroke="var(--dg-text)" strokeWidth="2" strokeDasharray="6 5" />
                <text className="caf-panel-label" x={cx} y={boxY + boxH / 2 + 6} fontSize="19" textAnchor="middle">
                  {val}
                </text>
              </g>
            );
          })}
          <text className="caf-panel-label" x={anchoX + 60} y={vanoTop + 4} fontSize="20" textAnchor="middle">
            Ancho
          </text>
          {anchoValues.slice(0, 2).map((val, i) => {
            const cy = anchoYs[i];
            return (
              <g key={`ancho-${i}`}>
                <rect x={anchoX} y={cy - aboxH / 2} width={aboxW} height={aboxH} fill="var(--dg-card)" stroke="var(--dg-text)" strokeWidth="2" strokeDasharray="6 5" />
                <text className="caf-panel-label" x={anchoX + aboxW / 2} y={cy + 6} fontSize="19" textAnchor="middle">
                  {val}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="caf-scheme-caption">Esquema de medición: 2 puntos de control tomados en el vano (medidas en mm)</div>
    </div>
  );
}
function PuertaMeasurementSection({ quote, form }) {
  const altos = (Array.isArray(form?.esquema?.alto) ? form.esquema.alto : []).map(text).filter(Boolean);
  const anchos = (Array.isArray(form?.esquema?.ancho) ? form.esquema.ancho : []).map(text).filter(Boolean);
  if (!altos.length && !anchos.length) return null;
  const altoValues = altos.length ? altos.slice(0, 2) : ["—", "—"];
  const anchoValues = anchos.length ? anchos.slice(0, 2) : ["—", "—"];
  return (
    <Section title="Medición registrada" tag={measurementDateLabel(quote)}>
      <DoorMeasurementScheme altoValues={altoValues} anchoValues={anchoValues} />
    </Section>
  );
}

function SimpleTechnicalSection({ quote, title }) {
  const dims = quote?.payload?.dimensions || {};
  const widthM = toNumberLike(dims?.width);
  const heightM = toNumberLike(dims?.height);
  const superficieM2 = widthM > 0 && heightM > 0 ? widthM * heightM : null;
  return (
    <Section title={title}>
      <KvGrid>
        <Kv label="Ancho" value={widthM > 0 ? `${widthM.toFixed(2)} m` : ""} />
        <Kv label="Alto" value={heightM > 0 ? `${heightM.toFixed(2)} m` : ""} />
        <Kv label="Superficie" value={superficieM2 ? `${superficieM2.toFixed(2)} m²` : ""} />
      </KvGrid>
    </Section>
  );
}
function PortonTechnicalSection({ budgetTechnicalRows }) {
  return (
    <Section title="Datos técnicos del Portón a fabricar">
      <KvGrid>
        {budgetTechnicalRows.map((row) => (
          <Kv key={row.label} label={row.label} value={row.value} />
        ))}
      </KvGrid>
    </Section>
  );
}

function ParantesSchemeSection({ quote }) {
  const isApto = String(quote?.payload?.porton_type || "") === APTOS_PARA_REVESTIR_TYPE;
  if (!isApto) return null;
  return (
    <Section title="Esquema de distribución de parantes">
      <ParantesDistributionScheme quote={quote} />
    </Section>
  );
}
function ipanelDimensionsFrom(dims = {}) {
  return {
    orientation: dims.ipanel_lamas_orientacion ?? dims.orientacion_ipanel_lamas ?? dims.ipanel_orientacion_lamas ?? dims.ipanel_lamas_orientation ?? "horizontal",
    sectionSizes: dims.ipanel_divisiones_medidas_mm ?? dims.medidas_divisiones_ipanel_mm ?? dims.ipanel_section_sizes_mm ?? [],
    classic: dims.ipanel_divisiones_incluyen_liston === true || String(dims.ipanel_distribucion_divisiones ?? dims.ipanel_divisiones_distribucion ?? "").trim().toLowerCase() === "clasica",
  };
}
function IpanelSchemeSection({ quote }) {
  const lines = Array.isArray(quote?.lines) ? quote.lines : [];
  const hasLamas = lines.some((line) => lineMatchesProductIds(line, IPANEL_LAMAS_22_PRODUCT_IDS));
  if (!hasLamas) return null;
  const dims = quote?.payload?.dimensions || {};
  const { orientation, sectionSizes, classic } = ipanelDimensionsFrom(dims);
  const widthMm = Math.round(toNumberLike(dims.width) * 1000);
  const heightMm = Math.round(toNumberLike(dims.height) * 1000);
  return (
    <Section title="Esquema del Ipanel">
      <IpanelDivisionsSketch
        orientation={orientation}
        widthMm={widthMm}
        heightMm={heightMm}
        sectionSizes={(Array.isArray(sectionSizes) ? sectionSizes : []).map((v) => toNumberLike(v))}
        dividersIncludedInSectionSizes={classic}
      />
    </Section>
  );
}
function PuertaPanelSchemeSection({ quote, configKey }) {
  const config = DOOR_PANEL_CONFIGS[configKey];
  const lines = Array.isArray(quote?.lines) ? quote.lines : [];
  const hasPanel = lines.some((line) => lineMatchesProductIds(line, config.productIds));
  if (!hasPanel) return null;
  const dims = quote?.payload?.dimensions || {};
  const state = getPanelState(dims, config);
  const widthMm = Math.round(toNumberLike(dims.width) * 1000);
  const heightMm = Math.round(toNumberLike(dims.height) * 1000);
  return (
    <Section title={`Esquema del ${config.title}`}>
      <PanelSketch
        orientation={state.orientation}
        widthMm={widthMm}
        heightMm={heightMm}
        sectionSizes={state.rawSizes}
        dividersIncludedInSectionSizes={state.classic}
      />
    </Section>
  );
}

// Resaltado verde de items modificados desde el presupuesto original (ver
// measurement_commercial_diff_json, grabado en measurements.routes.js cada vez que
// medicion/tecnica/comercial devuelve el presupuesto al vendedor). Mismo helper que ya usa
// QuoteDetailPage/AprobacionComercialPage para no reinventar la logica de diff.
function computeLineDiffInfo(quote) {
  const originalLines = quote?.measurement_commercial_diff_json?.original_lines;
  if (!Array.isArray(originalLines) || !originalLines.length) return null;
  const diff = computeCommercialLinesDiff(originalLines, quote?.lines || []);
  if (!diff.hasChanges) return { hasChanges: false, keys: new Set() };
  // "removed" nunca puede coincidir con una linea actual (por definicion ya no esta en
  // quote.lines) - se deja afuera del set para no confundir la deteccion de "se resalto
  // algo de verdad" mas abajo (ver anyHighlighted en BudgetDetailSection). Un cambio que
  // fue puramente una linea quitada sigue sin mostrar la leyenda, ya que no hay ningun
  // item resaltado que la justifique.
  const keys = new Set([...diff.added, ...diff.changed].map((item) => item.key));
  return { hasChanges: keys.size > 0, keys };
}
function lineDiffKeyForBudgetLine(line) {
  if (line.productId > 0) return `pid:${line.productId}`;
  if (line.code) return `code:${line.code}`;
  return `name:${String(line.name || "").toLowerCase()}`;
}
function BudgetDetailSection({ budgetDetailLines, diffInfo }) {
  const groups = [];
  const groupIndexByName = new Map();
  for (const line of budgetDetailLines) {
    const sectionName = line.sectionName || "Detalle del presupuesto";
    if (!groupIndexByName.has(sectionName)) {
      groupIndexByName.set(sectionName, groups.length);
      groups.push({ sectionName, items: [] });
    }
    groups[groupIndexByName.get(sectionName)].items.push(line);
  }
  const anyHighlighted = !!diffInfo?.hasChanges && budgetDetailLines.some((line) => diffInfo.keys.has(lineDiffKeyForBudgetLine(line)));
  return (
    <Section title="Detalle del presupuesto">
      {!groups.length ? (
        <div className="caf-muted">Sin productos informados.</div>
      ) : (
        <div className="caf-items">
          {groups.map((group) => (
            <div key={group.sectionName} className="caf-budget-group">
              <div className="caf-budget-group-title">{group.sectionName}</div>
              {group.items.map((line) => {
                const changed = anyHighlighted && diffInfo.keys.has(lineDiffKeyForBudgetLine(line));
                return (
                  <div key={line.key} className={`caf-item-row${changed ? " caf-item-changed" : ""}`}>
                    <div className="caf-item-name">
                      {line.name}
                      {changed ? <span className="caf-changed-badge">Modificado</span> : null}
                    </div>
                    <div className="caf-muted">
                      Cantidad: {line.qty}
                      {line.code ? ` · Código: ${line.code}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      {anyHighlighted ? (
        <div className="caf-legend">Los ítems resaltados en verde difieren del presupuesto original a petición del cliente.</div>
      ) : null}
    </Section>
  );
}

function CancelledView({ quote }) {
  const sellerLabel = quote?.created_by_full_name || quote?.created_by_username || "";
  return (
    <div className="caf-root">
      <CafStyle />
      <div className="caf-wrap">
        <Section title="Cancelado">
          <div style={{ marginBottom: 4 }}>
            {quote?.final_sale_order_name || quote?.odoo_sale_order_name
              ? `El pedido ${quote.final_sale_order_name || quote.odoo_sale_order_name} fue cancelado.`
              : "Este pedido fue cancelado."}
          </div>
          <div className="caf-muted" style={{ marginTop: 10 }}>
            Por favor, pónganse en contacto con{" "}
            {sellerLabel ? `su vendedor/a (${sellerLabel}${quote?.created_by_phone ? `, ${quote.created_by_phone}` : ""})` : "su vendedor/a"} para más
            información.
          </div>
        </Section>
      </div>
    </div>
  );
}

function formatProductionWeekLine(planning) {
  if (!planning || typeof planning !== "object") return "";
  const weekNumber = String(planning.week_number || planning.week || "").trim();
  if (!weekNumber) return "";
  const startLabel = String(planning.start_date_label || "").trim();
  const endLabel = String(planning.end_date_label || "").trim();
  if (!startLabel && !endLabel) return `Semana ${weekNumber}`;
  return `Semana ${weekNumber}, desde ${startLabel || "—"} hasta ${endLabel || "—"}`;
}

// Mismo flujo de firma de siempre (nombre completo + DNI + terminos, mismo mutation
// acceptM) - solo cambia el envoltorio visual para que combine con las tarjetas nuevas.
function AcceptanceSection({
  kindLabel,
  accepted,
  productionPlanning,
  step,
  setStep,
  fullName,
  setFullName,
  dni,
  setDni,
  showTerms,
  setShowTerms,
  acceptM,
  submitError,
}) {
  return (
    <Section title="Aceptación del cliente">
      {productionPlanning ? (
        <div className="caf-production-note">
          {accepted?.accepted_at ? (
            <div>
              <span className="caf-muted">Fecha de finalización de producción estimada: </span>
              <b>{formatProductionWeekLine(productionPlanning)}</b>
            </div>
          ) : (
            <div className="caf-muted" style={{ fontSize: 12 }}>
              Disponibilidad actual: {formatProductionWeekLine(productionPlanning)} (se confirma al aceptar más abajo).
            </div>
          )}
        </div>
      ) : null}
      {accepted?.accepted_at ? (
        <>
          <div className="caf-accepted-note">La aceptación ya fue registrada correctamente.</div>
          <KvGrid>
            <Kv label="Nombre completo" value={accepted?.full_name} />
            <Kv label="DNI" value={accepted?.dni} />
            <Kv label="Fecha de aceptación" value={accepted?.accepted_at ? new Date(accepted.accepted_at).toLocaleString("es-AR", { hour12: false }) : ""} />
          </KvGrid>
        </>
      ) : (
        <div className="caf-accept-flow">
          {step === "initial" ? <Button onClick={() => setShowTerms(true)}>{`Acepto los datos técnicos ${kindLabel}`}</Button> : null}

          {step === "name" ? (
            <div className="caf-accept-step-row">
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="caf-muted" style={{ marginBottom: 6 }}>
                  Nombre completo
                </div>
                <Input value={fullName} onChange={setFullName} style={{ width: "100%" }} />
              </div>
              <Button
                onClick={() => {
                  if (!text(fullName)) {
                    window.alert("Ingresá tu nombre completo.");
                    return;
                  }
                  setStep("dni");
                }}
              >
                Continuar
              </Button>
            </div>
          ) : null}

          {step === "dni" ? (
            <>
              <div className="caf-accept-step-row">
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div className="caf-muted" style={{ marginBottom: 6 }}>
                    DNI
                  </div>
                  <Input value={dni} onChange={setDni} style={{ width: "100%" }} />
                </div>
                <Button
                  disabled={acceptM.isPending}
                  onClick={() => {
                    const cleanDni = String(dni || "").replace(/\D/g, "");
                    if (!cleanDni || cleanDni.length < 7) {
                      window.alert("Ingresá un DNI válido.");
                      return;
                    }
                    acceptM.mutate();
                  }}
                >
                  {acceptM.isPending ? "Registrando..." : "Confirmar aceptación"}
                </Button>
              </div>
              {submitError ? (
                <div style={{ color: "var(--dg-danger-text)", fontSize: 13, marginTop: 12 }}>{submitError}</div>
              ) : null}
            </>
          ) : null}

          {step === "done" && accepted?.accepted_at ? <div className="caf-accepted-note">La aceptación fue registrada correctamente.</div> : null}
        </div>
      )}

      <div style={{ textAlign: "center", padding: "8px 0 0" }}>
        <button type="button" className="caf-terms-link" onClick={() => setShowTerms(true)}>
          Ver términos y condiciones
        </button>
      </div>

      {showTerms && (
        <TermsModal
          onClose={() => setShowTerms(false)}
          onAccept={step === "initial" ? () => { setShowTerms(false); setStep("name"); } : undefined}
        />
      )}
    </Section>
  );
}

function CafStyle() {
  return (
    <style>{`
      .caf-root { font-family: inherit; }
      .caf-wrap { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; padding: 8px 0 24px; }
      .caf-nv-strip {
        background: radial-gradient(ellipse at center, #a9e3bb 0%, #e3f6e7 100%);
        border-radius: 16px; padding: 18px 20px; color: #0d3d22;
        display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
      }
      .caf-nv-label { font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(13,61,34,0.62); font-weight: 700; }
      .caf-nv-num { font-size: 28px; font-weight: 900; letter-spacing: 0.01em; color: #0d3d22; line-height: 1.15; margin-top: 4px; }
      .caf-nv-who { text-align: right; }
      .caf-nv-who .caf-nv-name { font-size: 15px; font-weight: 700; color: #0d3d22; }
      .caf-nv-who .caf-nv-sub { font-size: 12.5px; color: rgba(13,61,34,0.62); margin-top: 2px; }
      :root[data-theme="dark"] .caf-nv-strip { background: radial-gradient(ellipse at center, #1d4a31 0%, var(--dg-success-bg) 100%); color: var(--dg-success-text); }
      :root[data-theme="dark"] .caf-nv-num, :root[data-theme="dark"] .caf-nv-who .caf-nv-name { color: var(--dg-success-text); }
      :root[data-theme="dark"] .caf-nv-label, :root[data-theme="dark"] .caf-nv-who .caf-nv-sub { color: var(--dg-text-soft); }
      .caf-card { background: var(--dg-card); border: 1px solid var(--dg-border); border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(15,23,42,0.04); }
      .caf-card-head { padding: 14px 18px 6px; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
      .caf-card-head h2 { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--dg-success-text); }
      .caf-tag { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--dg-accent-text); background: rgba(14,122,111,0.1); border-radius: 999px; padding: 3px 9px; white-space: nowrap; }
      .caf-card-body { padding: 6px 18px 18px; }
      .caf-kv-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
      .caf-kv { background: var(--dg-surface-2); border: 1px solid var(--dg-border); border-radius: 10px; padding: 9px 11px; text-align: center; }
      .caf-kv-k { font-size: 10.5px; letter-spacing: 0.04em; text-transform: uppercase; color: #6b7280; font-weight: 600; }
      .caf-kv-v { font-size: 14px; font-weight: 600; margin-top: 3px; word-break: break-word; }
      .caf-kv-v a { color: var(--dg-accent-text); }
      .caf-muted { color: #6b7280; }
      :root[data-theme="dark"] .caf-kv-k, :root[data-theme="dark"] .caf-muted { color: var(--dg-muted); }
      .caf-scheme-box { border: 1px dashed var(--dg-border); border-radius: 14px; background: var(--dg-card); padding: 14px; }
      .caf-scheme-wrap { width: 100%; margin: 0 auto; }
      .caf-scheme-wrap svg { width: 100%; height: auto; display: block; }
      .caf-panel-label { font-weight: 800; fill: var(--dg-text); }
      .caf-scheme-caption { font-size: 11px; color: var(--dg-muted); margin-top: 8px; text-align: center; }
      .caf-items { display: flex; flex-direction: column; gap: 16px; }
      .caf-budget-group { border: 3px dotted var(--dg-text); border-radius: 12px; padding: 12px 14px; }
      .caf-budget-group-title { font-weight: 800; color: var(--dg-success-text); font-size: 13px; margin-bottom: 6px; }
      .caf-item-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 8px 10px; border-bottom: 1px solid var(--dg-border-soft); border-radius: 8px; }
      .caf-item-row:last-child { border-bottom: none; }
      .caf-item-name { font-weight: 700; }
      .caf-item-changed { background: var(--dg-success-bg); border: 1px solid var(--dg-success-border); }
      .caf-changed-badge { display: inline-block; margin-left: 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--dg-text); background: var(--dg-success-border); border-radius: 999px; padding: 2px 7px; }
      .caf-legend { margin-top: 12px; font-size: 12px; color: var(--dg-success-text); background: var(--dg-success-bg); border: 1px solid var(--dg-success-border); border-radius: 10px; padding: 8px 12px; }
      .caf-production-note { background: var(--dg-info-bg); border: 1px solid var(--dg-info-border); border-radius: 10px; padding: 12px; margin-bottom: 16px; }
      .caf-accepted-note { color: var(--dg-success-text); font-weight: 800; margin-bottom: 12px; }
      .caf-accept-step-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
      .caf-terms-link { background: none; border: none; cursor: pointer; color: var(--dg-muted); font-size: 13px; text-decoration: underline; }
      @media (max-width: 480px) {
        .caf-item-row { flex-direction: column; gap: 3px; }
      }
    `}</style>
  );
}

export function NewFormatAcceptance({
  quote,
  form,
  catalogKind,
  budgetTechnicalRows,
  budgetDetailLines,
  accepted,
  productionPlanning,
  step,
  setStep,
  fullName,
  setFullName,
  dni,
  setDni,
  showTerms,
  setShowTerms,
  acceptM,
  submitError,
}) {
  if (quote?.cancelled_at) return <CancelledView quote={quote} />;

  const diffInfo = computeLineDiffInfo(quote);
  const kindLabel = catalogKind === "ipanel" ? "del Ipanel" : catalogKind === "puerta" ? "de la Puerta" : "del Portón";
  const technicalTitle = catalogKind === "ipanel" ? "Datos técnicos del Ipanel a fabricar" : "Datos técnicos de la Puerta a fabricar";

  return (
    <div className="caf-root">
      <CafStyle />
      <div className="caf-wrap">
        <NvStrip quote={quote} />
        <ClientDataSection quote={quote} />

        {catalogKind === "porton" ? (
          <>
            <PortonMeasurementSection quote={quote} form={form} />
            <PortonTechnicalSection budgetTechnicalRows={budgetTechnicalRows} />
            <ParantesSchemeSection quote={quote} />
          </>
        ) : null}

        {catalogKind === "ipanel" ? (
          <>
            <SimpleTechnicalSection quote={quote} title={technicalTitle} />
            <IpanelSchemeSection quote={quote} />
          </>
        ) : null}

        {catalogKind === "puerta" ? (
          <>
            <PuertaMeasurementSection quote={quote} form={form} />
            <SimpleTechnicalSection quote={quote} title={technicalTitle} />
            <PuertaPanelSchemeSection quote={quote} configKey="exterior" />
            <PuertaPanelSchemeSection quote={quote} configKey="interior" />
          </>
        ) : null}

        <BudgetDetailSection budgetDetailLines={budgetDetailLines} diffInfo={diffInfo} />

        <AcceptanceSection
          kindLabel={kindLabel}
          accepted={accepted}
          productionPlanning={productionPlanning}
          step={step}
          setStep={setStep}
          fullName={fullName}
          setFullName={setFullName}
          dni={dni}
          setDni={setDni}
          showTerms={showTerms}
          setShowTerms={setShowTerms}
          acceptM={acceptM}
          submitError={submitError}
        />
      </div>
    </div>
  );
}

export default NewFormatAcceptance;
