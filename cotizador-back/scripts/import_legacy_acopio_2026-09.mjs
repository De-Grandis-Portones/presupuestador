// Importa al Presupuestador los 33 portones que quedaron EN ACOPIO en el sistema
// anterior (SQL Server "Portones"/"WebApp", dado de baja en 2026-09). Ver
// src/legacyImport.js: quedan marcados con payload.legacy_import=true, nunca pasan
// por Odoo ni por medición, y al aprobarse el paso a producción van directo a Planta
// con su ficha técnica del sistema anterior.
//
// Fuente: respaldo del SQL Server hecho el 2026-09-28 (carpeta "BackUp Portones Table"):
//   fichas_tecnicas_33_nv_acopio.json            ficha armada por NV (pedido web + líneas de la NV)
//   sqlserver_2026-09-28/WebApp.SisRubro.json    títulos de rubro (para el NV sin pedido)
//   sqlserver_2026-09-28/Portones.RUBROS.json
//
// Uso (DATABASE_URL en el entorno, igual que el backend):
//   node scripts/import_legacy_acopio_2026-09.mjs --backup-dir "<ruta a BackUp Portones Table>"          (dry-run)
//   node scripts/import_legacy_acopio_2026-09.mjs --backup-dir "<...>" --apply                           (inserta)
//   node scripts/import_legacy_acopio_2026-09.mjs --backup-dir "<...>" --only 4209 --json                (ver una ficha)
// Idempotente: si ya existe un portón migrado con ese NV no se vuelve a insertar.

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getPool } from "../src/db.js";

dotenv.config();

const args = process.argv.slice(2);
const argValue = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const APPLY = args.includes("--apply");
const AS_JSON = args.includes("--json");
const ONLY = (argValue("--only") || "").split(",").map((s) => Number(s.trim())).filter(Boolean);
const BACKUP_DIR = argValue("--backup-dir");
if (!BACKUP_DIR) { console.error("Falta --backup-dir"); process.exit(1); }

// Dueño y localidad del cliente según el listado del usuario (2026-09-28). Los de
// "DE GRANDIS PORTONES" (vendidos por vendedores) quedan en el Enc. Comercial.
const ENC_COMERCIAL = { user_id: 6, role: "vendedor", check: /marcelo|comercial1/i };
const DIST = {
  WINDOOR: { user_id: 164, role: "distribuidor", check: /windoor/i },
  SELEC: { user_id: 163, role: "distribuidor", check: /selec/i },
  PAMPEANAS: { user_id: 128, role: "distribuidor", check: /pampean/i },
  EXPOLEGNO: { user_id: 57, role: "distribuidor", check: /legno/i },
  QCERO: { user_id: 50, role: "distribuidor", check: /q ?cero/i },
  MANCINELLI: { user_id: 66, role: "distribuidor", check: /mancinel/i },
  BARENGO: { user_id: 26, role: "distribuidor", check: /barengo/i },
  FRANCHI: { user_id: 249, role: "distribuidor", check: /franchi/i },
  WINNER: { user_id: 148, role: "distribuidor", check: /winner/i },
  GRIVEL: { user_id: 42, role: "distribuidor", check: /grivel/i },
  AZ: { user_id: 93, role: "distribuidor", check: /az abert/i },
  ALUCAB: { user_id: 290, role: "distribuidor", check: /alucab/i },
};
const LISTADO = {
  2267: ["WINDOOR", "PILAR"], 2295: ["SELEC", "RIO SEGUNDO"], 2543: ["PAMPEANAS", "LA PAMPA"], 2587: ["WINDOOR", "PILAR"],
  2680: ["DGP", "CRUZ DEL EJE"], 3083: ["DGP", "PILAR"], 3170: ["EXPOLEGNO", "MARCOS JUAREZ"], 3521: ["QCERO", "ALTA GRACIA"],
  3575: ["WINDOOR", "PILAR"], 3582: ["MANCINELLI", "RIO CUARTO"], 3600: ["BARENGO", "VILLA MARIA"], 3687: ["DGP", "PILAR"],
  3688: ["DGP", "PILAR"], 3689: ["DGP", "PILAR"], 3690: ["DGP", "PILAR"], 3824: ["PAMPEANAS", "LA PAMPA"],
  3850: ["EXPOLEGNO", "MARCOS JUAREZ"], 3894: ["FRANCHI", "TRENQUE LAUQUEN"], 3895: ["FRANCHI", "TRENQUE LAUQUEN"],
  3954: ["EXPOLEGNO", "MARCOS JUAREZ"], 3976: ["WINNER", "BUENOS AIRES"], 3980: ["WINNER", "BUENOS AIRES"],
  4084: ["PAMPEANAS", "LA PAMPA"], 4091: ["BARENGO", "VILLA MARIA"], 4104: ["DGP", "NEUQUEN"], 4126: ["DGP", "ROSARIO"],
  4129: ["GRIVEL", "RIO TERCERO"], 4144: ["DGP", "LAS VARILLAS"], 4162: ["DGP", "SAN FRANCISCO SANTA FE"],
  4165: ["DGP", "SAN FRANCISCO SANTA FE"], 4166: ["DGP", "MAR DEL PLATA"], 4169: ["AZ", "BELL VILLE"], 4209: ["ALUCAB", "VILLA NUEVA"],
};
// NV sin pedido en el cotizador web viejo: medidas informadas por el usuario.
const OVERRIDES = {
  2680: {
    ancho: 2.62,
    alto: 2.1,
    // Sistema indicado por el usuario (código 1 de Portones.TSistema).
    sistema: "ACERO SIMIL ALUMINIO CLASICO",
    sistema_codigo: "1",
    nota_medidas: "Sin pedido en el sistema anterior: medidas y sistema informados por De Grandis el 2026-09-28.",
  },
};

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const T = (v) => (typeof v === "string" ? v.trim() : v);

const fichas = readJson(path.join(BACKUP_DIR, "fichas_tecnicas_33_nv_acopio.json"));
const sisRubro = readJson(path.join(BACKUP_DIR, "sqlserver_2026-09-28", "WebApp.SisRubro.json"));
const rubros = readJson(path.join(BACKUP_DIR, "sqlserver_2026-09-28", "Portones.RUBROS.json"));

function fallbackTitulo(rubro, sistema) {
  const s = sisRubro.find((x) => T(x.rubro) === rubro && T(x.sistema) === sistema) || sisRubro.find((x) => T(x.rubro) === rubro);
  if (s) return { titulo: T(s.titulo), orden: Number(s.orden) || 999 };
  const r = rubros.find((x) => T(x.codigo) === rubro);
  return { titulo: r ? T(r.descripcion) : null, orden: 999 };
}

function uniqueText(values) {
  const out = [];
  for (const v of values) { const t = T(v); if (t && !out.includes(t)) out.push(t); }
  return out;
}

function buildRow(f) {
  const [ownerKey, ciudad] = LISTADO[f.nv] || [];
  if (!ownerKey) throw new Error(`NV ${f.nv} no está en el listado`);
  const owner = ownerKey === "DGP" ? ENC_COMERCIAL : DIST[ownerKey];
  const ov = OVERRIDES[f.nv] || {};
  const p = f.pedido || {};
  const opciones = (f.opciones || []).map((o) => {
    if (o.titulo) return o;
    const fb = fallbackTitulo(o.rubro, ov.sistema_codigo ?? p.sistema_codigo);
    return { ...o, titulo: fb.titulo, orden: o.orden === 999 ? fb.orden : o.orden };
  }).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  const ancho = ov.ancho ?? p.ancho ?? null;
  const alto = ov.alto ?? p.alto ?? null;
  const observaciones = uniqueText([p.observaciones, f.obs, ov.nota_medidas]).join("\n") || null;
  const ficha = {
    nv: f.nv,
    fecha_nv: f.fecha_nv,
    sistema: ov.sistema ?? p.sistema ?? null,
    sistema_codigo: ov.sistema_codigo ?? p.sistema_codigo ?? null,
    ancho,
    alto,
    razon_social: f.distribuidor_razon_social,
    cliente_final: f.cliente_final,
    observaciones,
    opciones,
    origen: {
      sistema: "SQL Server Portones/WebApp",
      respaldo: "BackUp Portones Table/sqlserver_2026-09-28",
      factura: f.factura ?? null,
      cliente_codigo: f.cliente_codigo ?? null,
      vendedor_codigo: f.vendedor_codigo ?? null,
      pedido_id: p.id ?? null,
      pedido_fecha: p.fecha ?? null,
      importado_at: new Date().toISOString(),
    },
  };
  const end_customer = {
    name: f.cliente_final || p.nombre || "",
    phone: p.telefono || "",
    email: p.mail || "",
    address: p.direccion || "",
    city: ciudad || "",
    maps_url: "",
  };
  const payload = {
    legacy_import: true,
    legacy_ficha: ficha,
    dimensions: ancho && alto ? { width: ancho, height: alto } : {},
  };
  return {
    nv: f.nv,
    owner,
    ownerKey,
    end_customer,
    payload,
    note: `Portón migrado del sistema anterior (NV${f.nv}, vendido el ${f.fecha_nv}). No genera NP/NV en Odoo.`,
    confirmed_at: `${f.fecha_nv}T12:00:00Z`,
  };
}

const rows = fichas.filter((f) => !ONLY.length || ONLY.includes(f.nv)).map(buildRow);

async function main() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    // Validaciones previas (lectura)
    const ids = [...new Set(rows.map((r) => r.owner.user_id))];
    const users = new Map((await client.query(
      `select id, username, full_name, is_active, is_vendedor, is_distribuidor from public.presupuestador_users where id = any($1::bigint[])`,
      [ids]
    )).rows.map((u) => [Number(u.id), u]));
    const problems = [];
    for (const r of rows) {
      const u = users.get(r.owner.user_id);
      if (!u) { problems.push(`NV${r.nv}: usuario ${r.owner.user_id} no existe`); continue; }
      if (!r.owner.check.test(`${u.full_name} ${u.username}`)) problems.push(`NV${r.nv}: usuario ${r.owner.user_id} (${u.full_name}) no coincide con ${r.ownerKey}`);
      if (r.owner.role === "distribuidor" && !u.is_distribuidor) problems.push(`NV${r.nv}: ${u.full_name} no es distribuidor`);
      if (r.owner.role === "vendedor" && !u.is_vendedor) problems.push(`NV${r.nv}: ${u.full_name} no es vendedor`);
      if (!u.is_active) console.warn(`AVISO NV${r.nv}: ${u.full_name} está INACTIVO (hay que reactivarlo para que pida el paso a producción).`);
      const f = r.payload.legacy_ficha;
      if (!f.ancho || !f.alto) problems.push(`NV${r.nv}: sin medidas`);
      if (!f.opciones.length) problems.push(`NV${r.nv}: sin opciones`);
    }
    const existing = new Set((await client.query(
      `select odoo_sale_order_name from public.presupuestador_quotes where odoo_sale_order_name = any($1::text[])`,
      [rows.map((r) => `NV${r.nv}`)]
    )).rows.map((x) => x.odoo_sale_order_name));
    const planta = new Set((await client.query(`select nv from public.preproduccion_valores where nv_tipo='NV' and nv = any($1::int[])`, [rows.map((r) => r.nv)])).rows.map((x) => Number(x.nv)));
    for (const r of rows) if (planta.has(r.nv)) problems.push(`NV${r.nv}: ya existe en preproduccion_valores (Planta)`);

    for (const r of rows) {
      const f = r.payload.legacy_ficha;
      const u = users.get(r.owner.user_id);
      if (AS_JSON) { console.log(JSON.stringify({ ...r, owner: { ...r.owner, check: undefined, name: u?.full_name } }, null, 2)); continue; }
      console.log(`\nNV${r.nv}${existing.has(`NV${r.nv}`) ? "  [YA EXISTE, se saltea]" : ""}  ${f.fecha_nv}  dueño: ${u?.full_name} (${r.owner.role})`);
      console.log(`  Cliente: ${r.end_customer.name} · ${r.end_customer.city}${r.end_customer.phone ? ` · tel ${r.end_customer.phone}` : ""}  | Razón social NV: ${f.razon_social}`);
      console.log(`  ${f.sistema || "(sin sistema)"} · ${f.ancho} x ${f.alto} m${f.observaciones ? `  | Obs: ${f.observaciones.replace(/\n/g, " / ")}` : ""}`);
      for (const o of f.opciones) console.log(`    - ${o.titulo || `rubro ${o.rubro}`}: [${o.codigo}] ${String(o.descripcion || "").slice(0, 90)}${Number(o.cantidad) !== 1 ? `  x${o.cantidad}` : ""}`);
    }
    console.log(`\n${rows.length} portones · ${rows.filter((r) => existing.has(`NV${r.nv}`)).length} ya existentes`);
    if (problems.length) { console.error("\nPROBLEMAS:\n" + problems.join("\n")); process.exitCode = 1; return; }
    if (!APPLY) { console.log("\nDry-run: no se insertó nada. Agregá --apply para insertar."); return; }

    await client.query("begin");
    let inserted = 0;
    for (const r of rows) {
      if (existing.has(`NV${r.nv}`)) continue;
      await client.query(
        `insert into public.presupuestador_quotes (
            quote_kind, created_by_user_id, created_by_role, fulfillment_mode, catalog_kind,
            status, commercial_decision, technical_decision, commercial_at, technical_at, confirmed_at,
            end_customer, lines, payload, note, odoo_sale_order_name,
            requires_measurement, measurement_mode, measurement_subtype, measurement_status
         ) values (
            'original', $1, $2, 'acopio', 'porton',
            'synced_odoo', 'approved', 'approved', $3::timestamptz, $3::timestamptz, $3::timestamptz,
            $4::jsonb, '[]'::jsonb, $5::jsonb, $6, $7,
            false, 'medidor', 'normal', 'none'
         )`,
        [r.owner.user_id, r.owner.role, r.confirmed_at, JSON.stringify(r.end_customer), JSON.stringify(r.payload), r.note, `NV${r.nv}`]
      );
      inserted += 1;
    }
    await client.query("commit");
    console.log(`\nInsertados: ${inserted}`);
  } catch (e) {
    try { await client.query("rollback"); } catch {}
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error("ERROR:", e?.message || e); process.exit(1); });
