import crypto from "crypto";
import nodemailer from "nodemailer";

// Funcion de Vercel que manda los emails del presupuestador (hoy: "¿Olvidaste tu
// contraseña?") por SMTP con la casilla de la empresa. Existe porque el backend corre en
// Render y el plan gratis de Render bloquea los puertos SMTP; Vercel los deja abiertos.
// El backend la llama con MAIL_RELAY_URL + MAIL_RELAY_SECRET (ver cotizador-back/src/mailer.js).
//
// Variables de entorno en Vercel:
//   MAIL_RELAY_SECRET - la misma clave que en el backend. Sin ella la funcion no manda nada.
//   SMTP_HOST         - ej. mail.degrandisportones.com
//   SMTP_PORT         - 465 (SSL) o 587 (STARTTLS). Default 465.
//   SMTP_USER         - la casilla, ej. sistemas2@degrandisportones.com
//   SMTP_PASS         - contraseña de esa casilla
//   MAIL_FROM_NAME    - nombre del remitente (default "De Grandis Portones")

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

  const { to, subject, text, html } = req.body || {};
  const recipient = String(to || "").trim();
  if (!EMAIL_RE.test(recipient) || recipient.length > 254) return res.status(400).json({ ok: false, error: "Destinatario inválido" });
  if (!subject || String(subject).length > 300) return res.status(400).json({ ok: false, error: "Asunto inválido" });
  if (String(text || "").length > 20000 || String(html || "").length > 50000) return res.status(400).json({ ok: false, error: "Mensaje demasiado largo" });

  const user = String(process.env.SMTP_USER || "").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  if (!process.env.SMTP_HOST || !user || !process.env.SMTP_PASS) {
    return res.status(500).json({ ok: false, error: "SMTP no configurado" });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000,
  });

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
