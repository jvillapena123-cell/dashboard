# Informe semanal automático (viernes 13:00)

Cada viernes a las 13:00, hora de Chile, GitHub envía el **Informe Semanal de Operaciones** a `vyap@csh.cl` desde el correo corporativo. El correo trae el informe en el cuerpo y adjunto en Word, con el mismo formato del S33.

## Uso semanal

1. En el dashboard, abra la pestaña **Informe semanal** (solo la ven los administradores).
2. Elija la semana. **Copiar semana anterior** trae las tablas de la semana pasada para editarlas.
3. Complete naves Sitio Sur y Norte, naves a la gira, ETA de las próximas naves y % de utilización.
4. Pulse **Guardar** antes del viernes a las 13:00. **Vista previa del correo** muestra exactamente lo que se enviará.

- Si una semana no hay que enviar, marque **No enviar esta semana**.
- Si el viernes a las 13:00 no hay informe guardado, no se envía nada a Vinko y le llega a usted un aviso.
- Cuando se envía, la semana queda marcada como **Enviado** con fecha y hora.

## Configuración (una sola vez)

### 1. Regla de Firebase
En Firebase Console → Firestore Database → **Reglas**, agregue dentro de `match /databases/{database}/documents { ... }` una regla para la colección nueva `informe_semanal`, usando la misma condición de administrador que ya tienen sus otras colecciones. Por ejemplo:

```
match /informe_semanal/{semana} {
  allow read, write: if request.auth != null
    && request.auth.token.email in ['SU_CORREO@dominio.cl'];
}
```

### 2. Cuenta de servicio de Firebase
Firebase Console → ⚙ Configuración del proyecto → **Cuentas de servicio** → *Generar nueva clave privada*. Se descarga un archivo `.json`. **No lo suba al repositorio.**

### 3. Secretos en GitHub
En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Todo el contenido del archivo `.json` del paso 2 |
| `SMTP_USER` | Su correo corporativo (el que envía) |
| `SMTP_PASS` | Su contraseña, o una *contraseña de aplicación* si usa verificación en dos pasos |
| `SMTP_HOST` | Opcional. Por defecto `smtp.office365.com` (Microsoft 365) |
| `SMTP_PORT` | Opcional. Por defecto `587` |
| `AVISO_A` | Opcional. A quién avisar si no hay informe cargado (por defecto, el remitente) |

> **Microsoft 365:** muchas empresas tienen deshabilitado el envío SMTP. Si la prueba falla con "Authentication unsuccessful" o "SmtpClientAuthentication is disabled", pida a TI que habilite **SMTP autenticado** para su buzón.

### 4. Prueba
GitHub → **Actions → Informe semanal → Run workflow**:
- `prueba`: envía el informe de la semana actual **solo a usted**, con asunto `[PRUEBA]`.
- `forzar`: envía ahora a Vinko, aunque ya se haya enviado.

## Cómo funciona

- `informe-correo.js`: plantilla del correo. La usan la vista previa del dashboard y el envío.
- `scripts/enviar-informe.mjs`: lee la semana en Firestore (`informe_semanal/2026-S42`), arma el correo y el Word, y los envía.
- `.github/workflows/informe-semanal.yml`: programación. GitHub trabaja en hora UTC y Chile cambia de horario, así que el envío corre los viernes entre las 16:05 y las 19:05 UTC y solo manda el correo cuando en Chile ya son las 13:00. Las ejecuciones siguientes son reintentos, y cada semana se envía una sola vez.
- GitHub pausa las tareas programadas de un repositorio que pasa 60 días sin cambios. Si eso ocurre, llega un aviso y se reactivan desde Actions.
