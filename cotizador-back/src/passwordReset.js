import crypto from "crypto";
import { dbQuery } from "./db.js";
import { ensureUsersAdminColumns, recoveryEmailSql, normalizeEmail } from "./usersDb.js";
import { sendMail } from "./mailer.js";

// "¿Olvidaste tu contraseña?": se manda por email un link de un solo uso. En la tabla solo
// se guarda el sha256 del token (nunca el token en si), asi que alguien con acceso de
// lectura a la base no puede usar un link pendiente. Las filas no se borran: quedan como
// historial (used_at marca las usadas o invalidadas).
const TOKEN_TTL_MINUTES = 30;
const MAX_EMAILS_PER_USER_PER_HOUR = 3;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const DEFAULT_APP_URL = "https://presupuestador-degrandisportones.vercel.app";

let ensured = false;

export async function ensurePasswordResetSchema() {
  if (ensured) return;
  await ensureUsersAdminColumns();
  await dbQuery(`
    create table if not exists public.presupuestador_password_resets (
      id bigserial primary key,
      user_id integer not null,
      token_hash text not null unique,
      sent_to text null,
      requested_ip text null,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null,
      used_at timestamptz null
    );
  `);
  await dbQuery(`create index if not exists presupuestador_password_resets_user_idx on public.presupuestador_password_resets(user_id, created_at desc);`);
  ensured = true;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function resolveAppBaseUrl() {
  const raw =
    process.env.PASSWORD_RESET_BASE_URL ||
    process.env.APP_PUBLIC_URL ||
    process.env.FRONTEND_PUBLIC_URL ||
    process.env.FRONTEND_URL ||
    DEFAULT_APP_URL;
  return String(raw).trim().replace(/\/+$/, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function validateNewPassword(password) {
  const p = String(password ?? "");
  if (p.length < MIN_PASSWORD_LENGTH) throw new Error(`La contraseña tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
  if (p.length > MAX_PASSWORD_LENGTH) throw new Error("La contraseña es demasiado larga");
  if (!p.trim()) throw new Error("La contraseña no puede ser solo espacios");
  return p;
}

function buildResetEmail({ username, fullName, link }) {
  const name = String(fullName || "").trim() || username;
  const subject = "Recuperar tu contraseña del Presupuestador";
  const text = [
    `Hola ${name}:`,
    "",
    "Pediste recuperar la contraseña del Presupuestador de De Grandis Portones.",
    `Usuario: ${username}`,
    "",
    `Para elegir una nueva, entrá a este link (vence en ${TOKEN_TTL_MINUTES} minutos y sirve una sola vez):`,
    link,
    "",
    "Si no lo pediste vos, ignorá este email: tu contraseña no cambia.",
  ].join("\n");
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1f2937;max-width:520px;margin:0 auto;padding:24px">
  <p>Hola ${escapeHtml(name)}:</p>
  <p>Pediste recuperar la contraseña del Presupuestador de De Grandis Portones.</p>
  <p>Usuario: <strong>${escapeHtml(username)}</strong></p>
  <p style="margin:28px 0">
    <a href="${escapeHtml(link)}" style="background:#01a39f;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;display:inline-block">Elegir nueva contraseña</a>
  </p>
  <p style="font-size:13px;color:#6b7280">El link vence en ${TOKEN_TTL_MINUTES} minutos y sirve una sola vez. Si el botón no funciona, copiá esta dirección en el navegador:<br><span style="word-break:break-all">${escapeHtml(link)}</span></p>
  <p style="font-size:13px;color:#6b7280">Si no lo pediste vos, ignorá este email: tu contraseña no cambia.</p>
</div>`.trim();
  return { subject, text, html };
}

// Nunca le dice a quien lo pide si el usuario existe o tiene email: el route responde
// siempre lo mismo y esto corre despues, en segundo plano. Un mismo email puede estar en
// varias cuentas (ej. vendedor y distribuidor): se manda un link por cuenta.
export async function requestPasswordReset({ identifier, ip = null }) {
  const value = String(identifier || "").trim();
  if (!value || value.length > 254) return { sent: 0 };

  await ensurePasswordResetSchema();

  const r = await dbQuery(
    `
    select u.id, u.username, u.full_name, ${recoveryEmailSql("u")} as recovery_email
      from public.presupuestador_users u
     where coalesce(u.is_active, true) = true
       and (lower(trim(u.username)) = lower($1) or lower(${recoveryEmailSql("u")}) = lower($1))
     order by u.id asc
     limit 5
    `,
    [value]
  );

  let sent = 0;
  for (const user of r.rows || []) {
    const to = String(user.recovery_email || "").trim();
    if (!to) continue;

    const recent = await dbQuery(
      `select count(*)::int as n from public.presupuestador_password_resets where user_id = $1 and created_at > now() - interval '1 hour'`,
      [user.id]
    );
    if (Number(recent.rows?.[0]?.n || 0) >= MAX_EMAILS_PER_USER_PER_HOUR) continue;

    const token = crypto.randomBytes(32).toString("base64url");
    await dbQuery(
      `insert into public.presupuestador_password_resets (user_id, token_hash, sent_to, requested_ip, expires_at)
       values ($1, $2, $3, $4, now() + ($5::int * interval '1 minute'))`,
      [user.id, hashToken(token), to, ip ? String(ip).slice(0, 100) : null, TOKEN_TTL_MINUTES]
    );

    // El token va en el hash (#) y no en la query: el navegador no lo manda al servidor
    // (ni queda en logs de Vercel) ni en el Referer.
    const link = `${resolveAppBaseUrl()}/restablecer-contrasena#token=${token}`;
    if (process.env.MAIL_DEV_LOG_LINKS === "1") {
      console.log(`[password-reset] link para ${user.username} <${to}>: ${link}`);
    }

    const { subject, text, html } = buildResetEmail({ username: user.username, fullName: user.full_name, link });
    await sendMail({ to, subject, text, html });
    sent += 1;
  }
  return { sent };
}

// Para que la pantalla del link pueda avisar "venció" antes de que el usuario escriba.
export async function getPasswordResetTokenInfo(token) {
  const t = String(token || "").trim();
  if (!t) return null;
  await ensurePasswordResetSchema();
  const r = await dbQuery(
    `
    select u.username
      from public.presupuestador_password_resets pr
      join public.presupuestador_users u on u.id = pr.user_id
     where pr.token_hash = $1
       and pr.used_at is null
       and pr.expires_at > now()
       and coalesce(u.is_active, true) = true
     limit 1
    `,
    [hashToken(t)]
  );
  return r.rows?.[0] || null;
}

// La pone el propio usuario: se borra la visible_password vieja (dejo de ser valida y no
// tiene que quedar a la vista del vendedor) y se cierran sus otras sesiones.
// password_changed_at sale del reloj de Node (no now() de Postgres) porque se compara
// contra el iat de los JWT, que tambien firma Node: si los relojes del server y de la base
// difieren, el token nuevo de "Mi cuenta" podria quedar invalido apenas se emite.
async function setSelfChangedPassword(userId, password) {
  const r = await dbQuery(
    `
    update public.presupuestador_users
       set password_hash = crypt($2::text, gen_salt('bf')),
           visible_password = null,
           password_self_changed = true,
           password_changed_at = $3,
           updated_at = now()
     where id = $1
       and coalesce(is_active, true) = true
     returning id, username
    `,
    [userId, password, new Date()]
  );
  return r.rows?.[0] || null;
}

export async function resetPasswordWithToken({ token, password }) {
  const t = String(token || "").trim();
  const p = validateNewPassword(password);
  if (!t) throw new Error("El link no es válido o ya venció. Pedí uno nuevo.");

  await ensurePasswordResetSchema();

  // Se marca usado en el mismo update que lo valida: si llegan dos pedidos con el mismo
  // link a la vez, solo uno lo consume.
  const consumed = await dbQuery(
    `
    update public.presupuestador_password_resets
       set used_at = now()
     where token_hash = $1
       and used_at is null
       and expires_at > now()
     returning user_id
    `,
    [hashToken(t)]
  );
  const userId = consumed.rows?.[0]?.user_id;
  if (!userId) throw new Error("El link no es válido o ya venció. Pedí uno nuevo.");

  const user = await setSelfChangedPassword(userId, p);
  if (!user) throw new Error("El link no es válido o ya venció. Pedí uno nuevo.");

  // Los otros links pendientes de la misma cuenta dejan de servir.
  await dbQuery(
    `update public.presupuestador_password_resets set used_at = now() where user_id = $1 and used_at is null`,
    [userId]
  );
  return user;
}

export async function changeOwnPassword({ userId, currentPassword, newPassword }) {
  const id = Number(userId || 0);
  if (!id) throw new Error("Usuario inválido");
  const p = validateNewPassword(newPassword);

  await ensurePasswordResetSchema();

  const ok = await dbQuery(
    `select id from public.presupuestador_users where id = $1 and password_hash = crypt($2::text, password_hash) limit 1`,
    [id, String(currentPassword ?? "")]
  );
  if (!ok.rows?.[0]) throw new Error("La contraseña actual no es correcta");

  const user = await setSelfChangedPassword(id, p);
  if (!user) throw new Error("Usuario inhabilitado");

  await dbQuery(
    `update public.presupuestador_password_resets set used_at = now() where user_id = $1 and used_at is null`,
    [id]
  );
  return user;
}

export async function updateOwnEmail({ userId, email }) {
  const id = Number(userId || 0);
  if (!id) throw new Error("Usuario inválido");
  const emailN = normalizeEmail(email);

  await ensureUsersAdminColumns();
  const r = await dbQuery(
    `
    update public.presupuestador_users u
       set email = $2,
           updated_at = now()
     where u.id = $1
     returning u.email, ${recoveryEmailSql("u")} as recovery_email
    `,
    [id, emailN]
  );
  if (!r.rows?.[0]) throw new Error("Usuario no encontrado");
  return r.rows[0];
}
