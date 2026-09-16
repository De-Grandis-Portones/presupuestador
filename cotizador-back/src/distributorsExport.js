import ExcelJS from "exceljs";

const HEADER_BG = "FF2C5F7C";
const HEADER_FG = "FFFFFFFF";
const GOOD_BG = "FFE1EFE4";
const GOOD_FG = "FF1F6B3D";
const RUST_BG = "FFF6E6DB";
const RUST_FG = "FF9C4317";
const STRIPE_BG = "FFF6F4EE";
const BORDER = { style: "thin", color: { argb: "FFDCD6C7" } };

const COLUMNS = [
  { header: "Nombre", key: "nombre", width: 30 },
  { header: "Usuario", key: "usuario", width: 30 },
  { header: "Lista de precio", key: "lista_precio", width: 18 },
  { header: "Teléfono", key: "telefono", width: 16 },
  { header: "Estado", key: "estado", width: 12 },
  { header: "Último presupuesto", key: "ultimo_presupuesto", width: 16 },
  { header: "Total presupuestos", key: "total_presupuestos", width: 14 },
  { header: "Dirección", key: "direccion", width: 32 },
  { header: "Localidad", key: "localidad", width: 18 },
  { header: "Provincia", key: "provincia", width: 16 },
  { header: "Vendedor", key: "vendedor", width: 20 },
  { header: "Cuenta", key: "cuenta", width: 14 },
];

export async function buildDistributorsWorkbook(rows) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Presupuestador";
  wb.created = new Date();

  const ws = wb.addWorksheet("Distribuidores", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS;
  ws.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + COLUMNS.length)}1` };

  const headerRow = ws.getRow(1);
  headerRow.height = 20;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FG } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.alignment = { vertical: "middle" };
    cell.border = { top: BORDER, left: BORDER, right: BORDER, bottom: BORDER };
  });

  rows.forEach((data, i) => {
    const row = ws.addRow(data);
    const stripe = i % 2 === 1 ? STRIPE_BG : null;
    row.eachCell((cell) => {
      cell.font = { size: 10.5 };
      cell.border = { top: BORDER, left: BORDER, right: BORDER, bottom: BORDER };
      if (stripe) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: stripe } };
    });

    const estadoCell = row.getCell("estado");
    const isActivo = data.estado === "Activo";
    estadoCell.font = { bold: true, size: 10.5, color: { argb: isActivo ? GOOD_FG : RUST_FG } };
    estadoCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isActivo ? GOOD_BG : RUST_BG } };
    estadoCell.alignment = { horizontal: "center" };

    row.getCell("total_presupuestos").alignment = { horizontal: "center" };
  });

  ws.views = [{ state: "frozen", ySplit: 1, showGridLines: false }];

  const notes = wb.addWorksheet("Notas");
  notes.getColumn(1).width = 100;
  const notesLines = [
    ["Distribuidores del presupuestador", { bold: true, size: 14 }],
    [`Generado el ${new Date().toLocaleDateString("es-AR")} directo desde el Gestor de usuarios.`, {}],
    ["", {}],
    ["Estado: 'Inactivo' significa que esa cuenta no generó presupuestos en los últimos 2 meses. Es un cálculo de este reporte, no cambia el estado real de la cuenta (columna 'Cuenta', que sí refleja si el login está habilitado).", {}],
    ["", {}],
    ["Dirección, Localidad y Provincia salen del partner de Odoo vinculado al distribuidor (odoo_partner_id). Si un distribuidor no tiene partner de Odoo asignado, o el partner no tiene esos datos cargados, quedan vacíos.", {}],
    ["Lista de precio sale de Odoo (product.pricelist); si Odoo no responde en el momento de la descarga, se muestra el ID interno en su lugar.", {}],
  ];
  notesLines.forEach(([text, font], i) => {
    const cell = notes.getCell(i + 1, 1);
    cell.value = text;
    cell.font = { name: "Calibri", ...font };
    cell.alignment = { wrapText: true, vertical: "top" };
  });
  notes.views = [{ showGridLines: false }];

  return wb.xlsx.writeBuffer();
}
