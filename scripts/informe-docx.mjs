/* Genera el Informe Semanal en Word (.docx) con el mismo formato del correo,
   para adjuntarlo. Basado en el formato "Informe_Semanal_S33_Vinko.docx". */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, BorderStyle, ShadingType, VerticalAlign,
} from "docx";

const AZUL = "1F3A6E", NARANJA = "E8804A", TXT = "222222", LINEA = "C9CED9", ROT = "EDEFF4";
const FONT = "Calibri";
const ANCHO = 9638; // ancho útil A4 con márgenes de 2 cm, en twips

const filas = arr => (Array.isArray(arr) ? arr : []).filter(r => r && Object.values(r).some(v => String(v ?? "").trim()));
const run = (text, o = {}) => new TextRun({ text: String(text ?? ""), font: FONT, size: o.size ?? 19, bold: o.bold, italics: o.italics, color: o.color ?? TXT });
const borde = { style: BorderStyle.SINGLE, size: 4, color: LINEA };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };

function celda(text, { head = false, center = false, w, bold, italics, fill, rowSpan } = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    rowSpan,
    verticalAlign: VerticalAlign.CENTER,
    shading: head ? { type: ShadingType.CLEAR, fill: AZUL, color: "auto" } : fill ? { type: ShadingType.CLEAR, fill, color: "auto" } : undefined,
    borders: head ? { top: { style: BorderStyle.SINGLE, size: 4, color: AZUL }, bottom: { style: BorderStyle.SINGLE, size: 4, color: AZUL }, left: { style: BorderStyle.SINGLE, size: 4, color: AZUL }, right: { style: BorderStyle.SINGLE, size: 4, color: AZUL } } : bordes,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [run(text, { bold: head || bold, italics, color: head ? "FFFFFF" : TXT, size: head ? 18 : 19 })],
    })],
  });
}

const pct = [0.30, 0.34, 0.14, 0.22].map(p => Math.round(ANCHO * p));
function tabla(cab, cuerpo, anchos = pct) {
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA },
    columnWidths: anchos,
    rows: [new TableRow({ tableHeader: true, children: cab.map((h, i) => celda(h, { head: true, center: i > 0, w: anchos[i] })) }), ...cuerpo],
  });
}
const filaSimple = (vals, anchos = pct) => new TableRow({ children: vals.map((v, i) => celda(v, { center: i > 0, w: anchos[i] })) });

function tablaNaves(primera, lista) {
  const r = filas(lista);
  const cuerpo = r.length ? r.map(x => filaSimple([x.nave, x.faena, x.tons, x.fecha])) : [filaSimple(["S/N", "", "", ""])];
  return tabla([primera, "Faena", "Tons.", "Fecha Atn."], cuerpo);
}
function tablaEta(lista) {
  const r = filas(lista);
  const cuerpo = r.length ? r.map(x => filaSimple([x.nave, x.faena, x.sitio, x.eta])) : [filaSimple(["S/N", "", "", ""])];
  return tabla(["Nave", "Faena", "Sitio", "ETA"], cuerpo);
}
function tablaUtil(inf) {
  const a = [0.28, 0.34, 0.19, 0.19].map(p => Math.round(ANCHO * p));
  const meses = filas(inf.utilizacion);
  const rot = celda(`Utilización ${inf.anio}`, { center: true, w: a[0], fill: ROT, rowSpan: meses.length + 1 });
  const rows = meses.map((m, i) => new TableRow({ children: [...(i === 0 ? [rot] : []), celda(m.mes, { w: a[1] }), celda(m.norte, { center: true, w: a[2] }), celda(m.sur, { center: true, w: a[3] })] }));
  const corte = inf.anualCorte ? ` (${inf.anualCorte})` : "";
  rows.push(new TableRow({ children: [...(meses.length ? [] : [rot]), celda(`% de ocupación anual${corte}`, { w: a[1], bold: true, italics: true }), celda(inf.anualNorte, { center: true, w: a[2], bold: true }), celda(inf.anualSur, { center: true, w: a[3], bold: true })] }));
  return tabla(["% Utilización Terminal", "Mes", "Norte", "Sur"], rows, a);
}

const seccion = t => new Paragraph({ spacing: { before: 320, after: 140 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AZUL, space: 3 } }, children: [run(t, { bold: true, size: 24, color: AZUL })] });
const sub = t => new Paragraph({ spacing: { before: 200, after: 80 }, children: [run(t, { bold: true, size: 19, color: AZUL })] });
const esp = () => new Paragraph({ spacing: { after: 60 }, children: [] });

export async function informeDocx(inf) {
  const nota = String(inf.nota || "").trim();
  const doc = new Document({
    creator: "Huachipato Terminal Portuario",
    title: `Informe Semanal de Operaciones · Semana ${inf.semana}`,
    styles: { default: { document: { run: { font: FONT, size: 19, color: TXT } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children: [
        new Paragraph({ children: [run("HUACHIPATO TERMINAL PORTUARIO", { bold: true, size: 16, color: AZUL })] }),
        new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: NARANJA, space: 4 } }, children: [run("Informe Semanal de Operaciones", { bold: true, size: 32 })] }),
        new Paragraph({ children: [run(inf.saludo || `Estimado Vinko, informe semana ${inf.semana}`, { size: 21 })] }),
        ...(nota ? nota.split("\n").map(l => new Paragraph({ children: [run(l, { size: 21 })] })) : []),
        seccion("GESTIÓN DE OPERACIONES"),
        sub("Naves atendidas Sitio Sur"), tablaNaves("Sitio Sur", inf.sur), esp(),
        sub("Naves atendidas Sitio Norte"), tablaNaves("Sitio Norte", inf.norte), esp(),
        sub("Naves a la gira"), tablaEta(inf.gira),
        seccion(`ETA PRÓXIMAS NAVES — SEMANA ${inf.semanaProximas || Number(inf.semana) + 1}`), tablaEta(inf.proximas),
        seccion("% UTILIZACIÓN TERMINAL"), tablaUtil(inf),
        new Paragraph({ spacing: { before: 360 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINEA, space: 6 } }, children: [run("Huachipato Terminal Portuario · Grupo CAP", { italics: true, size: 16, color: "666666" })] }),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}
