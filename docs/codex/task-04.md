# Tarea 04 final

## Resultado

Se completó la base operativa de las Fases 1, 2 y 3: restauración JSON segura, PWA offline, tarjetas y cuotas, pagos sin doble gasto, extractos, obligaciones recurrentes, recordatorios locales, presupuesto, flujo de caja, estrategias de deuda, metas y reportes con datos persistidos. La interfaz mantiene cinco secciones, español, temas oscuro/claro y áreas seguras de iOS.

## Funcionalidades implementadas

- Respaldo JSON v3: exportación, validación integral, análisis previo, detección de duplicados/conflictos y restauración atómica. Por defecto conserva el registro local; reemplazar conflictos exige confirmación explícita.
- PWA: manifest, iconos 192/512 y Apple Touch Icon, Service Worker/Workbox, caché offline y aviso de actualización controlada. `HashRouter` y `VITE_BASE_PATH` mantienen compatibilidad con GitHub Pages.
- Tarjetas: datos no sensibles, cupo, tasa E.A., corte/vencimiento, saldos, compras, cuotas, conciliaciones históricas, pagos, abonos, devoluciones, ajustes, intereses y cargos.
- Contabilidad: una compra genera un solo gasto y aumenta la deuda; el principal pagado reduce efectivo y deuda mediante un ajuste, sin crear gasto; transferencias siguen siendo un único movimiento. Anular una compra o pago relacionado actualiza atómicamente su registro sin borrarlo.
- Obligaciones: gastos fijos, servicios y suscripciones; estados previsto/facturado/pagado, valor real, medio de pago y avance de ciclo. Recordatorios se recalculan al abrir y recuperar visibilidad, y después de cambios relevantes.
- Plan: presupuesto por fechas reales, reservas, gasto medio/proyectado, excedente/déficit y flujo que separa ingresos previstos no confirmados.
- Deuda: avalancha, bola de nieve y equilibrada; conversión E.A. a mensual, pagos, meses, intereses, liquidación y supuestos visibles.
- Ahorro y reportes: metas y aportes; ingresos/gastos, categorías, saldos, patrimonio, deuda, utilización de tarjetas, ahorro, cumplimiento y flujo con Recharts.
- Git inicializado en `main`; workflow de GitHub Pages preparado. Dependencias nuevas justificadas: `recharts` y `vite-plugin-pwa`.

## Persistencia y migraciones

- Esquema v1 preservado: cuentas, categorías, movimientos, configuración e ingresos programados.
- Migración aditiva v2: `creditCards`, `installmentPurchases`, `installmentSchedules`, `cardPayments`, `recurringObligations`, `savingsGoals` y `reminders`.
- Migración aditiva v3: `cardStatements` para conservar conciliaciones. No se limpia, recrea ni elimina IndexedDB durante una actualización.

Archivos principales: `src/domain/obligations/`, `src/domain/planning/`, `src/services/obligationService.ts`, `src/services/backupService.ts`, `src/database/financeDatabase.ts`, `src/features/cards/`, `src/features/obligations/`, `src/features/planning/`, `vite.config.ts` y `.github/workflows/deploy-pages.yml`.

## Validación

- `npm run test`: 104 pruebas, 104 aprobadas en 8 archivos.
- `npm run lint`: aprobado sin advertencias.
- `npm run build`: aprobado; generó manifest, `sw.js` y 37 recursos precacheados.
- Compilación adicional con `VITE_BASE_PATH=/mis-finanzas/`: aprobada; rutas de recursos, manifest, `start_url` y `scope` quedaron bajo la ruta del repositorio.
- Vista previa local: `index.html`, manifest y Service Worker respondieron HTTP 200.
- `npm audit --omit=dev`: 0 vulnerabilidades conocidas.

## Limitaciones y riesgos conocidos

- Las proyecciones suponen capacidad mensual y tasas constantes, sin compras futuras; se muestran como estimaciones, no como garantía.
- iOS no garantiza tareas ni avisos con la PWA cerrada. Los recordatorios son internos y se recalculan al usar la aplicación.
- CSV, cifrado de respaldos y Google Sheets permanecen fuera de esta tarea según las decisiones previas/Fase 4.
- No fue posible ejecutar una prueba física en iPhone desde este entorno. La compilación y los artefactos PWA sí fueron verificados localmente.
- El despliegue real no se ejecutó porque no hay remoto ni credenciales de GitHub configurados.

## Despliegue y prueba en iPhone

1. Crear el repositorio en GitHub y ejecutar `git remote add origin <URL>`, `git add .`, `git commit -m "Completa fases 1 a 3"` y `git push -u origin main`.
2. En **Settings → Pages**, seleccionar **GitHub Actions**. El workflow ejecutará test, lint y build con la ruta base del nombre real del repositorio.
3. Abrir la URL HTTPS publicada en Safari, usar **Compartir → Añadir a pantalla de inicio** y abrir desde el icono.
4. Crear datos de prueba, cerrar/reabrir, activar modo avión y comprobar consulta/registro local. Exportar un JSON, validarlo y restaurarlo primero con “conservar locales”.
5. Publicar un segundo cambio y confirmar que el aviso de nueva versión aparece sin interrumpir formularios; aplicar la actualización manualmente.
