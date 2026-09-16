/**
 * PATCH ONE-TIME: Generar la NV real de INP4245 (Ipanel, Exin SRL)
 *
 * Contexto: INP4245 (id 04efc0df-609e-4e69-826b-8522e6fa2fc8, quote_number 6522)
 * nunca generó su NV real - cayó en el bug ya documentado en quotesSchema.js
 * (UPDATE masivo que marcaba Ipanels como synced_odoo sin llamar nunca a Odoo,
 * activo hasta 2026-08-20). final_sale_order_id/name quedaron como una copia
 * literal de la NP (mismo id 3945, nombre "INP4245"), nunca se creó una NV
 * separada.
 *
 * Además, a pedido explícito del cliente (conversación 2026-09-16): esta NV
 * puntual debe facturar un monto acordado con Exin SRL que incluye otros
 * servicios hechos fuera del presupuestador, no el cálculo automático de
 * líneas (que da ~$0 porque el anticipo ya cargado casi cubre el total
 * calculado del Ipanel solo). Monto objetivo con IVA incluido: $2.833.891,78
 * (neto $2.342.059,32 + 21% IVA), partner Odoo 4351 (Exin S.R.L, mismo
 * partner que ya tiene la NP, verificado contra Odoo de producción
 * 2026-09-16).
 *
 * Efecto de este patch:
 *  - Crea una sale.order NUEVA en Odoo (protegida contra duplicados: si ya
 *    existe una orden con origin="INV4245" no crea otra, devuelve esa).
 *  - Actualiza presupuestador_quotes: bill_to_odoo_partner_id, final_sale_order_id,
 *    final_sale_order_name, final_status, final_synced_at.
 *
 * Uso: node src/patches/fixInp4245ExinSrlNv.js
 */

import "dotenv/config";
import { dbQuery, getPool } from "../db.js";
import { createOdooClient } from "../odoo.js";
import { forceCreateIpanelAdjustmentNv } from "../measurementFinalization.js";

const QUOTE_ID = "04efc0df-609e-4e69-826b-8522e6fa2fc8";
const PARTNER_ID = 4351; // Exin S.R.L
const NETO_AMOUNT = 2342059.32; // -> $2.833.891,78 con 21% IVA
const LINE_LABEL = "Ipanel + servicios adicionales - Exin SRL";

async function run() {
  const check = await dbQuery(
    `select id, quote_number, catalog_kind, odoo_sale_order_id, odoo_sale_order_name,
            final_sale_order_id, final_sale_order_name, final_status, bill_to_odoo_partner_id
       from public.presupuestador_quotes
      where id = $1`,
    [QUOTE_ID]
  );
  const row = check.rows?.[0];
  if (!row) {
    console.error("[fixInp4245] ERROR: no se encontró la quote", QUOTE_ID);
    process.exit(1);
  }
  console.log("[fixInp4245] Estado actual:", row);

  if (row.odoo_sale_order_name !== "INP4245" || Number(row.odoo_sale_order_id) !== 3945) {
    console.error("[fixInp4245] ERROR: el estado de la fila no coincide con lo investigado (odoo_sale_order_name/id). Abortar y revisar a mano.");
    process.exit(1);
  }
  if (Number(row.final_sale_order_id) !== Number(row.odoo_sale_order_id)) {
    console.error("[fixInp4245] ERROR: final_sale_order_id ya no es igual a odoo_sale_order_id - parece que esto ya se resolvió o cambió. Abortar.");
    process.exit(1);
  }

  const odoo = createOdooClient({
    url: process.env.ODOO_URL,
    db: process.env.ODOO_DB,
    username: process.env.ODOO_USERNAME,
    password: process.env.ODOO_PASSWORD,
    companyId: process.env.ODOO_COMPANY_ID,
  });

  const result = await forceCreateIpanelAdjustmentNv({
    odoo,
    quoteId: QUOTE_ID,
    partnerId: PARTNER_ID,
    netoAmount: NETO_AMOUNT,
    lineLabel: LINE_LABEL,
  });

  console.log("[fixInp4245] Orden en Odoo:", result.order);
  console.log("[fixInp4245] Fila actualizada:", result.dbRow);

  await getPool().end();
}

run().catch((err) => {
  console.error("[fixInp4245] Error inesperado:", err);
  process.exit(1);
});
