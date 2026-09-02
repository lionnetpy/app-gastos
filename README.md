# Mis Gastos

App web **PWA instalable** de control personal de ingresos y gastos, construida con **Angular + Tailwind CSS**, con datos en la nube vía **Firebase** (Firestore + Authentication). Sin backend propio, sin costo (plan gratuito Spark) y con login de Google que funciona para cualquier persona sin configuración adicional.

- **Autenticación:** Firebase Auth con proveedor Google (credenciales verificadas por Google — sin pantallas de consentimiento, usuarios de prueba ni orígenes autorizados).
- **Datos:** Firebase Firestore, aislados por usuario con reglas de seguridad (cada cuenta solo ve sus datos).
- **Hosting:** Netlify (gratuito). PWA instalable desde el navegador (no requiere Play Store).

## Modelo de datos (Firestore, por usuario)

| Colección | Contenido |
|---|---|
| `usuarios/{uid}` | Perfil: email, nombre, foto, fecha de alta |
| `usuarios/{uid}/movimientos/{id}` | Fecha, Usuario, Tipo (Entrada/Salida), Categoría, Monto, Descripción |
| `usuarios/{uid}/categorias/{id}` | Tipo, Nombre |
| `usuarios/{uid}/config/principal` | `saldoInicial` |

Al primer inicio de sesión se crean automáticamente las categorías predeterminadas
(Salida: Casa, Auto, Alquiler, Luz, Agua, Comida, Recreación, Otros — Entrada: Sueldo, Ingreso extra, Devolución, Otros).

## Lógica del dashboard (mes actual)

- **Saldo de meses anteriores** = saldo inicial (Config) + todos los movimientos con fecha anterior al mes en curso.
- **Saldo actual total** = saldo de meses anteriores + ingresos del mes − egresos del mes.
- **Gastado / Ingresado del mes** = suma de Salidas / Entradas del mes.
- Desglose por categoría del mes actual.

---

## Configuración de Firebase (una sola vez, ~10 minutos, gratis)

1. Entrar a [console.firebase.google.com](https://console.firebase.google.com) con la cuenta de Google que quieras usar como dueña → **Crear proyecto** (plan gratuito **Spark**, sin tarjeta de crédito).
2. Menú **Authentication → Sign-in method** → activar **Google** → Guardar.
3. Menú **Firestore Database** → **Crear base de datos** → modo **production** → región cercana (ej. `southamerica-east1`).
4. Publicar las **reglas de seguridad** (copiar el contenido de `firestore.rules` → pestaña "Reglas" de Firestore → Publicar). Esto garantiza que cada usuario solo lee/escribe sus propios datos.
5. **Configuración del proyecto → Tus apps → App web (`</>`)** → registrar app → copiar la configuración.
6. Pegarla en `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIza...',
    authDomain: 'tu-proyecto.firebaseapp.com',
    projectId: 'tu-proyecto',
    storageBucket: 'tu-proyecto.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc...',
  },
};
```

7. Si vas a desplegar en Netlify: en **Authentication → Settings → Authorized domains**, agregar el dominio final (ej. `https://migastos.netlify.app`) además de `localhost`.

No hay más pasos: no hay pantalla de consentimiento que verificar, ni usuarios de prueba, ni orígenes de JavaScript que registrar. El login de Google funciona para cualquiera desde el primer clic.

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
4. Agregar el dominio final a los **Authorized domains** de Firebase Auth (paso 7 de arriba).

Opción B — Netlify CLI:

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist/app-gastos/browser
```

## Instalación como PWA

- **Móvil (Android/Chrome):** menú del navegador → "Agregar a pantalla de inicio" / "Instalar app".
- **Desktop (Chrome/Edge):** ícono de instalar en la barra de direcciones → "Instalar".
- La app funciona offline una vez abierta (service worker con caché de assets estáticos); los datos se sincronizan cuando hay conexión.