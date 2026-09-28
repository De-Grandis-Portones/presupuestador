import axios from "axios";

// Envio de emails. Dos formas, se elige por variables de entorno:
//
// 1) Relay por Vercel (la que se usa hoy): el backend corre en Render y el plan gratis de
//    Render bloquea los puertos SMTP, asi que el email lo manda una funcion de Vercel
//    (cotizador-front/api/send-mail.js) con Nodemailer y la casilla de la empresa.
//      MAIL_RELAY_URL    - ej. https://presupuestador-degrandisportones.vercel.app/api/send-mail
//      MAIL_RELAY_SECRET - la misma clave cargada en Vercel
//
// 2) Resend (si algun dia se verifica el dominio en resend.com):
//      RESEND_API_KEY, MAIL_FROM (remitente del dominio verificado)
//
// Si estan las dos, se usa el relay.
const RESEND_DEFAULT_FROM = "Presupuestador De Grandis <onboarding@resend.dev>";

function relayConfig() {
  const url = String(process.env.MAIL_RELAY_URL || "").trim();
  const secret = String(process.env.MAIL_RELAY_SECRET || "").trim();
  return url && secret ? { url, secret } : null;
}

export function isMailConfigured() {
  return !!relayConfig() || !!String(process.env.RESEND_API_KEY || "").trim();
}

async function sendViaRelay({ url, secret }, { to, subject, html, text }) {
  try {
    const { data } = await axios.post(
      url,
      { to, subject, html, text },
      { headers: { "x-mail-relay-secret": secret }, timeout: 30000 }
    );
    if (!data?.ok) throw new Error(data?.error || "El relay de email no confirmó el envío");
    return data;
  } catch (e) {
    const status = e?.response?.status;
    const detail = e?.response?.data?.error || e?.message || "error desconocido";
    throw new Error(`Relay de email falló${status ? ` (${status})` : ""}: ${detail}`);
  }
}

// Import dinamico: la libreria resend pide Node >= 20 y solo se carga si se usa.
async function sendViaResend(apiKey, { to, subject, html, text }) {
  const { Resend } = await import("resend");
  const { data, error } = await new Resend(apiKey).emails.send({
    from: String(process.env.MAIL_FROM || "").trim() || RESEND_DEFAULT_FROM,
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(error.message || "Resend rechazó el email");
  return data;
}

export async function sendMail(message) {
  const relay = relayConfig();
  if (relay) return sendViaRelay(relay, message);

  const resendKey = String(process.env.RESEND_API_KEY || "").trim();
  if (resendKey) return sendViaResend(resendKey, message);

  throw new Error("Envio de emails no configurado (falta MAIL_RELAY_URL/MAIL_RELAY_SECRET o RESEND_API_KEY)");
}
