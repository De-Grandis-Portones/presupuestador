import crypto from "crypto";
import nodemailer from "nodemailer";

// Funcion de Vercel que manda los emails del presupuestador (hoy: "¿Olvidaste tu
// contraseña?") por SMTP con la casilla de la empresa. Existe porque el backend corre en
// Render y el plan gratis de Render bloquea los puertos SMTP; Vercel los deja abiertos.
// El backend la llama con MAIL_RELAY_URL + MAIL_RELAY_SECRET (ver cotizador-back/src/mailer.js).
//
// Variables de entorno en Vercel (obligatorias):
//   MAIL_RELAY_SECRET - la misma clave que en el backend. Sin ella la funcion no manda nada.
//   SMTP_PASS         - contraseña de la casilla que manda los emails
// Opcionales (tienen default, solo hace falta cargarlas para cambiarlas):
//   SMTP_HOST (mail.degrandisportones.com), SMTP_PORT (465), SMTP_USER
//   (sistemas2@degrandisportones.com), MAIL_FROM_NAME ("De Grandis Portones")
const DEFAULT_SMTP_HOST = "mail.degrandisportones.com";
const DEFAULT_SMTP_USER = "sistemas2@degrandisportones.com";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function secretMatches(given, expected) {
  const a = Buffer.from(String(given || ""));
  const b = Buffer.from(String(expected || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });

  const secret = String(process.env.MAIL_RELAY_SECRET || "");
  if (!secret || !secretMatches(req.headers["x-mail-relay-secret"], secret)) {
    return res.status(401).json({ ok: false, error: "No autorizado" });
  }

  const host = String(process.env.SMTP_HOST || "").trim() || DEFAULT_SMTP_HOST;
  const user = String(process.env.SMTP_USER || "").trim() || DEFAULT_SMTP_USER;
  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: process.env.SMTP_PASS },
        connectionTimeout: 15000,
      })
    : null;

  // { ping: true }: el backend pregunta si el envio esta listo (para mostrar o no el link
  // "¿Olvidaste tu contraseña?"). Prueba el login SMTP sin mandar ningun email.
  if (req.body?.ping === true) {
    if (!transporter) return res.status(200).json({ ok: false, error: "SMTP no configurado (falta SMTP_PASS)" });
    try {
      await transporter.verify();
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[send-mail] ping SMTP fallo:", e?.code || "", e?.message || e);
      return res.status(200).json({ ok: false, error: "No se pudo iniciar sesión en el servidor de correo" });
    }
  }

  if (!transporter) return res.status(500).json({ ok: false, error: "SMTP no configurado (falta SMTP_PASS)" });

  const { to, subject, text, html } = req.body || {};
  const recipient = String(to || "").trim();
  if (!EMAIL_RE.test(recipient) || recipient.length > 254) return res.status(400).json({ ok: false, error: "Destinatario inválido" });
  if (!subject || String(subject).length > 300) return res.status(400).json({ ok: false, error: "Asunto inválido" });
  if (String(text || "").length > 20000 || String(html || "").length > 50000) return res.status(400).json({ ok: false, error: "Mensaje demasiado largo" });

  try {
    // Se espera el envio completo antes de responder: Vercel congela la funcion apenas
    // responde, y un envio que quedara en curso se perderia.
    const info = await transporter.sendMail({
      from: { name: process.env.MAIL_FROM_NAME || "De Grandis Portones", address: user },
      to: recipient,
      subject: String(subject),
      text: text ? String(text) : undefined,
      html: html ? String(html) : undefined,
    });
    return res.status(200).json({ ok: true, messageId: info.messageId || null });
  } catch (e) {
    console.error("[send-mail] error SMTP:", e?.code || "", e?.message || e);
    return res.status(502).json({ ok: false, error: "No se pudo enviar el email" });
  }
}
