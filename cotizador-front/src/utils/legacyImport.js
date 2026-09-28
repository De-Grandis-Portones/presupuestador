// Portones migrados del sistema anterior (ver cotizador-back/src/legacyImport.js):
// ya vendidos y facturados allá, nunca pasan por Odoo ni por medición. En el front
// solo se muestran (ficha técnica de solo lectura) y se puede pedir el paso a producción.

export function isLegacyImport(quote) {
  const payload = quote?.payload ?? quote?.raw?.payload;
  if (!payload) return false;
  if (typeof payload === "string") {
    try { return JSON.parse(payload)?.legacy_import === true; } catch { return false; }
  }
  return payload.legacy_import === true;
}

export function legacyImportLabel(quote) {
  const ref = quote?.odoo_sale_order_name || quote?.raw?.odoo_sale_order_name || "";
  return ref ? `Sistema anterior · ${ref}` : "Sistema anterior";
}
