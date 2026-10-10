# Análisis inicial de la Fase 1

## 1. Estado actual del proyecto y dependencias

- Proyecto recién creado desde la plantilla React + TypeScript + Vite; la interfaz conserva el ejemplo de Vite y no contiene lógica financiera, persistencia, rutas ni PWA.
- Dependencias de producción: `react` 19.2.x y `react-dom` 19.2.x. Desarrollo: Vite 8.3.x, TypeScript 6.0.x, plugin React 6.1.x, tipos de React/Node y Oxlint.
- Faltan las dependencias previstas para la Fase 1: Tailwind CSS, Dexie, React Router, Lucide React, Zod, `date-fns`, `vite-plugin-pwa`/Workbox y Vitest. Recharts puede esperar hasta que un gráfico aporte valor real.
- `build` y `lint` están configurados; no existe script `test`. TypeScript aplica varias comprobaciones estrictas, pero no declara explícitamente `strict: true`.
- Vite no define `base`, manifiesto, Service Worker ni estrategia de actualización. `index.html` sigue en inglés, sin `viewport-fit=cover` ni metadatos iOS. No hay arquitectura modular, pruebas ni documentación específica del producto.
- Existe `package-lock.json` y `node_modules`; el directorio no está inicializado como repositorio Git.

## 2. Arquitectura propuesta para la Fase 1

```text
src/
  app/          # arranque, rutas, layout, providers y navegación
  components/   # componentes visuales reutilizables
  features/     # onboarding, dashboard, cuentas, movimientos y respaldos
  domain/       # entidades, tipos, reglas contables y casos de uso puros
  database/     # Dexie, esquema, migraciones y repositorios
  services/     # respaldo/restauración y servicios de plataforma
  hooks/        # consultas reactivas y coordinación UI-casos de uso
  utils/        # UUID, fechas, formato y validaciones comunes
  styles/       # tokens, temas, safe areas y estilos globales
  tests/        # soporte y pruebas transversales
```

- Flujo: UI → caso de uso → repositorio → transacción Dexie; la UI consulta datos persistidos y proyecciones puras, no mantiene una fuente financiera paralela en memoria.
- Módulos por funcionalidad, con tipos del dominio independientes de React y Dexie. Validación en los límites de entrada, importación y persistencia.
- Rutas estáticas compatibles con GitHub Pages, preferentemente `HashRouter`; shell móvil con carga diferida y PWA instalable con actualización solicitada por el usuario.

## 3. Modelo de datos inicial

- `Account`: UUID, nombre, institución opcional, tipo, moneda, saldo inicial en unidades menores, fecha inicial, estado, icono/color y metadatos.
- `Category`: UUID, nombre, clase (`income` o `expense`), estado, orden y metadatos. Las categorías iniciales son configuración explícita, no movimientos de demostración.
- `Transaction`: UUID, tipo (`income`, `expense`, `transfer` o `adjustment`), estado (`pending`, `confirmed` o `voided`), importe positivo en unidades menores, fecha efectiva, descripción, categoría opcional, cuenta origen/destino según el tipo, `transferId` opcional y metadatos.
- `Transfer`: UUID, cuenta origen, cuenta destino, importe, fecha efectiva, estado y metadatos; actúa como agregado para escribir de forma atómica las dos afectaciones vinculadas, sin clasificarlas como ingreso o gasto.
- `IncomeSchedule`: UUID, categoría/concepto, importe estimado opcional, frecuencia, próxima fecha estimada, cuenta destino opcional, estado y metadatos. Solo genera una entrada real mediante confirmación explícita.
- `Settings`: clave estable, moneda, zona horaria, tema, estado del onboarding, preferencias y metadatos.
- Las tarjetas y sus compras/pagos pertenecen a la Fase 2. Sus identificadores no se mezclarán con cuentas líquidas; el contrato de movimientos podrá ampliarse mediante una migración versionada.

## 4. Estrategia para saldos, movimientos y prevención de duplicados

- Representar COP como enteros de unidades menores; prohibir `NaN`, infinitos, importes negativos y conversiones implícitas de coma flotante.
- Saldo de una cuenta = saldo inicial + entradas confirmadas − salidas confirmadas desde su fecha inicial. Pendientes, anulados y proyecciones no alteran el saldo real.
- Ingresos y gastos son un único libro de movimientos. Las transferencias se confirman dentro de una sola transacción Dexie y afectan origen/destino por el mismo importe; quedan excluidas de totales de ingresos y gastos.
- Las correcciones conservan trazabilidad: editar de forma controlada o anular; no alterar movimientos históricos para cuadrar proyecciones. La conciliación futura deberá crear ajustes identificables.
- UUID por entidad, índices únicos para UUID y `transferId`, y comandos idempotentes con `operationId` único. Una repetición devuelve el resultado existente, no crea otro movimiento.
- Casos de uso validan invariantes (cuentas distintas, moneda compatible, fecha válida, entidades activas) y persisten todo antes de comunicar éxito. Los totales del dashboard se recalculan desde IndexedDB.
- Exportación incluye versión de formato y checksum. La restauración valida primero, muestra impacto y fusiona por UUID/versión; nunca vacía la base ni sobrescribe silenciosamente conflictos.

## 5. Esquema inicial de Dexie/IndexedDB

Versión 1, aditiva y con migraciones explícitas:

```text
accounts:        &id, status, type, currency, initialDate, updatedAt
categories:      &id, [kind+status], name, updatedAt
transactions:    &id, &operationId, type, status, effectiveDate,
                 sourceAccountId, destinationAccountId, categoryId,
                 transferId, [sourceAccountId+status+effectiveDate],
                 [destinationAccountId+status+effectiveDate], updatedAt
transfers:       &id, &operationId, status, effectiveDate,
                 sourceAccountId, destinationAccountId, updatedAt
incomeSchedules: &id, status, nextEstimatedDate, destinationAccountId, updatedAt
settings:        &key, updatedAt
```

- Todos los registros financieros incorporan `createdAt`, `updatedAt` y un número de revisión. Los importes se almacenan como enteros seguros.
- Las escrituras compuestas usan `db.transaction('rw', ...)`. No se elimina ninguna tabla o registro durante una migración; antes de una transformación sensible se requerirá respaldo verificable.
- `syncQueue` no se activa en Fase 1 porque Google Sheets está fuera de alcance; puede añadirse después mediante una nueva versión sin cambiar la autoridad local de IndexedDB.

## 6. Plan de implementación dividido en tareas pequeñas

1. Alinear configuración: TypeScript estricto, scripts de prueba, lint y base de GitHub Pages.
2. Añadir solo dependencias justificadas y configurar Vitest, Tailwind y PWA mínima.
3. Definir tipos monetarios, entidades, validaciones e invariantes; cubrirlos con pruebas unitarias.
4. Crear Dexie v1, repositorios y pruebas de persistencia/migración sin operaciones destructivas.
5. Implementar casos de uso de cuentas y cálculo de saldos; probar altas, edición, archivo y reconstrucción.
6. Implementar onboarding persistente y estados vacíos, sin datos ficticios automáticos.
7. Implementar ingresos confirmados y programados, manteniendo separadas realidad y previsión.
8. Implementar gastos rápidos y categorías, con guardado atómico y confirmación posterior a persistencia.
9. Implementar transferencias idempotentes y probar que no alteran ingresos/gastos ni se duplican.
10. Implementar historial, búsqueda/filtros, edición controlada y anulación con confirmación.
11. Implementar dashboard derivado de datos reales y marcar métricas no calculables por datos incompletos.
12. Implementar exportación/importación JSON básica con versión, checksum, prevalidación y estrategia de conflictos; después CSV de movimientos.
13. Completar shell visual, tema claro/oscuro, safe areas, navegación y accesibilidad móvil.
14. Validar instalación/offline/actualizaciones en iOS y rutas en GitHub Pages; ejecutar `test`, `lint` y `build` en cada incremento.

## 7. Riesgos y decisiones pendientes

- Crítico antes de manejar datos reales: todavía no existen persistencia, migraciones, restauración ni pruebas; la plantilla actual no debe considerarse utilizable como aplicación financiera.
- Decidir si una transferencia se representa con dos asientos o con un movimiento agregado. La propuesta usa agregado más afectaciones derivadas para evitar divergencia; debe fijarse antes del esquema v1.
- Precisar semántica de edición/anulación y política de conflictos de importación para preservar auditoría.
- Confirmar el nombre del repositorio/ruta pública para fijar `base`, alcance del Service Worker y enlaces del manifiesto.
- Verificar en dispositivos reales la compatibilidad de Vite 8/TypeScript 6 y el comportamiento PWA de la versión efectiva de Safari/iOS 26 antes de congelar versiones.
- Definir el alcance exacto de “respaldo básico”: JSON versionado y CSV pueden entrar en Fase 1; cifrado con Web Crypto y restauración avanzada requieren diseño y pruebas específicas.
- La ausencia de repositorio Git reduce trazabilidad y recuperación de cambios de código, aunque no afecta por sí misma los futuros datos de IndexedDB.
