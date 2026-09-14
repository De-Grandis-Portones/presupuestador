// src/pages/TicketsPage/index.jsx — crear tickets y ver los propios. Van a
// la misma base compartida entre todas las apps del ecosistema; se
// gestionan todos desde /admin/tickets en planificación, no hay pantalla
// de gestión acá.
import { useEffect, useState } from "react";
import Button from "../../ui/Button.jsx";
import { createTicket, listMyTickets, getMyTicket, addMyTicketMessage } from "../../api/tickets.js";
import {
  fileToTicketAttachment,
  formatTicketAttachmentMeta,
  isImageTicketAttachment,
  openTicketAttachment,
  downloadTicketAttachment,
} from "../../utils/ticketAttachment.js";

const TICKET_CATEGORIAS = [
  "Duda sobre el sistema",
  "Error / algo no funciona",
  "Solicitud de acceso o permiso",
  "Consulta sobre un pedido / NV",
  "Otro",
];

const ESTADO_LABEL = { pending: "Pendiente", in_progress: "En curso", closed: "Cerrado" };
const ESTADO_COLOR = { pending: "#b45309", in_progress: "#92720c", closed: "#15803d" };

export default function TicketsPage() {
  const [tab, setTab] = useState("nuevo");

  const [categoria, setCategoria] = useState(TICKET_CATEGORIAS[0]);
  const [mensaje, setMensaje] = useState("");
  const [adjuntos, setAdjuntos] = useState([]);
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState("");

  const [misTickets, setMisTickets] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [errorLista, setErrorLista] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  const [respuesta, setRespuesta] = useState("");

  useEffect(() => {
    if (tab === "mios") cargarMisTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function cargarMisTickets() {
    setCargando(true);
    setErrorLista("");
    try {
      setMisTickets(await listMyTickets());
    } catch (err) {
      setErrorLista(err.message || String(err));
    } finally {
      setCargando(false);
    }
  }

  async function abrirTicket(id) {
    try {
      setSeleccionado(await getMyTicket(id));
    } catch (err) {
      setErrorLista(err.message || String(err));
    }
  }

  async function onSeleccionarArchivos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setErrorNuevo("");
    setSubiendoAdjunto(true);
    try {
      const nuevos = [];
      for (const file of files) {
        nuevos.push(await fileToTicketAttachment(file));
      }
      setAdjuntos((prev) => [...prev, ...nuevos].slice(0, 5));
    } catch (err) {
      setErrorNuevo(err.message || "No se pudo adjuntar el archivo.");
    } finally {
      setSubiendoAdjunto(false);
    }
  }

  function quitarAdjunto(idx) {
    setAdjuntos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function enviarNuevoTicket(e) {
    e.preventDefault();
    if (!mensaje.trim()) {
      setErrorNuevo("Escribí el detalle antes de enviar.");
      return;
    }
    setErrorNuevo("");
    setEnviando(true);
    try {
      await createTicket({ categoria, mensaje: mensaje.trim(), rutaOrigen: "presupuestador", adjuntos });
      setMensaje("");
      setAdjuntos([]);
      setEnviado(true);
      setTimeout(() => setEnviado(false), 4000);
    } catch (err) {
      setErrorNuevo(err.message || String(err));
    } finally {
      setEnviando(false);
    }
  }

  async function enviarRespuesta(e) {
    e.preventDefault();
    if (!seleccionado || !respuesta.trim()) return;
    try {
      await addMyTicketMessage(seleccionado.id, { mensaje: respuesta.trim() });
      setRespuesta("");
      await abrirTicket(seleccionado.id);
    } catch (err) {
      setErrorLista(err.message || String(err));
    }
  }

  return (
    <div className="container" style={{ maxWidth: 640, margin: "20px auto" }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <Button variant={tab === "nuevo" ? "primary" : "ghost"} onClick={() => setTab("nuevo")}>
            Nuevo ticket
          </Button>
          <Button variant={tab === "mios" ? "primary" : "ghost"} onClick={() => setTab("mios")}>
            Mis tickets
          </Button>
        </div>

        {tab === "nuevo" && (
          <form onSubmit={enviarNuevoTicket}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Categoría</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e0e0e0" }}
              >
                {TICKET_CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Contanos tu ticket</label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={6}
                placeholder="Escribí acá el detalle..."
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e0e0e0", resize: "vertical" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Adjuntar foto, video o PDF (opcional)</label>
              <input
                type="file"
                accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf"
                multiple
                onChange={onSeleccionarArchivos}
                disabled={subiendoAdjunto || adjuntos.length >= 5}
              />
              {subiendoAdjunto && <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Procesando...</div>}
              {adjuntos.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {adjuntos.map((a, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        fontSize: 12, padding: "4px 8px", marginBottom: 4,
                        borderRadius: 6, border: "1px solid #e0e0e0",
                      }}
                    >
                      <span>{formatTicketAttachmentMeta(a)}</span>
                      <button
                        type="button"
                        onClick={() => quitarAdjunto(idx)}
                        style={{ background: "none", border: "none", color: "#d93025", cursor: "pointer", padding: 0 }}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errorNuevo && <div style={{ color: "#d93025", fontSize: 13, marginBottom: 8 }}>⚠ {errorNuevo}</div>}
            {enviado && <div style={{ color: "#1f7a45", fontSize: 13, marginBottom: 8 }}>¡Listo! Tu ticket fue enviado.</div>}

            <Button type="submit" disabled={enviando} style={{ width: "100%" }}>
              {enviando ? "Enviando..." : "Enviar ticket"}
            </Button>
          </form>
        )}

        {tab === "mios" && !seleccionado && (
          <div>
            {cargando && <div style={{ fontSize: 13, color: "#666" }}>Cargando...</div>}
            {errorLista && <div style={{ color: "#d93025", fontSize: 13 }}>⚠ {errorLista}</div>}
            {!cargando && misTickets.length === 0 && (
              <div style={{ fontSize: 13, color: "#666" }}>Todavía no enviaste ningún ticket.</div>
            )}
            {misTickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => abrirTicket(t.id)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 10px", marginBottom: 6, borderRadius: 8,
                  border: "1px solid #e0e0e0", background: "transparent", cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.categoria}</div>
                <div style={{ fontSize: 12, color: "#666", margin: "2px 0" }}>
                  {new Date(t.created_at).toLocaleString()}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_COLOR[t.estado] || "#333" }}>
                  {ESTADO_LABEL[t.estado] || t.estado}
                </span>
              </button>
            ))}
          </div>
        )}

        {tab === "mios" && seleccionado && (
          <div>
            <button
              type="button"
              onClick={() => setSeleccionado(null)}
              style={{ background: "none", border: "none", color: "#1f7a45", cursor: "pointer", padding: 0, marginBottom: 8 }}
            >
              ← Volver
            </button>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{seleccionado.categoria}</div>
            <span style={{ fontSize: 11, fontWeight: 700, color: ESTADO_COLOR[seleccionado.estado] || "#333" }}>
              {ESTADO_LABEL[seleccionado.estado] || seleccionado.estado}
            </span>
            <div style={{ fontSize: 13, marginTop: 8, whiteSpace: "pre-wrap" }}>{seleccionado.mensaje}</div>

            {(seleccionado.adjuntos || []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {seleccionado.adjuntos.map((a, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => openTicketAttachment(a)}
                    onDoubleClick={() => downloadTicketAttachment(a)}
                    title={`${formatTicketAttachmentMeta(a)} (clic para ver, doble clic para descargar)`}
                    style={{ border: "1px solid #e0e0e0", borderRadius: 6, padding: 4, background: "transparent", cursor: "pointer", fontSize: 11 }}
                  >
                    {isImageTicketAttachment(a) ? (
                      <img src={a.data_url} alt={a.name} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, display: "block" }} />
                    ) : (
                      <span>📎 {formatTicketAttachmentMeta(a)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: 10, borderTop: "1px solid #e0e0e0", paddingTop: 8 }}>
              {(seleccionado.mensajes || []).map((m) => (
                <div key={m.id} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "#666" }}>
                    {m.es_admin ? (m.autor_username || "Soporte") : "Vos"} · {new Date(m.created_at).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{m.mensaje}</div>
                </div>
              ))}
              {(!seleccionado.mensajes || seleccionado.mensajes.length === 0) && (
                <div style={{ fontSize: 13, color: "#666" }}>Todavía no hay respuestas.</div>
              )}
            </div>

            {seleccionado.estado !== "closed" && (
              <form onSubmit={enviarRespuesta} style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  placeholder="Agregar un comentario..."
                  style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #e0e0e0" }}
                />
                <Button type="submit">Enviar</Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
