/* Informe Semanal de Operaciones · HTP
   Plantilla compartida: la usa la pestaña "Informe semanal" (vista previa)
   y el envío automático de los viernes (scripts/enviar-informe.mjs).
   Sin dependencias: funciona en el navegador y en Node. */

export const DESTINATARIO_DEFECTO = "vyap@csh.cl";

/* Semana ISO (lunes a domingo) de una fecha */
export function semanaISO(fecha = new Date()) {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { anio: d.getUTCFullYear(), semana: Math.ceil(((d - inicio) / 864e5 + 1) / 7) };
}
export const idSemana = (anio, semana) => `${anio}-S${String(semana).padStart(2, "0")}`;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const filas = arr => (Array.isArray(arr) ? arr : []).filter(r => r && Object.values(r).some(v => String(v ?? "").trim()));

export function asuntoInforme(inf) {
  return `Informe Semanal de Operaciones HTP · Semana ${inf.semana}`;
}

const AZUL = "#1F3A6E", NARANJA = "#E8804A", TXT = "#222222", LINEA = "#C9CED9", FONDO_ROT = "#EDEFF4";
const F = "font-family:Calibri,'Segoe UI',Arial,sans-serif;";

function tabla(cabeceras, cuerpo, anchos) {
  const th = cabeceras.map((h, i) =>
    `<th align="${i ? "center" : "left"}" width="${anchos[i]}" style="${F}background:${AZUL};color:#FFFFFF;font-size:12px;font-weight:bold;padding:7px 9px;border:1px solid ${AZUL};">${esc(h)}</th>`).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;margin:0 0 18px;">
<tr>${th}</tr>${cuerpo}</table>`;
}
const td = (v, i, extra = "") =>
  `<td align="${i ? "center" : "left"}" style="${F}color:${TXT};font-size:13px;padding:7px 9px;border:1px solid ${LINEA};${extra}">${esc(v) || "&nbsp;"}</td>`;

function tablaNaves(titulo, primera, lista) {
  const rows = filas(lista);
  const cuerpo = rows.length
    ? rows.map(r => `<tr>${[r.nave, r.faena, r.tons, r.fecha].map((v, i) => td(v, i)).join("")}</tr>`).join("")
    : `<tr>${["S/N", "", "", ""].map((v, i) => td(v, i)).join("")}</tr>`;
  return subtitulo(titulo) + tabla([primera, "Faena", "Tons.", "Fecha Atn."], cuerpo, ["30%", "34%", "14%", "22%"]);
}
function tablaEta(lista) {
  const rows = filas(lista);
  const cuerpo = rows.length
    ? rows.map(r => `<tr>${[r.nave, r.faena, r.sitio, r.eta].map((v, i) => td(v, i)).join("")}</tr>`).join("")
    : `<tr>${["S/N", "", "", ""].map((v, i) => td(v, i)).join("")}</tr>`;
  return tabla(["Nave", "Faena", "Sitio", "ETA"], cuerpo, ["30%", "34%", "14%", "22%"]);
}
function tablaUtil(inf) {
  const meses = filas(inf.utilizacion);
  const n = meses.length + 1;
  const rot = `<td rowspan="${n}" align="center" style="${F}background:${FONDO_ROT};color:${TXT};font-size:13px;padding:7px 9px;border:1px solid ${LINEA};">Utilización ${esc(inf.anio)}</td>`;
  let cuerpo = meses.map((m, i) => `<tr>${i === 0 ? rot : ""}${td(m.mes, 1, "text-align:left;")}${td(m.norte, 1)}${td(m.sur, 1)}</tr>`).join("");
  const corte = inf.anualCorte ? ` (${inf.anualCorte})` : "";
  const b = "font-weight:bold;";
  cuerpo += `<tr>${meses.length ? "" : rot}${td(`% de ocupación anual${corte}`, 1, "text-align:left;font-style:italic;" + b)}${td(inf.anualNorte, 1, b)}${td(inf.anualSur, 1, b)}</tr>`;
  return tabla(["% Utilización Terminal", "Mes", "Norte", "Sur"], cuerpo, ["28%", "34%", "19%", "19%"]);
}
const seccion = t => `<p style="${F}margin:22px 0 10px;padding:0 0 5px;border-bottom:1px solid ${AZUL};color:${AZUL};font-size:15px;font-weight:bold;">${esc(t)}</p>`;
const subtitulo = t => `<p style="${F}margin:14px 0 6px;color:${AZUL};font-size:13px;font-weight:bold;">${esc(t)}</p>`;

/* HTML del correo, con estilos en línea para que se vea bien en Outlook */
export function renderInformeHTML(inf) {
  const saludo = inf.saludo || `Estimado Vinko, informe semana ${inf.semana}`;
  const nota = String(inf.nota || "").trim();
  const semProx = inf.semanaProximas || (Number(inf.semana) + 1);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(asuntoInforme(inf))}</title></head>
<body style="margin:0;padding:0;background:#F3F4F7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F7;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;background:#FFFFFF;border-collapse:collapse;"><tr><td style="padding:26px 28px 22px;">
<p style="${F}margin:0;color:${AZUL};font-size:11px;font-weight:bold;letter-spacing:.04em;">HUACHIPATO TERMINAL PORTUARIO</p>
<p style="${F}margin:4px 0 0;padding:0 0 8px;border-bottom:2px solid ${NARANJA};color:${TXT};font-size:22px;font-weight:bold;">Informe Semanal de Operaciones</p>
<p style="${F}margin:16px 0 0;color:${TXT};font-size:14px;">${esc(saludo)}</p>
${nota ? `<p style="${F}margin:8px 0 0;color:${TXT};font-size:14px;white-space:pre-line;">${esc(nota)}</p>` : ""}
${seccion("GESTIÓN DE OPERACIONES")}
${tablaNaves("Naves atendidas Sitio Sur", "Sitio Sur", inf.sur)}
${tablaNaves("Naves atendidas Sitio Norte", "Sitio Norte", inf.norte)}
${subtitulo("Naves a la gira")}
${tablaEta(inf.gira)}
${seccion(`ETA PRÓXIMAS NAVES — SEMANA ${semProx}`)}
${tablaEta(inf.proximas)}
${seccion("% UTILIZACIÓN TERMINAL")}
${tablaUtil(inf)}
<p style="${F}margin:18px 0 0;padding:8px 0 0;border-top:1px solid ${LINEA};color:#666666;font-size:11px;font-style:italic;">Huachipato Terminal Portuario · Grupo CAP</p>
</td></tr></table>
</td></tr></table>
</body></html>`;
}

/* Versión en texto plano (para clientes que no muestran HTML) */
export function renderInformeTexto(inf) {
  const l = [];
  const t = (tit, arr, campos) => {
    l.push("", tit);
    const r = filas(arr);
    if (!r.length) l.push("  S/N");
    r.forEach(x => l.push("  " + campos.map(c => x[c] || "-").join(" | ")));
  };
  l.push("HUACHIPATO TERMINAL PORTUARIO", "Informe Semanal de Operaciones", "", inf.saludo || `Estimado Vinko, informe semana ${inf.semana}`);
  if (inf.nota) l.push("", inf.nota);
  l.push("", "GESTIÓN DE OPERACIONES");
  t("Naves atendidas Sitio Sur (nave | faena | tons. | fecha)", inf.sur, ["nave", "faena", "tons", "fecha"]);
  t("Naves atendidas Sitio Norte (nave | faena | tons. | fecha)", inf.norte, ["nave", "faena", "tons", "fecha"]);
  t("Naves a la gira (nave | faena | sitio | ETA)", inf.gira, ["nave", "faena", "sitio", "eta"]);
  t(`ETA próximas naves — semana ${inf.semanaProximas || Number(inf.semana) + 1} (nave | faena | sitio | ETA)`, inf.proximas, ["nave", "faena", "sitio", "eta"]);
  l.push("", "% UTILIZACIÓN TERMINAL (mes | norte | sur)");
  filas(inf.utilizacion).forEach(m => l.push(`  ${m.mes} | ${m.norte || "-"} | ${m.sur || "-"}`));
  l.push(`  % de ocupación anual${inf.anualCorte ? ` (${inf.anualCorte})` : ""} | ${inf.anualNorte || "-"} | ${inf.anualSur || "-"}`);
  l.push("", "Huachipato Terminal Portuario · Grupo CAP");
  return l.join("\n");
}
