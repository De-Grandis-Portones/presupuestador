import { dbQuery } from "./db.js";
import { captureQuotedProductionEstimate, commitQuoteProductionWeek } from "./productionPlanning.js";

// Portones migrados del sistema anterior (SQL Server "Portones"/"WebApp", dado de
// baja en 2026-09). Se vendieron y facturaron completos en ese sistema y quedaron en
// acopio: se cargaron acá (scripts/import_legacy_acopio_2026-09.mjs) solo para que
// el dueño pueda pedir el paso a producción y lleguen a Planta con su ficha técnica.
//
// Regla: un portón migrado NUNCA escribe en Odoo (ni NP, ni NV, ni partner, ni copia
// final) ni dispara medición / WhatsApp / link de aceptación al cliente. Al aprobarse
// el paso a producción va directo a preproduccion_valores con la ficha del sistema
// anterior. Marca: payload.legacy_import = true; ficha en payload.legacy_ficha.

export function isLegacyImport(quote) {
  const payload = quote?.payload;
  if (!payload) return false;
  if (typeof payload === "string") {
    try { return JSON.parse(payload)?.legacy_import === true; } catch { return false; }
  }
  return payload.legacy_import === true;
}

export function legacyImportError(action) {
  const err = new Error(`Portón migrado del sistema anterior: no se puede ${action}. Ya fue vendido y facturado en ese sistema.`);
  err.status = 409;
  return err;
}

export function assertNotLegacyImport(quote, action) {
  if (isLegacyImport(quote)) throw legacyImportError(action);
}

// Mismos guards del where que finalizeAcopioToProduccionIfReady, pero directo a
// producción: sin medición y con la "NV" ya resuelta (es el número del sistema
// anterior, guardado en odoo_sale_order_name). final_sale_order_id queda en null a
// propósito: nunca hubo orden en Odoo.
export async function finalizeLegacyAcopioToProduccion(id) {
  const upd = await dbQuery(
    `update public.presupuestador_quotes
        set fulfillment_mode='produccion',
            acopio_to_produccion_status='approved',
            requires_measurement=false,
            measurement_mode='medidor',
            measurement_subtype='normal',
            measurement_status='approved',
            measurement_review_at=now(),
            final_status='synced_odoo',
            final_sale_order_name=odoo_sale_order_name,
            final_synced_at=now(),
            production_set_at=now()
      where id=$1
        and fulfillment_mode='acopio'
        and acopio_to_produccion_status='pending'
        and acopio_to_produccion_commercial_decision='approved'
        and acopio_to_produccion_technical_decision='approved'
        and payload->>'legacy_import' = 'true'
      returning *`,
    [id]
  );
  return upd.rows?.[0] || null;
}

// Lo que corre después de finalizeLegacyAcopioToProduccion, en vez del circuito
// normal (copia final + NV en Odoo). La reserva de semana es la misma que un portón
// nuevo pero no bloquea: el portón ya está vendido, si no hay cupo configurado se
// pasa igual a Planta.
export async function completeLegacyAcopioToProduccion(id) {
  try { await captureQuotedProductionEstimate(id); } catch (e) { console.error("LEGACY QUOTED ESTIMATE ERROR:", e?.message || e); }
  try { await commitQuoteProductionWeek(id); } catch (e) { console.error("LEGACY PRODUCTION WEEK ERROR:", e?.message || e); }
  const quote = (await dbQuery(`select * from public.presupuestador_quotes where id=$1`, [id])).rows?.[0] || null;
  if (quote) {
    try { await upsertLegacyPreproduccionValores(quote); } catch (e) { console.error("LEGACY PREPRODUCCION ERROR:", e?.message || e); }
  }
  return quote;
}

function slug(text) {
  return String(text || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function mmString(meters) {
  const n = Number(meters);
  return Number.isFinite(n) && n > 0 ? String(Math.round(n * 1000)) : null;
}

function legacyNvNumber(quote) {
  const m = String(quote?.odoo_sale_order_name || "").match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function formatQty(q) {
  const n = Number(q);
  if (!Number.isFinite(n) || n === 1) return "";
  return ` (x${n.toLocaleString("es-AR")})`;
}

// Fila de preproduccion_valores con las claves planas que lee Planta (/a y el
// tablero), mismo formato que los portones del sistema anterior que cargaba el
// Integrador: Sistema con la descripción vieja, medidas en mm como los nuevos, y
// cada rubro de la ficha también como section__<rubro> (como los del Presupuestador).
export function buildLegacyPreproduccionData(quote) {
  const ficha = quote?.payload?.legacy_ficha || {};
  const opciones = Array.isArray(ficha.opciones) ? ficha.opciones : [];
  const nv = legacyNvNumber(quote);
  const color = opciones.find((o) => /COLOR/i.test(String(o?.titulo || "")));
  const sections = {};
  for (const o of opciones) {
    const key = slug(o?.titulo || o?.rubro);
    if (key && !(`section__${key}` in sections)) sections[`section__${key}`] = o?.descripcion || o?.codigo || null;
  }
  const observacion = [
    "PORTÓN MIGRADO DEL SISTEMA ANTERIOR (sin NV en Odoo).",
    ...opciones.map((o) => `${o?.titulo || `Rubro ${o?.rubro || "?"}`}: ${o?.descripcion || o?.codigo || ""}${formatQty(o?.cantidad)}`),
    ficha.observaciones ? `Obs.: ${ficha.observaciones}` : null,
  ].filter(Boolean).join("\n");
  const ec = quote?.end_customer || {};
  return {
    NV: nv,
    nv,
    referencia_nv: quote?.odoo_sale_order_name || null,
    Nombre: ficha.cliente_final || ec.name || null,
    RazSoc: ficha.razon_social || null,
    Direccion: ec.address || null,
    Fecha_NV: ficha.fecha_nv || null,
    fecha_nv: ficha.fecha_nv || null,
    Sistema: ficha.sistema || null,
    ID_Sistema: ficha.sistema_codigo != null && ficha.sistema_codigo !== "" ? Number(ficha.sistema_codigo) : null,
    Ancho: mmString(ficha.ancho),
    Alto: mmString(ficha.alto),
    Color: color?.descripcion || null,
    catalog_kind: "porton",
    fulfillment_mode: "produccion",
    cliente_nombre: ec.name || null,
    cliente_telefono: ec.phone || null,
    cliente_direccion: ec.address || null,
    cliente_localidad: ec.city || null,
    ...sections,
    observacion_imput: observacion,
    legacy_import: true,
    legacy_ficha: ficha,
  };
}

export function buildLegacyNvLines(quote) {
  const opciones = quote?.payload?.legacy_ficha?.opciones;
  return (Array.isArray(opciones) ? opciones : []).map((o) => ({
    name: o?.titulo ? `${o.titulo}: ${o?.descripcion || o?.codigo || ""}` : (o?.descripcion || o?.codigo || ""),
    raw_name: o?.codigo || "",
    qty: Number(o?.cantidad || 0) || 0,
  }));
}

// Nunca pisa una fila existente de ese NV (si ya hay algo cargado en Planta para ese
// número, se deja como está y se avisa en el log).
export async function upsertLegacyPreproduccionValores(quote) {
  if (!isLegacyImport(quote)) return { ok: false, skipped: true, reason: "not_legacy" };
  const nv = legacyNvNumber(quote);
  if (!nv) return { ok: false, skipped: true, reason: "missing_nv" };
  const q = await dbQuery(
    `insert into public.preproduccion_valores (nv, nv_tipo, data, nv_lines)
     values ($1, 'NV', $2::jsonb, $3::jsonb)
     on conflict (nv, nv_tipo) do nothing
     returning id, nv, nv_tipo, updated_at`,
    [nv, JSON.stringify(buildLegacyPreproduccionData(quote)), JSON.stringify(buildLegacyNvLines(quote))]
  );
  if (!q.rows?.[0]) {
    console.warn(`[legacy-import] preproduccion_valores NV${nv} ya existía: no se modificó.`);
    return { ok: true, skipped: true, reason: "already_exists", nv, nv_tipo: "NV" };
  }
  return { ok: true, ...q.rows[0] };
}
