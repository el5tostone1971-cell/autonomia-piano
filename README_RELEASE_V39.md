# Autonomía Piano v39 — versión gratuita

**Estado:** release gratuita preparada para distribución y pruebas reales.

## Qué incluye
- Curso completo de 90 días.
- Lectura, ritmo, dos manos, técnica, oído y acompañamiento.
- Modo Cirugía, PRS, Performance Engine y Diagnóstico Inicial.
- Repetición espaciada, microlecciones y Autonomy Engine.
- MIDI/Web Audio cuando el navegador/dispositivo lo permite.
- PWA instalable por HTTPS/localhost.
- Backup local e importación.
- Cuentas opcionales y sincronización mediante la API incluida.
- Fuente preparada para empaquetado Android/iOS con Capacitor.

## Uso inmediato
### Sin cuenta
Abrí `index.html` o serví la carpeta con un servidor local. Todo el progreso queda en el dispositivo.

### Con backend local
```bash
node server.js
```
Abrí `http://localhost:3000`.

La API se comprueba en `GET /api/v1/health`.

## Publicación gratuita
El paquete incluye `Dockerfile` y `render.yaml` para desplegar como Web Service. Render mantiene actualmente Web Services gratuitos, aunque su nivel Free entra en suspensión tras inactividad y su filesystem es efímero; por eso **no se debe usar el JSON local de usuarios como almacenamiento definitivo en una publicación pública**. Para una salida pública con cuentas persistentes, conectar la API a una base de datos administrada (por ejemplo, Postgres/Supabase) antes de abrir el registro al público.

## Aplicaciones móviles
La carpeta `native/` contiene la configuración Capacitor y la copia web necesaria. Desde esa carpeta:
```bash
npm install
npx cap add android
npx cap add ios
npx cap sync
```
Luego se abre el proyecto nativo en Android Studio/Xcode para generar los binarios y firmarlos.

## Pruebas
```bash
node tests/release-check.mjs
```
El test verifica estructura, versión, 90 días, cuentas, PWA y flujo real de API.

## Alcance deliberadamente excluido de v39
OCR/OMR de PDF, catálogo musical comercial, videos propios, LLM externo y otras funciones avanzadas quedan para una etapa posterior.
