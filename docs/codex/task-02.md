# Tarea 02 — Dominio financiero base y pruebas unitarias

## Resultado

Tarea completada. Se implementó un núcleo financiero puro, independiente de React, Dexie, IndexedDB y cualquier interfaz.

## Implementación

- Tipos nominales y constructores validados para UUID, fecha de dominio, fecha-hora UTC, moneda, importes enteros en unidades menores y revisiones.
- `MoneyAmount` admite cero y valores negativos para representar saldos; `PositiveMoneyAmount` exige un entero seguro mayor que cero para todo movimiento.
- `revision` es un entero seguro positivo, comienza en `1` y solo se incrementa en una unidad mediante `incrementRevision`. La capa de persistencia deberá invocar esa regla después de una actualización confirmada.
- `Account` contiene los campos de Fase 1 definidos en la especificación, más metadatos inmutables.
- `Transaction` es una unión discriminada única para ingresos, gastos, transferencias y ajustes. No existe entidad `Transfer`.
- Una transferencia conserva importe, moneda, cuenta origen y cuenta destino en el mismo movimiento. Se rechazan cuentas iguales y monedas incompatibles.
- Los ingresos requieren cuenta destino y categoría; los gastos requieren cuenta origen y categoría; los ajustes usan una cuenta y dirección explícita (`inflow` o `outflow`). Transferencias y ajustes no admiten categoría de consumo.
- El ciclo de vida exige fecha de confirmación para movimientos confirmados y fecha/motivo para anulados. Los movimientos confirmados se conservan mediante estado `voided`; no se definió eliminación física.
- El saldo se deriva del saldo inicial y movimientos confirmados aplicables. Respeta fecha inicial, origen/destino de transferencias, moneda y desbordamientos de enteros seguros, sin mutar las entradas.
- Los totales por rango son inclusivos, filtran por moneda y solo consideran ingresos o gastos confirmados. Excluyen transferencias, ajustes, pendientes y anulados.

## Archivos creados o modificados

- `package.json`: eliminado `--passWithNoTests` del script `test`.
- `src/domain/common/primitives.ts`
- `src/domain/common/revision.ts`
- `src/domain/common/metadata.ts`
- `src/domain/accounts/account.ts`
- `src/domain/transactions/transaction.ts`
- `src/domain/transactions/validation.ts`
- `src/domain/transactions/calculations.ts`
- `src/domain/index.ts`
- `src/domain/tests/fixtures.ts`
- `src/domain/common/primitives.test.ts`
- `src/domain/transactions/validation.test.ts`
- `src/domain/transactions/calculations.test.ts`
- Se retiró `src/domain/.gitkeep` porque la carpeta ya contiene código real.

## Pruebas y comprobaciones

- `npm run test`: correcto; 3 archivos y 60 pruebas aprobadas.
- `npm run lint`: correcto; sin errores ni advertencias.
- `npm run build`: correcto con TypeScript estricto y Vite.
- No se instalaron dependencias nuevas.

Las pruebas cubren los escenarios mínimos solicitados y casos adicionales: validación de UUID/fechas/moneda, importes decimales o inseguros, desbordamientos, límites inclusivos de rangos, moneda de cuenta, ciclo temporal de confirmación/anulación, ajustes, transferencias inválidas y ausencia de mutación.

## Decisiones y límites

- Cada movimiento conserva su moneda para impedir totales ambiguos y permitir contrastarla con las cuentas relacionadas.
- Los totales se calculan por moneda; no se realizan conversiones de divisas en Fase 1.
- Un código de moneda se valida por formato ISO 4217 de tres letras; la lista cerrada de códigos admitidos quedará en configuración/onboarding.
- No se implementaron persistencia, esquemas Dexie, rutas, UI ni PWA.
- No hay bloqueos ni decisiones que requieran intervención para continuar con la siguiente tarea.
