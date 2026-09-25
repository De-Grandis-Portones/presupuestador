// src/ticketsDb.js — capa de datos del sistema de Tickets, COMPARTIDO entre
// todas las apps del ecosistema (planificación, integrador, presupuestador,
// ...). Todas escriben en las mismas tablas public.tickets /
// public.ticket_mensajes de esta misma base — no hay tablas propias de
// presupuestador para esto. Se gestionan todos desde /admin/tickets en
// planificación; acá solo se puede crear y ver/responder los propios.
import { dbQuery } from "./db.js";

let ensured = false;

// Idempotente (CREATE TABLE IF NOT EXISTS), mismo esquema final que crea la
// migración de planificación (Backend/server/index.js, MIGRATIONS: tickets,
// ticket_mensajes, tickets_multi_app, tickets_creado_por_id_text).
export async function ensureTicketsSchema() {
  if (ensured) return;
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS public.tickets (
      id SERIAL PRIMARY KEY,
      categoria TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pending',
      creado_por_id TEXT,
      creado_por_username TEXT,
      ruta_origen TEXT,
      app_origen TEXT NOT NULL DEFAULT 'planificacion',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      adjuntos JSONB NOT NULL DEFAULT '[]'::jsonb
    );
    CREATE INDEX IF NOT EXISTS idx_tickets_estado ON public.tickets(estado);
    CREATE INDEX IF NOT EXISTS idx_tickets_creado_por ON public.tickets(creado_por_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_app_origen ON public.tickets(app_origen);
    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);

    CREATE TABLE IF NOT EXISTS public.ticket_mensajes (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
      autor_id TEXT,
      autor_username TEXT,
      es_admin BOOLEAN NOT NULL DEFAULT FALSE,
      mensaje TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_ticket_mensajes_ticket ON public.ticket_mensajes(ticket_id);

    ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS adjuntos JSONB NOT NULL DEFAULT '[]'::jsonb;
  `);
  ensured = true;
}

export async function createTicket({ categoria, mensaje, rutaOrigen, creadoPorId, creadoPorUsername, adjuntos }) {
  await ensureTicketsSchema();
  const { rows } = await dbQuery(
    `
    -- returning sin adjuntos: el cliente ya los tiene, y devolverlos (MBs en base64)
    -- podía cortar la respuesta por timeout con el ticket ya guardado -> reenvío duplicado.
    insert into public.tickets (categoria, mensaje, ruta_origen, creado_por_id, creado_por_username, app_origen, adjuntos)
    values ($1, $2, $3, $4, $5, 'presupuestador', $6::jsonb)
    returning ${TICKET_LIST_COLUMNS};
    `,
    [
      categoria,
      mensaje,
      rutaOrigen || null,
      creadoPorId || null,
      creadoPorUsername || null,
      JSON.stringify(Array.isArray(adjuntos) ? adjuntos : []),
    ]
  );
  return rows[0];
}

// Sin `adjuntos`: esa columna puede pesar varios MB por fila (adjuntos en
// base64) y esta consulta es para pintar la lista de "Mis tickets" (solo
// categoría/estado/fecha) - se recorta a propósito. El contenido de los
// adjuntos se pide aparte, solo al abrir un ticket (getTicketAdjuntosForOwner).
const TICKET_LIST_COLUMNS = `
  id, categoria, mensaje, estado, creado_por_id, creado_por_username,
  ruta_origen, app_origen, created_at, updated_at
`;

// Todas las consultas "del dueño" filtran también por app_origen: la tabla es
// compartida y creado_por_id es el id de usuario de CADA app (acá
// presupuestador_users.id, en planificación admin_users.id, ...), así que el
// mismo número puede ser otra persona en otra app. Sin esto, el usuario 7 de
// acá veía (y podía responder/anular) los tickets del admin 7 de planificación.
//
// `ultima_respuesta_at` = último mensaje de soporte (es_admin). El aviso de
// "respuesta nueva" del widget se basa en esto y no en updated_at, que también
// se mueve sin que haya nada nuevo para leer (el propio comentario del
// usuario, soporte "tomando" el ticket en curso, etc.).
export async function listMyTickets(userId) {
  await ensureTicketsSchema();
  const { rows } = await dbQuery(
    `
    select ${TICKET_LIST_COLUMNS},
      (select max(m.created_at) from public.ticket_mensajes m where m.ticket_id = t.id and m.es_admin) as ultima_respuesta_at
    from public.tickets t
    where t.creado_por_id = $1 and t.app_origen = 'presupuestador'
    order by t.created_at desc;
    `,
    [userId]
  );
  return rows;
}

// Detalle SIN el contenido de los adjuntos (solo name/type/size, en el mismo
// orden): antes venían acá los data_url en base64 (hasta ~20MB) y, con una
// conexión lenta, el pedido no llegaba a terminar - el usuario tocaba el
// ticket y no se abría, sin poder leer la respuesta de soporte (que pesa
// nada). El contenido se pide aparte con getTicketAdjuntosForOwner.
export async function getTicketForOwner(id, userId) {
  await ensureTicketsSchema();
  const { rows } = await dbQuery(
    `
    select ${TICKET_LIST_COLUMNS},
      case when jsonb_typeof(t.adjuntos) = 'array' then coalesce(
        (select jsonb_agg(a.adj - 'data_url' order by a.i) from jsonb_array_elements(t.adjuntos) with ordinality as a(adj, i)),
        '[]'::jsonb
      ) else '[]'::jsonb end as adjuntos
    from public.tickets t
    where t.id = $1 and t.creado_por_id = $2 and t.app_origen = 'presupuestador';
    `,
    [id, userId]
  );
  const ticket = rows[0];
  if (!ticket) return null;
  const mensajes = await dbQuery(
    `select * from public.ticket_mensajes where ticket_id = $1 order by created_at asc;`,
    [id]
  );
  return { ...ticket, mensajes: mensajes.rows };
}

export async function getTicketAdjuntosForOwner(id, userId) {
  await ensureTicketsSchema();
  const { rows } = await dbQuery(
    `select adjuntos from public.tickets where id = $1 and creado_por_id = $2 and app_origen = 'presupuestador';`,
    [id, userId]
  );
  if (!rows[0]) return null;
  return Array.isArray(rows[0].adjuntos) ? rows[0].adjuntos : [];
}

export async function addOwnMessage(ticketId, { autorId, autorUsername, mensaje }) {
  await ensureTicketsSchema();
  const { rows } = await dbQuery(
    `
    insert into public.ticket_mensajes (ticket_id, autor_id, autor_username, es_admin, mensaje)
    values ($1, $2, $3, false, $4)
    returning *;
    `,
    [ticketId, autorId || null, autorUsername || null, mensaje]
  );
  await dbQuery(`update public.tickets set updated_at = now() where id = $1;`, [ticketId]);
  return rows[0];
}

// Anular el propio ticket: BORRA la fila (a pedido explícito del usuario -
// "de qué sirve tenerlo" - no es un soft-delete/estado). Solo quien lo creó,
// y solo si no está "closed" (ya resuelto por soporte, eso queda como
// historial). No hace falta que intervenga soporte, es autoservicio.
// `ticket_mensajes` tiene ON DELETE CASCADE, así que las respuestas del
// ticket se borran solas con esto.
export async function deleteOwnTicket(id, userId) {
  await ensureTicketsSchema();
  const { rows } = await dbQuery(
    `delete from public.tickets where id = $1 and creado_por_id = $2 and app_origen = 'presupuestador' and estado != 'closed' returning id;`,
    [id, userId]
  );
  return rows[0] || null;
}
