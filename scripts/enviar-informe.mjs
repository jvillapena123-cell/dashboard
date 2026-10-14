/* Envía el Informe Semanal de Operaciones por correo.
   Lo ejecuta GitHub Actions los viernes (.github/workflows/informe-semanal.yml).

   Variables de entorno (secretos del repositorio):
     FIREBASE_SERVICE_ACCOUNT  JSON de la cuenta de servicio de Firebase
     SMTP_USER, SMTP_PASS      correo corporativo y su contraseña (o contraseña de aplicación)
     SMTP_HOST, SMTP_PORT      opcionales; por defecto smtp.office365.com:587
     MAIL_FROM                 opcional; por defecto SMTP_USER
     AVISO_A                   opcional; a quién avisar si el informe no está cargado (por defecto MAIL_FROM)
   Modo (MODO):
     auto     solo envía el viernes desde las 13:00 hora de Chile, una vez por semana (uso programado)
     prueba   envía ahora SOLO al remitente, con asunto [PRUEBA]; no marca la semana como enviada
     forzar   envía ahora al destinatario real, aunque ya se haya enviado
   SEMANA (opcional): id de la semana, por ejemplo 2026-S42. Por defecto, la semana actual. */

import { readFileSync, existsSync } from "node:fs";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { renderInformeHTML, renderInformeTexto, asuntoInforme, semanaISO, idSemana, DESTINATARIO_DEFECTO } from "../informe-correo.js";
import { informeDocx } from "./informe-docx.mjs";

const ZONA = "America/Santiago";
const HORA_ENVIO = 13;
const env = k => (process.env[k] || "").trim();
const MODO = env("MODO") || "auto";
const SECO = env("SECO") === "1"; // genera el correo sin enviarlo ni tocar Firestore (para revisar)

function ahoraChile() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: ZONA, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false })
    .formatToParts(new Date()).map(x => [x.type, x.value]));
  return { dia: p.weekday, hora: Number(p.hour) % 24, fecha: new Date(Number(p.year), Number(p.month) - 1, Number(p.day)) };
}

function falta(k) { console.error(`Falta el secreto ${k}. Revise Settings → Secrets and variables → Actions.`); process.exit(1); }

async function main() {
  const ch = ahoraChile();
  console.log(`Hora de Chile: ${ch.dia} ${ch.hora}:xx · modo ${MODO}`);
  if (MODO === "auto" && (ch.dia !== "Fri" || ch.hora < HORA_ENVIO)) {
    console.log("No es viernes desde las 13:00 en Chile. Nada que hacer.");
    return;
  }
  const w = semanaISO(ch.fecha);
  const id = env("SEMANA") || idSemana(w.anio, w.semana);

  let inf, ref;
  if (env("INFORME_JSON")) { // para pruebas locales sin Firebase
    inf = JSON.parse(readFileSync(env("INFORME_JSON"), "utf8"));
  } else {
    const sa = env("FIREBASE_SERVICE_ACCOUNT") || falta("FIREBASE_SERVICE_ACCOUNT");
    const cred = JSON.parse(existsSync(sa) ? readFileSync(sa, "utf8") : sa);
    admin.initializeApp({ credential: admin.credential.cert(cred) });
    ref = admin.firestore().collection("informe_semanal").doc(id);
    const snap = await ref.get();
    inf = snap.exists ? snap.data() : null;
  }

  const usuario = env("SMTP_USER") || (SECO ? "remitente@ejemplo.cl" : falta("SMTP_USER"));
  const remitente = env("MAIL_FROM") || usuario;
  const transporte = SECO ? null : nodemailer.createTransport({
    host: env("SMTP_HOST") || "smtp.office365.com",
    port: Number(env("SMTP_PORT") || 587),
    secure: Number(env("SMTP_PORT") || 587) === 465,
    requireTLS: true,
    auth: { user: usuario, pass: env("SMTP_PASS") || falta("SMTP_PASS") },
  });

  if (!inf) {
    const aviso = env("AVISO_A") || remitente;
    console.log(`No hay informe guardado para ${id}.`);
    // En modo automático se avisa una sola vez (en la ejecución de las 13:xx), no en cada reintento
    if (MODO === "auto" && ch.hora !== HORA_ENVIO) return;
    console.log(`Aviso a ${aviso}.`);
    if (!SECO) await transporte.sendMail({
      from: `"Informe Semanal HTP" <${remitente}>`, to: aviso,
      subject: `No se envió el Informe Semanal (${id})`,
      text: `El informe de la semana ${id} no está cargado en el dashboard (pestaña Informe semanal), así que no se envió.\n\nCárguelo y luego ejecute el envío manual desde GitHub: Actions → Informe semanal → Run workflow → modo "forzar".`,
    });
    process.exitCode = MODO === "auto" ? 0 : 1;
    return;
  }
  if (inf.pausado && MODO !== "prueba") { console.log(`La semana ${id} está marcada "No enviar esta semana".`); return; }
  if (inf.enviado && inf.enviado.fecha && MODO === "auto") { console.log(`La semana ${id} ya se envió el ${inf.enviado.fecha}.`); return; }

  const prueba = MODO === "prueba";
  const para = prueba ? remitente : (inf.para || DESTINATARIO_DEFECTO);
  const cc = prueba ? undefined : (inf.cc || undefined);
  const asunto = (prueba ? "[PRUEBA] " : "") + asuntoInforme(inf);
  const html = renderInformeHTML(inf);
  const adjunto = await informeDocx(inf);
  const nombre = `Informe_Semanal_S${String(inf.semana).padStart(2, "0")}_${inf.anio}.docx`;

  if (SECO) {
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync("salida", { recursive: true });
    writeFileSync("salida/correo.html", html);
    writeFileSync(`salida/${nombre}`, adjunto);
    console.log(`SECO: para ${para}${cc ? ` cc ${cc}` : ""} · ${asunto} · salida/correo.html y salida/${nombre}`);
    return;
  }

  const r = await transporte.sendMail({
    from: `"Huachipato Terminal Portuario" <${remitente}>`,
    to: para, cc, subject: asunto, html, text: renderInformeTexto(inf),
    attachments: [{ filename: nombre, content: adjunto }],
  });
  console.log(`Enviado a ${para}${cc ? ` (cc ${cc})` : ""}: ${r.messageId}`);
  if (!prueba && ref) await ref.set({ enviado: { fecha: new Date().toISOString(), a: [para, cc].filter(Boolean).join(", ") } }, { merge: true });
}

main().catch(e => {
  console.error(e);
  if (/535|Authentication unsuccessful|SmtpClientAuthentication/i.test(String(e && (e.response || e.message)))) {
    console.error("\nEl servidor rechazó el usuario/contraseña. En Microsoft 365 es frecuente que el envío SMTP esté deshabilitado para la cuenta: pida a TI que habilite 'SMTP autenticado' para su buzón, o use una contraseña de aplicación si tiene MFA.");
  }
  process.exit(1);
});
