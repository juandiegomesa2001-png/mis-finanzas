# Corrección de formularios y eliminación controlada

## Archivos modificados

- `src/hooks/useSubmissionGuard.ts` y su prueba: cerrojo sincrónico reutilizable contra envíos concurrentes.
- `src/features/cards/cardFormState.ts` y su prueba: estados iniciales verificables para tarjeta, compra y pago/ajuste.
- `src/features/cards/CardsPage.tsx` y `src/App.css`: apertura bajo demanda, cancelar, limpieza, estados de guardado y acciones eliminar/archivar.
- `src/features/accounts/AccountsPage.tsx`, `src/features/movements/IncomePage.tsx`, `QuickExpensePage.tsx`, `TransferPage.tsx` y `MovementsPage.tsx`: bloqueo de reenvíos, limpieza/cierre y confirmación.
- `src/features/onboarding/OnboardingPage.tsx`, `src/features/obligations/ObligationsPage.tsx`, `src/features/planning/PlanPage.tsx` y `src/features/more/MorePage.tsx`: protección de altas/restauración y reinicio o cierre tras éxito.
- `src/services/obligationService.ts` y su prueba: inspección transaccional, eliminación segura y archivado de tarjetas.

## Cambios de UX

- Las pestañas de tarjetas muestran los botones `Añadir tarjeta`, `Registrar compra` y `Registrar pago o ajuste`; los formularios permanecen ocultos hasta solicitarlos.
- Cancelar cierra y limpia todo el estado. Guardar correctamente también limpia y cierra el formulario, con mensaje de confirmación.
- Las altas de cuentas, ingresos, gastos, transferencias, onboarding, obligaciones y metas restablecen sus valores o cierran el flujo después de persistir.
- Todos los formularios y la restauración usan un bloqueo inmediato, además del estado visual deshabilitado, para ignorar un segundo evento antes del siguiente render.
- Las tarjetas archivadas se identifican y dejan de aparecer en selectores de nuevas compras o pagos.

## Reglas de eliminación y anulación

- Una tarjeta solo se elimina físicamente si no tiene saldo financiero ni compras, pagos, extractos o movimientos relacionados. La comprobación y el borrado se ejecutan en una transacción Dexie y validan `revision`.
- Si existe saldo o historial, la interfaz ofrece archivar. El archivado conserva relaciones e incrementa `revision`.
- Los movimientos confirmados no se eliminan: se anulan con motivo obligatorio y permanecen en IndexedDB. La anulación relacionada con tarjetas conserva también compra/pago y trazabilidad.
- Los recordatorios derivados de una tarjeta realmente vacía pueden eliminarse junto con ella porque no tienen impacto contable. No se añadieron borrados para entidades financieras confirmadas.
- La restauración completa conserva su confirmación destructiva explícita y ejecución atómica; la importación conservadora sigue siendo la opción segura.

## Pruebas ejecutadas

- `npm run test`: 109 pruebas aprobadas en 10 archivos. Incluye doble envío, reinicio de formularios, eliminación de tarjeta vacía, rechazo del borrado y archivado con historial, y anulación sin borrado del movimiento.
- `npm run lint`: aprobado sin advertencias.
- `npm run build`: aprobado; TypeScript estricto, Vite y artefactos PWA generados.

## Riesgos pendientes

- Las confirmaciones destructivas y el motivo de anulación usan diálogos nativos (`confirm`/`prompt`); son seguros y claros, pero conviene migrarlos a modales accesibles propios en una iteración visual posterior.
- No existen actualmente altas de borradores/candidatos financieros en la interfaz. Si se incorporan, deberán quedar explícitamente tipadas como sin impacto contable antes de habilitar su borrado.
- No se realizó prueba física en iPhone; compilación, tipos, lint y comportamiento de persistencia sí quedaron cubiertos automáticamente.

No se instalaron dependencias, no se cambió el esquema de IndexedDB y no se ejecutó ninguna migración destructiva.

