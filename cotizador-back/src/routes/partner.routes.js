// API de partner: pensada para que el sistema de un distribuidor externo pida
// precios "iguales a lo que hace un distribuidor acá" sin loguearse como
// usuario y sin tener que reimplementar nuestras reglas de catálogo/precio.
//
// A propósito NO expone el mismo shape que /api/catalog o /api/quotes (esos son
// internos, para nuestro propio frontend): esta es una superficie chica y
// versionada aparte (/api/partner/v1) para que un cambio interno de catálogo no
// le rompa la integración a un tercero. Todo el cálculo de precio (lista de
// Odoo del distribuidor, margen, forma de pago, condición de IVA) se resuelve
// acá - el cliente externo solo manda qué productos y cantidades eligió.
import express from "express";
import { partnerRateLimit, requirePartnerApiKey } from "../partnerAuth.js";
import { loadCatalogBootstrap } from "../catalogBootstrap.js";
import { normKind } from "../catalogDb.js";
import { getPriceFromPricelist, resolveProductInfoForPricing } from "./odoo.routes.js";
import { IVA_RATE, round2, createOriginalQuote } from "./quotes.routes.js";
import { getTechnicalMeasurementRules } from "../settingsDb.js";
import { dbQuery } from "../db.js";

const MAX_ITEMS_PER_REQUEST = 50;
const CONDITION_2_IVA_RATE = 0.105;

function publicCatalogProduct(p) {
  return {
    id: Number(p.id),
    name: p.display_name || p.original_name || null,
    sections: Array.isArray(p.sections) ? p.sections : [],
    // IDs numéricos de sección (coinciden con sections[].id de esta misma respuesta y con
    // parent_section_id/child_section_ids de GET /rules) - sin esto, un consumidor externo
    // solo tiene el NOMBRE de sección por producto y no puede cruzarlo de forma confiable
    // contra las reglas de dependencia, que son por id.
    section_ids: Array.isArray(p.section_ids) ? p.section_ids.map(Number) : [],
  };
}

// Mismo cálculo que ve un distribuidor logueado en el cotizador propio (ver
// calcFinalUnitPrice/calcTotals en cotizador-front/src/domain/quote/pricing.js):
// precio base de Odoo, con margen y recargo/descuento por forma de pago
// aplicados como coeficientes, y el IVA aparte según la condición.
function calcPartnerUnitPrice(basePrice, marginPercent, adjustmentPercent) {
  const base = Number(basePrice || 0);
  const marginFactor = 1 + Number(marginPercent || 0) / 100;
  const adjustmentFactor = 1 + Number(adjustmentPercent || 0) / 100;
  return round2(base * marginFactor * adjustmentFactor);
}

// Fecha de llegada/instalación de un NV puntual: es la fecha de la etapa
// "despacho" (public.porton_etapas_tiempos - Planta), que es la que hay que
// considerar como fecha de entrega según De Grandis. portones.fecha_plan_entrega
// (cuándo Logística programó el viaje) es solo el respaldo mientras el
// despacho todavía no arrancó - portones.despacho_inicio/despacho_fin NO se
// usan porque son columnas legacy que quedan sin sincronizar (mismo problema
// que fecha_med, ver fetchMeasurementDate).
//
// A propósito NO se verifica que el NV pertenezca al distribuidor de esta API
// key: NVs viejos ya no tienen fila viva en presupuestador_quotes (de donde
// sale el dueño) pero sí siguen en Planta, y confirmado con De Grandis que
// para esta info (solo fechas, sin precio ni datos de cliente) el riesgo de
// exponer el NV de otro distribuidor es aceptable. Si esto cambia, hay que
// cruzar contra presupuestador_quotes.bill_to_odoo_partner_id.
async function fetchInstallationDate(nv) {
  const r = await dbQuery(
    `select to_char(coalesce(et.fin, et.inicio), 'YYYY-MM-DD') as fecha_despacho,
            to_char(p.fecha_plan_entrega, 'YYYY-MM-DD') as fecha_plan_entrega
       from public.portones p
       left join public.porton_etapas_tiempos et on et.porton_id = p.id and et.etapa = 'despacho'
      where p.nv = $1
      order by p.created_at desc
      limit 1`,
    [nv]
  );
  const row = r.rows?.[0];
  return row?.fecha_despacho || row?.fecha_plan_entrega || null;
}

// Fecha de medición: NO viene de Planta (portones.fecha_med) - probado contra
// datos reales, esa columna queda en null en filas de Planta que todavía no
// sincronizaron el dato aunque la medición ya esté hecha (caso real: NV 4270,
// medido 20/07/2026 según presupuestador_quotes, portones.fecha_med en null).
// La fuente confiable es presupuestador_quotes: measurement_at si ya se
// realizó, si no measurement_scheduled_for (programada pero pendiente). Estos
// campos viven en la fila 'original' del quote, no en la 'copy' que lleva el
// NV final, así que se matchea por el número de NV/NP contra cualquiera de
// los dos nombres de esa fila original.
async function fetchMeasurementDate(nv) {
  const r = await dbQuery(
    `select to_char(measurement_at, 'YYYY-MM-DD') as fecha_realizada,
            to_char(measurement_scheduled_for, 'YYYY-MM-DD') as fecha_programada
       from public.presupuestador_quotes
      where quote_kind = 'original'
        and (
          regexp_replace(coalesce(odoo_sale_order_name, ''), '\\D', '', 'g') = $1
          or regexp_replace(coalesce(final_sale_order_name, ''), '\\D', '', 'g') = $1
        )
      order by updated_at desc nulls last, id desc
      limit 1`,
    [String(nv)]
  );
  const row = r.rows?.[0];
  return row?.fecha_realizada || row?.fecha_programada || null;
}

async function fetchOrderDates(nv) {
  const [fecha_llegada_instalacion, fecha_medicion] = await Promise.all([
    fetchInstallationDate(nv),
    fetchMeasurementDate(nv),
  ]);
  return { fecha_llegada_instalacion, fecha_medicion };
}

function parsePartnerItems(items) {
  const parsedItems = (Array.isArray(items) ? items : []).map((item) => ({
    productId: Number(item?.product_id || 0),
    qty: Number(item?.qty || 1) || 0,
    raw: item,
  }));
  const invalid = parsedItems.find((it) => !it.productId || it.qty <= 0);
  if (invalid) {
    const err = new Error(`item inválido (falta product_id o qty): ${JSON.stringify(invalid.raw)}`);
    err.status = 400;
    throw err;
  }
  return parsedItems;
}

// Usado tanto por POST /price (cotizar) como por POST /quotes (cotizar + guardar): mismo
// camino de precio que el cotizador interno (getPriceFromPricelist por product.pricelist.item
// de Odoo), todos los items en paralelo. Devuelve además name/code/odoo_template_id de cada
// producto para que /quotes pueda armar la línea del presupuesto sin volver a pedirle a Odoo.
async function resolvePartnerLines({ odoo, distributor, items, marginPercent, adjustmentPercent }) {
  const parsedItems = parsePartnerItems(items);
  return Promise.all(parsedItems.map(async ({ productId, qty }) => {
    const productInfo = await resolveProductInfoForPricing(odoo, { product_id: productId });
    const price = await getPriceFromPricelist({
      odoo,
      pricelistId: distributor.odoo_pricelist_id,
      productId,
      qty,
      partnerId: distributor.odoo_partner_id || false,
      templateId: productInfo.odoo_template_id || null,
    });
    const basePrice = price > 0 ? price : productInfo.list_price;
    const unitPrice = calcPartnerUnitPrice(basePrice, marginPercent, adjustmentPercent);
    return {
      product_id: productId,
      qty,
      base_price: round2(basePrice),
      unit_price: unitPrice,
      line_total: round2(unitPrice * qty),
      name: productInfo.name || null,
      code: productInfo.code || null,
      odoo_template_id: productInfo.odoo_template_id || null,
    };
  }));
}

export function buildPartnerRouter(odoo) {
  const router = express.Router();
  router.use(partnerRateLimit, requirePartnerApiKey);

  router.get("/catalog", async (req, res, next) => {
    try {
      const kind = normKind(req.query.kind || "porton");
      const data = await loadCatalogBootstrap(odoo, kind);
      const products = (Array.isArray(data.products) ? data.products : [])
        .filter((p) => !p.disable_for_distribuidor)
        .map(publicCatalogProduct);
      res.json({
        ok: true,
        kind,
        sections: (data.sections || []).map((s) => ({ id: s.id, name: s.name })),
        products,
      });
    } catch (e) { next(e); }
  });

  router.post("/price", async (req, res, next) => {
    try {
      const distributor = req.partnerDistributor;
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return res.status(400).json({ ok: false, error: "items vacío" });
      if (items.length > MAX_ITEMS_PER_REQUEST) {
        return res.status(400).json({ ok: false, error: `No se pueden cotizar más de ${MAX_ITEMS_PER_REQUEST} ítems por request` });
      }

      const marginPercent = Number(body.margin_percent || 0) || 0;
      const adjustmentPercent = Number(body.adjustment_percent || 0) || 0;
      const conditionMode = String(body.condition_mode || "cond1").trim().toLowerCase() === "cond2" ? "cond2" : "cond1";

      // Mismo camino que /api/odoo/prices (cotizador interno): resuelve por las
      // reglas de product.pricelist.item de Odoo, y todos los items en paralelo -
      // antes esto pedia el precio uno por uno, en serie, con hasta 8 intentos de
      // metodos de Odoo por producto (el motivo real de la demora reportada antes
      // con este mismo patron en el cotizador interno, ver getPrices en
      // odoo.routes.js).
      const resolvedLines = await resolvePartnerLines({ odoo, distributor, items, marginPercent, adjustmentPercent });
      // El shape público de /price no incluye name/code/odoo_template_id (esos solo los
      // necesita /quotes para armar la línea del presupuesto) - no romper el contrato externo.
      const lines = resolvedLines.map(({ product_id, qty, base_price, unit_price, line_total }) => ({ product_id, qty, base_price, unit_price, line_total }));

      const subtotal = round2(lines.reduce((acc, l) => acc + l.line_total, 0));
      const ivaRate = conditionMode === "cond2" ? CONDITION_2_IVA_RATE : IVA_RATE;
      const iva = round2(subtotal * ivaRate);
      const total = round2(subtotal + iva);

      // nv es opcional: si el pedido ya tiene un NV asignado (orden ya en
      // producción), se informan sus fechas junto con el precio en la misma
      // respuesta - ver fetchOrderDates.
      const nv = Number(body.nv || 0);
      const orderDates = nv > 0 ? await fetchOrderDates(nv) : { fecha_llegada_instalacion: null, fecha_medicion: null };

      res.json({
        ok: true,
        distributor: { id: distributor.id, name: distributor.full_name },
        condition_mode: conditionMode,
        margin_percent: marginPercent,
        adjustment_percent: adjustmentPercent,
        lines,
        subtotal,
        iva_rate: ivaRate,
        iva,
        total,
        nv: nv > 0 ? nv : null,
        fecha_llegada_instalacion: orderDates.fecha_llegada_instalacion,
        fecha_medicion: orderDates.fecha_medicion,
      });
    } catch (e) { next(e); }
  });

  // "Dependencias" del catálogo: qué sección se habilita según lo que ya se eligió en otra
  // (section_dependency_rules) y qué porton_type corresponde a una combinación de productos
  // (system_derivation_rules) - mismas reglas que arma el dashboard admin
  // (SuperuserMeasurementRulesPage) y consume nuestro propio cotizador
  // (SectionCatalog.jsx vía GET /api/admin/technical-measurement-rules). Son puramente
  // estructurales (no dependen de margen/IVA/forma de pago), así que se exponen tal cual.
  // A propósito NO se manda surface_calc_params/parantes_config/rules de medición técnica:
  // eso sigue siendo interno (ver partnerAuth.js y la decisión original de esta API).
  router.get("/rules", async (req, res, next) => {
    try {
      const kind = normKind(req.query.kind || "porton");
      const rules = await getTechnicalMeasurementRules(kind);
      res.json({
        ok: true,
        kind,
        initial_section_id: rules?.initial_section_id ?? null,
        section_dependency_rules: rules?.section_dependency_rules || [],
        system_derivation_rules: rules?.system_derivation_rules || [],
      });
    } catch (e) { next(e); }
  });

  // Guarda el presupuesto que el distribuidor ya armó en su propia app (cliente + items
  // elegidos) como un presupuesto real, del lado de De Grandis, para que el equipo lo
  // gestione desde acá (revisión técnica/comercial, medición, link de confirmación al
  // cliente) igual que cualquier presupuesto que un distribuidor carga a mano en el
  // cotizador. Reusa createOriginalQuote (quotes.routes.js) para no duplicar el INSERT ni la
  // lógica de measurement flow / envio_odoo_price_snapshot.
  router.post("/quotes", async (req, res, next) => {
    try {
      const distributor = req.partnerDistributor;
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) return res.status(400).json({ ok: false, error: "items vacío" });
      if (items.length > MAX_ITEMS_PER_REQUEST) {
        return res.status(400).json({ ok: false, error: `No se pueden cotizar más de ${MAX_ITEMS_PER_REQUEST} ítems por request` });
      }

      const marginPercent = Number(body.margin_percent || 0) || 0;
      const adjustmentPercent = Number(body.adjustment_percent || 0) || 0;
      const conditionMode = String(body.condition_mode || "cond1").trim().toLowerCase() === "cond2" ? "cond2" : "cond1";

      const pricedLines = await resolvePartnerLines({ odoo, distributor, items, marginPercent, adjustmentPercent });
      const subtotal = round2(pricedLines.reduce((acc, l) => acc + l.line_total, 0));
      const ivaRate = conditionMode === "cond2" ? CONDITION_2_IVA_RATE : IVA_RATE;
      const iva = round2(subtotal * ivaRate);
      const total = round2(subtotal + iva);

      // Mismo shape que arma buildPayloadForBack() en el frontend (store.js) para una línea
      // ya cotizada: basePrice resuelto, price_resolved:true/price_pending:false para que no
      // quede bloqueada como "precio pendiente" en el dashboard interno.
      const lines = pricedLines.map((l) => ({
        product_id: l.product_id,
        qty: l.qty,
        basePrice: l.unit_price,
        name: l.name || null,
        raw_name: l.name || null,
        code: l.code || null,
        odoo_template_id: l.odoo_template_id || null,
        price_resolved: true,
        price_pending: false,
        price_pricelist_id: distributor.odoo_pricelist_id,
      }));

      const note = ["Creado vía API partner", distributor.full_name, body.note ? String(body.note).trim() : null]
        .filter(Boolean)
        .join(" - ");

      const quote = await createOriginalQuote({
        odoo,
        body: {
          created_by_role: "distribuidor",
          catalog_kind: body.catalog_kind,
          fulfillment_mode: body.fulfillment_mode,
          pricelist_id: distributor.odoo_pricelist_id,
          bill_to_odoo_partner_id: distributor.odoo_partner_id,
          end_customer: body.end_customer || {},
          lines,
          note,
          payload: {
            margin_percent_ui: marginPercent,
            condition_mode: conditionMode,
            porton_type: body.porton_type || "",
            dimensions: body.dimensions || {},
          },
        },
        userId: distributor.id,
        isDistribuidorUser: true,
        userOdooPartnerId: distributor.odoo_partner_id,
      });

      res.json({
        ok: true,
        quote_id: quote.id,
        status: quote.status,
        subtotal,
        iva_rate: ivaRate,
        iva,
        total,
      });
    } catch (e) { next(e); }
  });

  return router;
}
