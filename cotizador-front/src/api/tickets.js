import { http } from "./http.js";

export async function createTicket(payload = {}) {
  const { data } = await http.post("/api/tickets", payload || {});
  if (!data?.ok) throw new Error(data?.error || "No se pudo crear el ticket");
  return data.ticket;
}

export async function listMyTickets() {
  const { data } = await http.get("/api/tickets/mine");
  if (!data?.ok) throw new Error(data?.error || "No se pudieron cargar tus tickets");
  return data.tickets || [];
}

export async function getMyTicket(id) {
  const { data } = await http.get(`/api/tickets/mine/${encodeURIComponent(String(id))}`);
  if (!data?.ok) throw new Error(data?.error || "No se pudo cargar el ticket");
  return data.ticket;
}

// Puede pesar varios MB (adjuntos en base64): más tiempo que el timeout
// general de 30s, para que no se corte con una conexión lenta.
export async function getMyTicketAdjuntos(id) {
  const { data } = await http.get(`/api/tickets/mine/${encodeURIComponent(String(id))}/adjuntos`, { timeout: 120000 });
  if (!data?.ok) throw new Error(data?.error || "No se pudieron cargar los adjuntos");
  return data.adjuntos || [];
}

export async function addMyTicketMessage(id, payload = {}) {
  const { data } = await http.post(`/api/tickets/mine/${encodeURIComponent(String(id))}/messages`, payload || {});
  if (!data?.ok) throw new Error(data?.error || "No se pudo enviar el mensaje");
  return data.mensaje;
}

export async function cancelMyTicket(id) {
  const { data } = await http.delete(`/api/tickets/mine/${encodeURIComponent(String(id))}`);
  if (!data?.ok) throw new Error(data?.error || "No se pudo anular el ticket");
}
