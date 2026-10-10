# Tarea 01 — Configuración base del proyecto

## Resultado

Tarea completada. Se configuró la base técnica sin implementar entidades financieras, persistencia, pantallas ni una PWA completa.

## Cambios realizados

- TypeScript estricto en los contextos de aplicación y Node mediante `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` y comprobación de mayúsculas/minúsculas en rutas.
- Scripts disponibles: `test`, `test:watch`, `lint` y `build`.
- Vitest configurado para pruebas `*.test.ts` y `*.test.tsx` en entorno Node. El script inicial admite temporalmente que aún no existan archivos de prueba; los fallos de pruebas futuras sí producirán error.
- Dependencias incorporadas para las siguientes tareas de Fase 1:
  - Aplicación: Dexie, React Router, Lucide React, date-fns y Zod.
  - Desarrollo: Vitest, Tailwind CSS y su integración oficial con Vite.
- No se añadieron Recharts ni `vite-plugin-pwa`: no son necesarios para esta tarea y se incorporarán cuando se implementen gráficos y PWA, respectivamente.
- Tailwind quedó integrado en Vite y cargado desde los estilos globales, sin modificar todavía el sistema visual.
- Vite usa `/` por defecto y permite definir la ruta pública mediante `VITE_BASE_PATH`, normalizada con barras inicial y final. El nombre del repositorio no está codificado.
- Se creó la estructura base vacía: `app`, `components`, `features`, `domain`, `database`, `services`, `hooks`, `utils`, `styles` y `tests` dentro de `src`.

## Archivos modificados

- `package.json`
- `package-lock.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `vitest.config.ts`
- `src/index.css`
- Archivos `.gitkeep` en las diez carpetas base nuevas.
- `docs/codex/task-01.md`

## Comprobaciones ejecutadas

- `npm run test`: correcto con Vitest 5.0.3; todavía no existen pruebas y el script terminó correctamente por la opción explícita `--passWithNoTests`.
- `npm run lint`: correcto, sin errores ni advertencias.
- `npm run build`: correcto con TypeScript 6.0.3 y Vite 8.3.4.
- Instalación auditada por npm: 0 vulnerabilidades informadas.

## Pendientes y limitaciones

- Antes del despliegue se debe proporcionar el nombre o ruta definitiva del repositorio y establecer `VITE_BASE_PATH` con ese valor; no bloquea el desarrollo local.
- La terminal actual no recibió Node/npm en `PATH`, aunque están instalados en `C:\Program Files\nodejs`. Las comprobaciones se ejecutaron agregando esa ruta únicamente al proceso. Reiniciar la terminal o corregir el `PATH` del entorno permitirá usar `npm` directamente.
- El directorio continúa sin repositorio Git inicializado, por lo que todavía no hay trazabilidad de cambios mediante Git.
- Las decisiones aprobadas sobre transferencias, UUID, `revision`, anulación y respaldo JSON se reservan para las tareas de dominio y persistencia; esta tarea no creó esquemas ni entidades.
