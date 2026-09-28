import { Resend } from "resend";

// Envio de emails via Resend (API HTTPS, no SMTP: funciona aunque el hosting bloquee los
// puertos SMTP). Se configura con:
//   RESEND_API_KEY  - key de resend.com (solo "Sending access" alcanza)
//   MAIL_FROM       - remitente de un dominio verificado en Resend, ej.
//                     "De Grandis Portones <no-reply@envios.degrandisportones.com>".
//                     Sin dominio verificado, Resend solo deja mandar desde
//                     onboarding@resend.dev y unicamente al email dueño de la cuenta.
// Se inicializa lazy por el mismo motivo que db.js (los imports corren antes de dotenv).
const DEFAULT_FROM = "Presupuestador De Grandis <onboarding@resend.dev>";

let _client = null;

function getClient() {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) return null;
  if (!_client) _client = new Resend(apiKey);
  return _client;
}

export function isMailConfigured() {
  return !!String(process.env.RESEND_API_KEY || "").trim();
}

export async function sendMail({ to, subject, html, text }) {
  const client = getClient();
  if (!client) throw new Error("Envio de emails no configurado (falta RESEND_API_KEY)");

  const { data, error } = await client.emails.send({
    from: String(process.env.MAIL_FROM || "").trim() || DEFAULT_FROM,
    to,
    subject,
    html,
    text,
  });
  if (error) throw new Error(error.message || "Resend rechazó el email");
  return data;
}
