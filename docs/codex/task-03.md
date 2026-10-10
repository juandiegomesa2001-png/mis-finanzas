# Tarea 03 — Aplicación operativa de Fase 1

## Resultado

Tarea completada. La aplicación permite introducir, persistir, consultar y respaldar datos financieros reales en el dispositivo. No se modificaron las reglas contables del dominio de la Tarea 02.

## Funcionalidades terminadas

- Base Dexie/IndexedDB versionada con escrituras compuestas atómicas.
- Categorías iniciales de sistema, sin movimientos ni saldos ficticios.
- Onboarding opcional para moneda, primera cuenta, saldo inicial e ingreso habitual. El ingreso se guarda como programación y no aumenta el saldo hasta registrar un ingreso confirmado.
- Creación, edición, archivo y consulta de cuentas. Los saldos se derivan del saldo inicial y movimientos confirmados.
- Protección del saldo/fecha inicial cuando una cuenta ya tiene movimientos confirmados.
- Registro de ingresos, gastos y transferencias. Cada transferencia es un único `Transaction` con origen y destino; no existe entidad ni tabla `Transfer`.
- Registro rápido de gastos con teclado decimal, fecha actual, categorías, última cuenta utilizada y confirmación posterior al guardado local.
- Historial agrupado por fecha, búsqueda y filtros por tipo, estado y cuenta.
- Edición controlada de descripción/categoría. Los datos financieros de un movimiento confirmado no se sobrescriben: deben anularse y registrarse nuevamente.
- Anulación trazable sin eliminación física, con motivo, fecha e incremento de `revision`.
- Control de concurrencia optimista mediante revisión esperada e incremento en actualizaciones confirmadas.
- Prevención de duplicados por UUID y restricciones únicas de IndexedDB.
- Dashboard reactivo con saldo total en moneda principal, ingresos/gastos del mes y movimientos recientes obtenidos de IndexedDB.
- Navegación inferior, tema oscuro, diseño móvil, safe areas, estados vacíos y errores en español.
- Secciones futuras visibles únicamente como “No disponible aún”.
- Exportación JSON atómica, versionada y validada, con comprobaciones de estructura, UUID únicos, fechas, referencias, monedas y reglas de movimientos.
- Carga diferida por pantalla para mantener pequeño el paquete inicial.

## Esquema Dexie

Versión `1`, sin migraciones destructivas:

```text
accounts:
  &id, status, type, currency, initialDate, updatedAt

categories:
  &id, &systemKey, [kind+status], name, updatedAt

transactions:
  &id, type, status, effectiveDate, currency,
  sourceAccountId, destinationAccountId, accountId, categoryId,
  [type+status+effectiveDate],
  [sourceAccountId+status+effectiveDate],
  [destinationAccountId+status+effectiveDate], updatedAt

settings:
  &id, &key, updatedAt

incomeSchedules:
  &id, &key, status, nextEstimatedDate,
  destinationAccountId, updatedAt
```

`settings.key = "primary"` conserva una única configuración activa. `incomeSchedules.key = "primary-income"` permite actualizar el ingreso básico del onboarding sin duplicarlo. Los índices opcionales no fuerzan valores artificiales en otros registros.

## Archivos principales modificados

- Persistencia: `src/database/financeDatabase.ts`.
- Servicios: `src/services/financeService.ts`, `src/services/backupService.ts`.
- Nuevos modelos de dominio: categorías, configuración e ingresos programados bajo `src/domain/`.
- Aplicación: `src/app/AppRouter.tsx`, `AppShell.tsx`, `FinanceDataProvider.tsx` y `FinanceDataContext.ts`.
- Funcionalidades: `src/features/onboarding`, `accounts`, `dashboard`, `movements` y `more`.
- Componentes compartidos: `src/components/Feedback.tsx` y `PageHeader.tsx`.
- Utilidades: UUID, fechas y conversión monetaria en `src/utils/`.
- Interfaz: `src/App.tsx`, `src/App.css`, `src/index.css` e `index.html`.
- Pruebas: `src/database/financeDatabase.test.ts`, `src/services/backupService.test.ts` y configuración `fake-indexeddb` en `src/tests/setup.ts`.
- Dependencias: `package.json` y `package-lock.json`.

## Pruebas y validación

- `npm run test`: correcto; 5 archivos y 78 pruebas aprobadas.
- `npm run lint`: correcto; sin errores ni advertencias.
- `npm run build`: correcto; TypeScript estricto y Vite completaron la compilación.
- Servidor de desarrollo: respuesta HTTP 200 en `http://127.0.0.1:5173/`.
- Se añadió únicamente `fake-indexeddb` como dependencia de desarrollo para ejecutar pruebas reales de Dexie en Node; npm informó 0 vulnerabilidades.

Las pruebas nuevas cubren esquema y ausencia de tabla de transferencias, persistencia tras reapertura, cuentas, revisiones, archivo, onboarding atómico, ingresos, gastos, transferencias, saldos persistidos, rollback, UUID duplicados, edición controlada, anulación, última cuenta de gasto y respaldo JSON.

## Limitaciones

- La restauración/importación JSON queda pendiente; el formato exportado ya está definido y validado para esa tarea.
- No se implementaron tarjetas, presupuestos avanzados, Google Sheets ni PWA completa.
- Los importes de interfaz se convierten con dos unidades decimales menores; Fase 1 ofrece COP, USD y EUR. Monedas con otra cantidad de decimales requerirán una tabla explícita de exponentes.
- No fue posible ejecutar inspección visual automatizada porque esta sesión no tenía navegador conectado. Se verificaron respuesta HTTP, TypeScript, lint, pruebas y build, pero queda recomendada una pasada manual en Safari/iPhone antes de considerar validado el diseño físico.
- El directorio aún no está inicializado como repositorio Git.

## Cambios respecto a la arquitectura aprobada

- No se creó tabla `transfers` ni `operationId` obligatorio.
- Se añadieron claves únicas internas `systemKey`, `settings.key` e `incomeSchedules.key` para hacer idempotentes los datos de sistema y evitar duplicar configuración/ingreso principal. Los identificadores primarios siguen siendo UUID.
- La moneda permanece también en cada movimiento, decisión ya introducida en la Tarea 02, para validar referencias y evitar totales multimoneda ambiguos.
- Se incorporó carga diferida de pantallas después de que el primer build integrado mostrara un paquete inicial superior a 500 kB.
