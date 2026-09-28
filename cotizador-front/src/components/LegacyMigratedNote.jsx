import { isLegacyImport } from "../utils/legacyImport.js";

// Leyenda chica bajo el nombre del cliente en los listados: marca los portones
// migrados del sistema anterior (no renderiza nada para el resto).
export default function LegacyMigratedNote({ row }) {
  if (!isLegacyImport(row)) return null;
  return (
    <div className="muted" style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }} title="Vendido en el sistema anterior: no genera NP/NV en Odoo">
      Migrado del sistema anterior
    </div>
  );
}
