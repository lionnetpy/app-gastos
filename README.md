# Mis Gastos

App web PWA instalable de control personal de ingresos y gastos, construida con **Angular + Tailwind CSS** y usando **Google Sheets** como base de datos (una hoja de cálculo por usuario, sin backend propio).

- **Autenticación:** Google Identity Services (OAuth 2.0 del propio usuario).
- **Datos:** Google Sheets API v4, llamada directa desde el navegador.
- **Selección de hoja:** Google Picker API (el usuario elige su hoja de forma visual, sin copiar IDs).
- **Hosting:** Netlify (capa gratuita). PWA instalable desde el navegador (no requiere Play Store).

---

## Estructura de la hoja (se crea automáticamente al vincular)

| Pestaña | Columnas |
|---|---|
| `Movimientos` | Fecha, Usuario, Tipo (Entrada/Salida), Categoría, Monto, Descripción |
| `Categorias` | Tipo, Nombre |
| `Usuarios` | Correo, Fecha de alta |
| `Config` | Clave, Valor (ej. `Saldo inicial`) |

Al vincular una hoja vacía, la app crea las pestañas, carga las categorías predeterminadas
(Salida: Casa, Auto, Alquiler, Luz, Agua, Comida, Recreación, Otros — Entrada: Sueldo, Ingreso extra, Devolución, Otros)
y registra el correo del usuario en `Usuarios`.

## Lógica del dashboard (mes actual)

- **Saldo de meses anteriores** = saldo inicial (`Config` → `Saldo inicial`) + todos los movimientos con fecha anterior al mes en curso.
- **Saldo actual total** = saldo de meses anteriores + ingresos del mes − egresos del mes.
- **Gastado / Ingresado del mes** = suma de Salidas / Entradas del mes.
- Desglose por categoría del mes actual.

---

## Configuración en Google Cloud (una sola vez)

1. Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilitar **Google Sheets API** y **Google Drive API** (APIs y servicios → Biblioteca).
3. Crear **OAuth Client ID** tipo **"Web application"** (APIs y servicios → Credenciales → Crear credenciales → ID de cliente OAuth):
   - "Orígenes de JavaScript autorizados": agregar `http://localhost:4200` (desarrollo) y el dominio final de Netlify (ej. `https://migastos.netlify.app`).
4. Crear una **API Key** (para Google Picker).
5. **Pantalla de consentimiento de OAuth** (APIs y servicios → Pantalla de consentimiento de OAuth):
   - Completar el **correo electrónico de asistencia** (obligatorio, sin esto el login falla con error).
   - Mientras la app esté en estado **"En prueba" (Testing)**, agregar tu correo (y el de quien vaya a probar) en **Usuarios de prueba**. Sin esto, Google muestra *"La app no completó el proceso de verificación… Error 403: access_denied"*.
   - Para uso público, **Publicar la aplicación** (estado "En producción"): aparecerá el aviso de app no verificada, pero los usuarios pueden continuar desde "Opciones avanzadas → Continuar". La verificación formal de Google no aplica a proyectos personales.
6. Pegar ambos valores en `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  googleClientId: 'xxxx.apps.googleusercontent.com',
  googleApiKey: 'xxxxx',
};
```

> Si la app ya fue desplegada y cambiás el dominio de Netlify, agregá el nuevo dominio a los
> "Orígenes de JavaScript autorizados" del OAuth Client ID y recompilá.

---

## Desarrollo

```bash
npm install
npm start        # http://localhost:4200
```

## Build de producción

```bash
npm run build
# salida: dist/app-gastos/browser
```

## Despliegue en Netlify

Opción A — UI de Netlify:

1. Subir el repo a GitHub y crear un sitio nuevo en Netlify desde el repo.
2. Build command: `npm run build` — Publish directory: `dist/app-gastos/browser`.
3. El archivo `netlify.toml` ya incluye el redirect SPA (`/* → /index.html 200`).

Opción B — Netlify CLI:

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist/app-gastos/browser
```

Después del primer despliegue, agregar el dominio final (`https://<nombre>.netlify.app`) a los
**orígenes de JavaScript autorizados** del OAuth Client ID y recompilar/re-desplegar.

## Instalación como PWA

- **Móvil (Android/Chrome):** menú del navegador → "Agregar a pantalla de inicio" / "Instalar app".
- **Desktop (Chrome/Edge):** ícono de instalar en la barra de direcciones → "Instalar".
- La app funciona offline una vez abierta (service worker con caché de assets estáticos).