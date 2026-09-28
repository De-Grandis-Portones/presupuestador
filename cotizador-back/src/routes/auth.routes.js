import express from "express";
import rateLimit from "express-rate-limit";
import { dbQuery } from "../db.js";
import { signToken, requireAuth, sanitizeUserForPricing } from "../auth.js";
import { ensureUsersAdminColumns, recoveryEmailSql } from "../usersDb.js";
import {
  requestPasswordReset,
  getPasswordResetTokenInfo,
  resetPasswordWithToken,
  changeOwnPassword,
  updateOwnEmail,
} from "../passwordReset.js";

// Rutas sin auth de recuperacion de contraseña: limite por IP para que no se puedan usar
// para mandar mails en masa ni para probar tokens a lo bruto (ademas del limite por
// cuenta que aplica requestPasswordReset).
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Demasiados intentos, esperá unos minutos e intentá de nuevo." },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Demasiados intentos, esperá unos minutos e intentá de nuevo." },
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Demasiados intentos, esperá unos minutos e intentá de nuevo." },
});

function withEffectiveRoles(user) {
  const isSuperuser = !!user?.is_superuser;
  return {
    ...user,
    is_superuser: isSuperuser,
    is_distribuidor: isSuperuser || !!user?.is_distribuidor,
    is_vendedor: isSuperuser || !!user?.is_vendedor,
    is_enc_comercial: isSuperuser || !!user?.is_enc_comercial,
    is_rev_tecnica: isSuperuser || !!user?.is_rev_tecnica,
    is_medidor: isSuperuser || !!user?.is_medidor,
    is_logistica: isSuperuser || !!user?.is_logistica,
    is_administracion: isSuperuser || !!user?.is_administracion,
    unlimited_dimensions: isSuperuser || !!user?.unlimited_dimensions,
  };
}

export function buildAuthRouter() {
  const router = express.Router();

  router.post("/login", async (req, res, next) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) throw new Error("Falta username/password");

      await ensureUsersAdminColumns();

      const q = await dbQuery(
        `
        select id, username, full_name,
               coalesce(is_superuser, false) as is_superuser,
               is_distribuidor, is_vendedor,
               is_enc_comercial, is_rev_tecnica, is_medidor, is_logistica,
               coalesce(is_administracion, false) as is_administracion,
               odoo_partner_id,
               odoo_pricelist_id,
               default_maps_url,
               coalesce(is_active, true) as is_active,
               coalesce(unlimited_dimensions, false) as unlimited_dimensions,
               ${recoveryEmailSql("presupuestador_users")} as recovery_email
        from public.presupuestador_users
        where lower(username) = lower($1)
          and password_hash = crypt($2, password_hash)
        limit 1
        `,
        [String(username).trim(), String(password)]
      );

      const rawUser = q.rows?.[0];
      if (!rawUser) return res.status(401).json({ ok: false, error: "Credenciales inválidas" });
      if (rawUser.is_active === false) return res.status(403).json({ ok: false, error: "Usuario inhabilitado" });

      const user = sanitizeUserForPricing(withEffectiveRoles(rawUser));
      const token = signToken(user);
      res.json({ ok: true, token, user });
    } catch (e) {
      next(e);
    }
  });

  router.get("/me", requireAuth, async (req, res) => {
    res.json({ ok: true, user: sanitizeUserForPricing(req.user) });
  });

  // Responde siempre igual (exista o no el usuario, tenga o no email) y manda el email
  // despues de responder, asi ni el mensaje ni el tiempo de respuesta revelan nada.
  router.post("/forgot-password", forgotPasswordLimiter, (req, res) => {
    const identifier = String(req.body?.identifier || "").trim();
    res.json({ ok: true });
    if (!identifier) return;
    requestPasswordReset({ identifier, ip: req.ip }).catch((e) => {
      console.error("[password-reset] no se pudo procesar el pedido:", e?.message || e);
    });
  });

  router.post("/reset-password/check", resetPasswordLimiter, async (req, res, next) => {
    try {
      const info = await getPasswordResetTokenInfo(req.body?.token);
      if (!info) return res.status(400).json({ ok: false, error: "El link no es válido o ya venció. Pedí uno nuevo." });
      res.json({ ok: true, username: info.username });
    } catch (e) {
      next(e);
    }
  });

  router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
    try {
      const user = await resetPasswordWithToken({ token: req.body?.token, password: req.body?.password });
      res.json({ ok: true, username: user.username });
    } catch (e) {
      res.status(400).json({ ok: false, error: e?.message || "No se pudo cambiar la contraseña" });
    }
  });

  // Devuelve un token nuevo: el cambio cierra todas las sesiones anteriores (ver
  // password_changed_at en requireAuth), incluida la actual.
  router.post("/change-password", requireAuth, changePasswordLimiter, async (req, res) => {
    try {
      await changeOwnPassword({
        userId: req.user?.id || req.user?.user_id,
        currentPassword: req.body?.current_password,
        newPassword: req.body?.new_password,
      });
      const user = sanitizeUserForPricing(req.user);
      res.json({ ok: true, token: signToken(user), user });
    } catch (e) {
      res.status(400).json({ ok: false, error: e?.message || "No se pudo cambiar la contraseña" });
    }
  });

  router.put("/me/email", requireAuth, async (req, res) => {
    try {
      const r = await updateOwnEmail({ userId: req.user?.id || req.user?.user_id, email: req.body?.email });
      res.json({ ok: true, email: r.email, recovery_email: r.recovery_email });
    } catch (e) {
      res.status(400).json({ ok: false, error: e?.message || "No se pudo guardar el email" });
    }
  });

  return router;
}
