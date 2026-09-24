// src/pages/TutorialPage/index.jsx — tutorial de uso de todo el Presupuestador.
// Se abre desde el apartado "¿Cómo se usa el Presupuestador?" al pie del panel
// de "Reportar error" (TicketWidget). Lo ve cualquier usuario logueado: por
// defecto muestra solo las secciones de sus roles, con un botón para ver todo.
// El contenido vive en content.js; acá solo se arma el índice, el filtro y el
// render de cada bloque.
import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../domain/auth/store.js";
import Button from "../../ui/Button.jsx";
import { ROLE_LABELS, TUTORIAL_SECTIONS } from "./content.js";

const ROLE_FLAGS = [
  ["superuser", "is_superuser"],
  ["distribuidor", "is_distribuidor"],
  ["vendedor", "is_vendedor"],
  ["enc_comercial", "is_enc_comercial"],
  ["rev_tecnica", "is_rev_tecnica"],
  ["medidor", "is_medidor"],
  ["logistica", "is_logistica"],
  ["administracion", "is_administracion"],
];

function userRoleKeys(user) {
  return ROLE_FLAGS.filter(([, flag]) => !!user?.[flag]).map(([key]) => key);
}

function sectionIsForUser(section, roleKeys) {
  if (section.roles.includes("todos")) return true;
  if (roleKeys.includes("superuser")) return true;
  return section.roles.some((r) => roleKeys.includes(r));
}

// Texto plano de una sección, para el buscador.
function sectionText(section) {
  const parts = [section.title, section.intro || ""];
  for (const b of section.blocks || []) {
    if (b.text) parts.push(b.text);
    if (b.title) parts.push(b.title);
    for (const it of b.items || []) parts.push(typeof it === "string" ? it : `${it.term} ${it.text}`);
  }
  return parts.join(" ").replace(/\*\*/g, "");
}

function normalize(str) {
  return String(str || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Marcado mínimo: **texto** se muestra en negrita (se usa para los nombres de
// botones y pantallas, así el usuario los reconoce en la app).
function Rich({ text }) {
  const parts = String(text || "").split("**");
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>));
}

function Block({ block }) {
  switch (block.type) {
    case "p":
      return <p className="tutorial-p"><Rich text={block.text} /></p>;
    case "sub":
      return <h4 className="tutorial-sub">{block.text}</h4>;
    case "steps":
      return (
        <ol className="tutorial-steps">
          {block.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}
        </ol>
      );
    case "list":
      return (
        <ul className="tutorial-list">
          {block.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}
        </ul>
      );
    case "defs":
      return (
        <dl className="tutorial-defs">
          {block.items.map((it, i) => (
            <div key={i} className="tutorial-def">
              <dt>{it.term}</dt>
              <dd><Rich text={it.text} /></dd>
            </div>
          ))}
        </dl>
      );
    case "flow":
      return (
        <div className="tutorial-flow" role="list">
          {block.items.map((it, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="tutorial-flow-arrow" aria-hidden="true">→</span>}
              <span className="tutorial-flow-step" role="listitem">{it}</span>
            </Fragment>
          ))}
        </div>
      );
    case "tip":
    case "warn":
      return (
        <div className={`tutorial-callout tutorial-callout--${block.type}`}>
          <span className="tutorial-callout-icon" aria-hidden="true">{block.type === "tip" ? "💡" : "⚠️"}</span>
          <div>
            {block.title && <div className="tutorial-callout-title">{block.title}</div>}
            <Rich text={block.text} />
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function TutorialPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const roleKeys = useMemo(() => userRoleKeys(user), [user]);
  const isSuperuser = roleKeys.includes("superuser");

  // Superusuario ve todo igual, así que el filtro "de mi rol" no le cambia nada.
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");

  const visibleSections = useMemo(() => {
    const q = normalize(query.trim());
    return TUTORIAL_SECTIONS.filter((s) => {
      if (!showAll && !sectionIsForUser(s, roleKeys)) return false;
      if (q && !normalize(sectionText(s)).includes(q)) return false;
      return true;
    });
  }, [showAll, query, roleKeys]);

  const hiddenByRole = TUTORIAL_SECTIONS.filter((s) => !sectionIsForUser(s, roleKeys)).length;

  function goToSection(id) {
    document.getElementById(`tutorial-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const roleText = roleKeys.map((r) => ROLE_LABELS[r]).filter(Boolean).join(" / ");

  return (
    <div className="container">
      <div className="spacer" />
      <div className="card tutorial-hero">
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: 0, color: "var(--dg-petrol)" }}>📘 Tutorial del Presupuestador</h2>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Cómo usar el programa de punta a punta: armar presupuestos, seguirlos hasta la Nota de Venta y qué hace cada área.
            {roleText ? <> Estás viendo lo que corresponde a tu rol: <strong>{roleText}</strong>.</> : null}
          </div>
        </div>
        <div className="tutorial-hero-actions">
          <input
            className="tutorial-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en el tutorial..."
            aria-label="Buscar en el tutorial"
          />
          {!isSuperuser && hiddenByRole > 0 && (
            <Button variant="secondary" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Ver solo lo de mi rol" : `Ver todo el programa (+${hiddenByRole})`}
            </Button>
          )}
        </div>
      </div>

      <div className="spacer" />

      <div className="tutorial-layout">
        <nav className="card tutorial-toc" aria-label="Índice del tutorial">
          <div className="tutorial-toc-title">Índice</div>
          {visibleSections.length === 0 && <div className="muted">Sin resultados.</div>}
          {visibleSections.map((s, i) => (
            <button key={s.id} type="button" className="tutorial-toc-item" onClick={() => goToSection(s.id)}>
              <span className="tutorial-toc-num">{i + 1}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </nav>

        <div className="tutorial-content">
          {visibleSections.length === 0 && (
            <div className="card">
              <div className="muted" style={{ fontSize: 14 }}>
                No encontramos "{query}" en el tutorial. Probá con otra palabra
                {!showAll && !isSuperuser && hiddenByRole > 0 ? ", o tocá \"Ver todo el programa\"" : ""}.
              </div>
            </div>
          )}

          {visibleSections.map((s, i) => (
            <section key={s.id} id={`tutorial-${s.id}`} className="card tutorial-section">
              <div className="tutorial-section-head">
                <h3 className="tutorial-section-title">
                  <span className="tutorial-toc-num">{i + 1}</span> {s.title}
                </h3>
                {!s.roles.includes("todos") && (
                  <div className="tutorial-chips">
                    {s.roles.map((r) => (
                      <span key={r} className={`tutorial-chip${roleKeys.includes(r) ? " tutorial-chip--mine" : ""}`}>
                        {ROLE_LABELS[r] || r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {s.intro && <p className="tutorial-intro"><Rich text={s.intro} /></p>}
              {(s.blocks || []).map((b, bi) => <Block key={bi} block={b} />)}

              {s.goTo && (s.goTo.can ? s.goTo.can(user) : sectionIsForUser(s, roleKeys)) && (
                <div style={{ marginTop: 12 }}>
                  <Button variant="secondary" onClick={() => navigate(s.goTo.path)}>{s.goTo.label} →</Button>
                </div>
              )}
            </section>
          ))}

          <div className="card tutorial-section">
            <p className="tutorial-p" style={{ margin: 0 }}>
              ¿Algo del sistema no funciona como dice acá, o no encontrás lo que buscás? Tocá el <strong>botón verde redondo de abajo a
              la derecha</strong> → <strong>Reportar error</strong> y contanos qué pasó (podés adjuntar una captura). Las respuestas te
              llegan en <strong>Mis consultas</strong>, dentro del mismo botón.
            </p>
          </div>
        </div>
      </div>
      <div className="spacer" />
    </div>
  );
}
