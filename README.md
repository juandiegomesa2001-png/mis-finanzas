# Mis Finanzas

PWA local-first de finanzas personales. IndexedDB es la fuente principal y no se requieren servicios externos para la operación cotidiana.

## Desarrollo

Requiere Node.js 22 o posterior.

```bash
npm ci
npm run dev
npm run test
npm run lint
npm run build
```

## Datos y respaldos

Los datos reales permanecen en IndexedDB del dispositivo. La aplicación permite exportar y restaurar un JSON versionado; conserva los registros locales en conflicto salvo confirmación explícita. No almacena números completos de tarjeta, CVV, PIN ni credenciales bancarias.

## GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` ejecuta pruebas, lint y compilación, calcula la ruta base desde el nombre del repositorio y publica `dist`. Para activarlo:

1. Crear el repositorio remoto y subir la rama `main`.
2. En GitHub, seleccionar **Settings → Pages → Source → GitHub Actions**.
3. Ejecutar el workflow o hacer un push a `main`.

Para probar localmente la misma ruta base:

```bash
VITE_BASE_PATH=/nombre-del-repositorio/ npm run build
npm run preview
```

En PowerShell, establecer primero `$env:VITE_BASE_PATH='/nombre-del-repositorio/'`.
