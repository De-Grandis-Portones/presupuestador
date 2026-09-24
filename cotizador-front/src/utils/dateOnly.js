// Columnas DATE de Postgres (fecha sin hora, ej. measurement_scheduled_for).
// El backend las serializa como "2026-09-26T00:00:00.000Z" (medianoche UTC), y
// new Date(...) en Argentina (UTC-3) las muestra como el día anterior. Acá se
// toma la parte YYYY-MM-DD tal cual, sin pasar por zona horaria.

// "2026-09-26" | "2026-09-26T00:00:00.000Z" -> "2026-09-26" (sirve para <input type="date">)
export function dateOnlyIso(value) {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(value || "").trim());
  return m ? m[1] : "";
}

// Misma fecha como Date a medianoche local, para formatear u ordenar.
export function parseDateOnly(value) {
  const iso = dateOnlyIso(value);
  return iso ? new Date(`${iso}T00:00:00`) : null;
}
