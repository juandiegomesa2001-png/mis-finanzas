MIS FINANZAS — ESPECIFICACIÓN FUNCIONAL Y TÉCNICA
1. Descripción general
Desarrollar una aplicación de finanzas personales denominada Mis Finanzas, diseñada principalmente para un iPhone 16 Pro Max con iOS 26.
Será una Progressive Web App (PWA) local-first, instalada desde Safari mediante la opción «Añadir a pantalla de inicio».
El objetivo es gestionar integralmente las finanzas personales del usuario sin depender de suscripciones, servidores propios o licencias de desarrollo de Apple.
La aplicación debe permitir:
- Administrar cuentas bancarias y saldos.
- Registrar ingresos y salario.
- Registrar gastos diarios rápidamente.
- Gestionar tarjetas de crédito.
- Administrar compras a cuotas.
- Registrar pagos, abonos e intereses.
- Controlar servicios públicos y gastos fijos.
- Administrar suscripciones.
- Consultar próximos vencimientos.
- Calcular presupuestos diarios, semanales y mensuales.
- Proyectar el flujo de caja.
- Recomendar estrategias de pago de deudas.
- Crear objetivos de ahorro.
- Generar planes financieros equilibrados.
- Consultar estadísticas y gráficos.
- Sincronizar opcionalmente con Google Sheets.
- Exportar y restaurar copias de seguridad.
La aplicación debe utilizarse principalmente en español y pesos colombianos (COP).
No debe ser una demostración visual: todas las operaciones principales deben funcionar con datos reales introducidos por el usuario.
2. Filosofía financiera
La aplicación debe funcionar como un asistente financiero personal que responda:
1. ¿Cuánto dinero tengo?
2. ¿Cuánto dinero realmente puedo gastar?
3. ¿Qué obligaciones tengo pendientes?
4. ¿Qué tarjetas debo pagar próximamente?
5. ¿Cuánto gastaré aproximadamente este mes?
6. ¿Cuánto puedo gastar hoy y esta semana?
7. ¿Qué deuda me conviene pagar primero?
8. ¿Cuánto puedo abonar sin comprometer mis necesidades?
9. ¿Cuándo terminaré de pagar mis deudas?
10. ¿Cuánto puedo ahorrar de manera sostenible?
Las recomendaciones no deben limitarse a minimizar gastos.
El sistema debe mantener un equilibrio entre obligaciones, calidad de vida, reducción de deudas y ahorro.
3. Arquitectura tecnológica
Stack principal
- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- Dexie.js.
- IndexedDB.
- React Router.
- Recharts.
- Lucide React.
- date-fns.
- Zod.
- vite-plugin-pwa.
- Workbox.
- Vitest.
Utilizar versiones estables y compatibles.
Modelo local-first
IndexedDB será la fuente principal de información.
Cada operación deberá guardarse localmente antes de considerarse completada.
La aplicación deberá continuar funcionando sin conexión a internet después de instalarse y almacenar correctamente sus recursos.
Los datos financieros no deben depender de un servidor para ser consultados o modificados.
Capas de arquitectura
Separar:
- Presentación y componentes.
- Reglas del dominio financiero.
- Casos de uso.
- Persistencia.
- Motor de presupuestos.
- Motor de amortización.
- Recordatorios.
- Sincronización.
- Seguridad y respaldos.
Evitar implementar reglas financieras complejas dentro de componentes React.
4. Experiencia nativa para iPhone
La aplicación debe comportarse visualmente como una app independiente instalada en iOS.
Requisitos PWA
- display: standalone.
- Configuración correcta del Web App Manifest.
- Apple Touch Icon.
- Iconos de 192 y 512 píxeles.
- Service Worker.
- Funcionamiento offline.
- Detección de actualizaciones.
- Actualización controlada.
- Rutas compatibles con GitHub Pages.
La interfaz instalada no debe mostrar la barra de direcciones, botones de navegación ni pestañas de Safari.
Usar viewport-fit=cover y respetar las áreas seguras de iOS.
La aplicación debe adaptarse a:
- Dynamic Island.
- Barra de estado.
- Indicador de inicio.
- Teclado virtual.
- Orientación vertical.
- Diferentes tamaños de pantalla.
Usar env(safe-area-inset-*) y unidades dinámicas como dvh donde sea apropiado.
No intentar ocultar controles del navegador cuando la web se abre como una pestaña convencional: la experiencia sin barras depende de que esté instalada como PWA.
5. Diseño visual
Crear una aplicación con estética premium de banca digital.
Identidad visual
Tema oscuro predeterminado.
Paleta inicial:
Elemento	Color
Fondo	#0B1120
Superficies	#151E30
Tarjetas	#1D2940
Acento principal	#10B981
Acento secundario	#38BDF8
Texto principal	#F8FAFC
Texto secundario	#94A3B8
Peligro	#F87171
Advertencia	#FBBF24
Implementar tema claro adicional.
Diseño
- Tipografía de sistema compatible con iOS.
- Tarjetas de esquinas redondeadas.
- Jerarquía clara de importes.
- Gráficos elegantes.
- Animaciones suaves.
- Interacciones táctiles.
- Formularios de una sola mano.
- Bottom sheets.
- Navegación inferior fija.
- Estados vacíos bien diseñados.
- Pantallas de carga.
- Confirmaciones claras.
- Diseño responsive.
- Accesibilidad y contraste adecuados.
No saturar las pantallas con elementos innecesarios.
Navegación principal
Cinco secciones:
1. Inicio.
2. Movimientos.
3. Tarjetas.
4. Plan financiero.
5. Más.
La sección «Más» incluirá cuentas, gastos fijos, servicios, suscripciones, reportes y configuración.
Debe existir una acción destacada para agregar gastos rápidamente.
6. Dashboard principal
Mostrar:
- Saldo total de cuentas.
- Dinero realmente disponible.
- Patrimonio neto.
- Deuda total.
- Ingresos del mes.
- Gastos del mes.
- Ahorro acumulado.
- Obligaciones pendientes.
- Próximo ingreso.
- Próximo pago.
- Presupuesto disponible del día.
- Presupuesto semanal.
- Presupuesto restante del mes.
El dashboard debe actualizarse automáticamente cuando cambien los datos.
Recomendaciones contextuales
Ejemplos:
- Tu tarjeta vence dentro de tres días.
- Debes reservar dinero para un servicio público.
- Has utilizado el 80 % de tu presupuesto mensual.
- Tu promedio diario de gasto está aumentando.
- Puedes realizar un abono extraordinario.
- Tienes margen para ahorrar este mes.
No emitir recomendaciones sin evidencia en los datos.
7. Gestión de cuentas
Permitir crear:
- Cuentas de ahorro.
- Cuentas corrientes.
- Efectivo.
- Billeteras digitales.
- Cuentas destinadas al ahorro.
- Otros activos líquidos.
Campos:
- Identificador.
- Nombre.
- Institución.
- Tipo.
- Moneda.
- Saldo inicial.
- Fecha inicial.
- Estado.
- Icono.
- Color.
Funciones:
- Crear.
- Editar.
- Archivar.
- Registrar movimientos.
- Transferir entre cuentas.
- Conciliar saldos.
- Consultar historial.
Los saldos deben calcularse a partir del saldo inicial y movimientos confirmados.
Las transferencias internas no deben clasificarse como ingresos ni gastos.
8. Ingresos y salario
Registrar ingresos:
- Salario.
- Bonificaciones.
- Comisiones.
- Reembolsos.
- Ingresos extraordinarios.
- Otros.
Permitir configurar ingresos recurrentes:
- Mensuales.
- Quincenales.
- Semanales.
- Variables.
Cada ingreso tendrá fecha estimada y fecha real.
Los ingresos previstos no deben sumarse al saldo bancario hasta confirmarse.
La aplicación debe utilizar las fechas de ingreso para proyectar disponibilidad futura.
9. Tarjetas de crédito
Permitir registrar varias tarjetas.
Datos:
- Banco.
- Nombre.
- Franquicia.
- Últimos cuatro dígitos opcionales.
- Cupo.
- Saldo adeudado.
- Saldo facturado.
- Saldo sin facturar.
- Tasa de interés.
- Fecha de corte.
- Fecha límite de pago.
- Pago mínimo.
- Pago total.
- Cuenta habitual de pago.
No almacenar CVV, PIN, credenciales ni números completos de tarjeta.
Compras a cuotas
Registrar:
- Descripción.
- Fecha.
- Valor.
- Tarjeta.
- Número de cuotas.
- Tasa.
- Gastos financieros.
- Cuotas pagadas.
- Saldo pendiente.
Generar un cronograma estimado de cuotas.
Permitir diferentes condiciones de financiación y compras sin intereses.
Estados de cuenta
Modelar correctamente los ciclos de facturación.
Permitir ajustar los valores calculados según el extracto real de la entidad.
Distinguir saldo facturado, saldo sin facturar y saldo total.
Pagos
Permitir:
- Pago mínimo.
- Pago total.
- Abonos adicionales.
- Devoluciones.
- Ajustes.
- Intereses y cargos.
Una compra con tarjeta constituye un gasto y un aumento del pasivo.
Un abono posterior reduce el pasivo y el efectivo. No debe registrarse nuevamente como gasto de consumo.
10. Gastos fijos y servicios
Permitir registrar:
- Arriendo.
- Administración.
- Energía.
- Agua.
- Gas.
- Internet.
- Telefonía.
- Seguros.
- Transporte.
- Educación.
- Otros.
Campos:
- Nombre.
- Categoría.
- Valor previsto.
- Valor facturado.
- Frecuencia.
- Fecha de vencimiento.
- Medio de pago.
- Estado.
Distinguir obligaciones previstas, facturadas y pagadas.
Permitir importes variables y estimaciones basadas en datos históricos.
11. Suscripciones
Gestionar suscripciones mensuales, anuales y de otras frecuencias.
Registrar:
- Nombre.
- Importe.
- Periodicidad.
- Próximo cobro.
- Medio de pago.
- Categoría.
- Estado.
Mostrar:
- Costo mensual equivalente.
- Costo anual.
- Próximas renovaciones.
- Participación en gastos recurrentes.
Permitir marcar una suscripción como activa, pausada o cancelada.
12. Registro rápido de gastos
El registro de gastos diarios debe ser una de las funciones principales.
Objetivo: registrar un gasto en pocos segundos.
Campos:
- Importe.
- Categoría.
- Fecha.
- Cuenta o tarjeta.
- Descripción opcional.
Optimización:
- Teclado numérico.
- Fecha actual por defecto.
- Última cuenta utilizada.
- Categorías frecuentes.
- Repetir gastos.
- Guardar y agregar otro.
- Confirmación de guardado.
- Actualización inmediata del dashboard.
Categorías iniciales:
- Alimentación.
- Transporte.
- Compras.
- Entretenimiento.
- Salud.
- Hogar.
- Educación.
- Servicios.
- Suscripciones.
- Viajes.
- Otros.
Permitir personalización.
13. Historial de movimientos
Mostrar movimientos agrupados por fecha.
Permitir:
- Búsqueda.
- Filtros.
- Edición.
- Eliminación con confirmación.
- Consulta de detalles.
- Totales diarios.
- Totales semanales.
- Totales mensuales.
- Exportación.
Los movimientos deberán conservar trazabilidad suficiente para reconstruir saldos.
14. Motor de presupuesto
Crear un motor financiero que considere:
- Saldos disponibles.
- Ingresos recibidos.
- Próximos ingresos.
- Obligaciones.
- Gastos fijos.
- Servicios.
- Suscripciones.
- Cuotas.
- Pagos mínimos.
- Abonos extraordinarios planificados.
- Gastos variables.
- Reservas.
- Metas de ahorro.
Calcular:
- Presupuesto diario.
- Presupuesto semanal.
- Presupuesto mensual.
- Disponible después de obligaciones.
- Gasto medio.
- Gasto proyectado.
- Excedente.
- Déficit.
- Flujo de caja por fecha.
No limitarse a dividir el salario mensual entre 30.
El cálculo debe considerar fechas reales de entradas y salidas de dinero.
No presentar ingresos inciertos como dinero garantizado.
15. Motor de estrategias de deuda
Implementar tres estrategias:
Avalancha
Priorizar abonos a deudas de mayor interés.
Bola de nieve
Priorizar deudas de menor saldo.
Equilibrada
Pagar mínimos, conservar una reserva para gastos personales y dirigir el excedente a las deudas.
Para cada estrategia mostrar:
- Pagos recomendados.
- Tiempo estimado de liquidación.
- Intereses totales estimados.
- Mes de liquidación.
- Diferencias entre escenarios.
- Impacto de abonos extraordinarios.
Realizar conversiones correctas entre tasas efectivas y nominales.
No inventar tasas bancarias.
Mostrar los supuestos de cada simulación.
Nunca recomendar pagos que comprometan gastos esenciales.
16. Metas de ahorro
Permitir crear objetivos:
- Fondo de emergencia.
- Viajes.
- Compras.
- Educación.
- Vivienda.
- Inversión.
- Personalizados.
Campos:
- Nombre.
- Valor objetivo.
- Ahorro actual.
- Fecha objetivo.
- Prioridad.
- Aporte mensual previsto.
Modo de planificación
Crear planes de ahorro:
- Flexible.
- Equilibrado.
- Acelerado.
Priorizar cubrir gastos esenciales y pagos mínimos.
Permitir crear una reserva básica mientras se liquidan las deudas.
Después, aumentar los abonos y las aportaciones a metas según los recursos disponibles.
La aplicación debe recalcular el plan cuando cambie la situación financiera.
17. Reportes
Incluir:
- Ingresos contra gastos.
- Gastos por categoría.
- Gastos fijos frente a variables.
- Evolución de saldos.
- Evolución de patrimonio.
- Evolución de deudas.
- Utilización de tarjetas.
- Proyección de pagos.
- Ahorro acumulado.
- Cumplimiento presupuestario.
- Flujo de caja proyectado.
Utilizar Recharts.
Los gráficos deben ser legibles y adaptarse a pantallas móviles.
18. Recordatorios internos
No integrar OneSignal, Firebase Cloud Messaging ni otros servicios de notificaciones externas.
Generar recordatorios localmente desde IndexedDB.
Tipos:
- Próxima fecha de corte.
- Próximo vencimiento de tarjeta.
- Servicios pendientes.
- Suscripciones.
- Gastos presupuestarios excesivos.
- Días sin registrar movimientos.
- Metas de ahorro atrasadas.
Al abrir la aplicación, consultar fechas y obligaciones y actualizar los avisos.
Actualizar también cuando se registren cambios o la aplicación recupere visibilidad.
No prometer notificaciones a una hora específica mientras la PWA está cerrada.
19. Almacenamiento local
Utilizar Dexie.js sobre IndexedDB.
Tablas o entidades sugeridas:
accounts
transactions
categories
creditCards
installmentPurchases
installmentSchedules
cardStatements
cardPayments
recurringObligations
subscriptions
incomeSchedules
budgets
savingsGoals
debtPlans
reminders
settings
syncQueue
syncMetadata


Todos los registros relevantes deben tener UUID y metadatos de creación y modificación.
Utilizar precisión monetaria adecuada, preferiblemente enteros en unidades menores.
Implementar transacciones atómicas y migraciones de esquema.
No destruir tablas existentes al actualizar la aplicación.
20. Sincronización con Google Sheets
La sincronización será opcional.
Utilizar Google Sheets API y OAuth 2.0 con permisos mínimos.
Crear o conectar un archivo privado llamado Mis_Finanzas_DB.
El documento puede contener hojas para cuentas, movimientos, tarjetas, cuotas, obligaciones, suscripciones, ingresos y metas.
Reglas:
- IndexedDB es la fuente principal.
- Guardar primero localmente.
- Mantener una cola de sincronización.
- Sincronizar al abrir la app.
- Sincronizar al recuperar internet.
- Permitir sincronización manual.
- Mostrar fecha y estado de la última sincronización.
- Evitar duplicados mediante UUID.
- Manejar errores sin bloquear la aplicación.
La primera versión de sincronización será principalmente de la aplicación hacia Google Sheets, con restauración controlada.
No implementar sincronización bidireccional sin resolución explícita de conflictos.
No introducir secretos en GitHub Pages.
No depender de tareas en segundo plano cuando la PWA está cerrada.
21. Respaldo y recuperación
Implementar:
- Exportación JSON.
- Exportación CSV.
- Respaldo completo cifrado.
- Importación.
- Restauración.
- Verificación de integridad.
- Prevención de duplicados.
Utilizar Web Crypto para cifrado.
La aplicación debe advertir que IndexedDB puede perderse si se elimina la app o sus datos.
Los respaldos deben poder guardarse en Archivos o iCloud Drive mediante funciones compatibles con iOS.
22. Seguridad
- No almacenar contraseñas bancarias.
- No solicitar CVV ni PIN.
- No guardar secretos privados en el frontend.
- Validar entradas con Zod.
- Evitar XSS.
- Mantener permisos mínimos.
- No incorporar rastreadores innecesarios.
- No mostrar datos sensibles en logs.
- Proteger los respaldos.
Considerar un bloqueo local opcional por inactividad.
No presentar ese bloqueo como cifrado total de los datos.
23. GitHub Pages
Configurar despliegue automático mediante GitHub Actions.
La aplicación deberá compilarse como archivos estáticos.
Utilizar correctamente la ruta base del repositorio.
Por ejemplo:
https://usuario.github.io/mis-finanzas/
Verificar las rutas del manifiesto, Service Worker y archivos estáticos.
Utilizar navegación compatible con GitHub Pages.
Las actualizaciones deben conservar IndexedDB y ejecutar migraciones seguras.
Mostrar un aviso cuando haya una versión nueva.
Evitar interrumpir formularios abiertos.
24. Configuración inicial
Crear un asistente de configuración para:
- Moneda.
- Salario.
- Frecuencia de pago.
- Fecha de ingreso.
- Cuentas.
- Saldos.
- Tarjetas.
- Deudas.
- Gastos fijos.
- Servicios.
- Suscripciones.
- Metas.
- Preferencias presupuestarias.
Permitir omitir pasos y completarlos después.
Los cálculos basados en datos incompletos deben señalar esa limitación.
25. Rendimiento
Optimizar para iPhone 16 Pro Max.
- Evitar cargas innecesarias de IndexedDB.
- Crear índices adecuados.
- Reutilizar cálculos.
- Mantener la interfaz fluida.
- Separar componentes.
- Utilizar carga diferida cuando corresponda.
- Mantener formularios rápidos.
- Soportar varios años de movimientos.
26. Pruebas
Crear pruebas para:
- Saldos.
- Transferencias.
- Compras a crédito.
- Pagos de tarjetas.
- Intereses.
- Cuotas.
- Fechas de corte.
- Vencimientos.
- Presupuestos.
- Flujo de caja.
- Estrategias de amortización.
- Metas.
- Migraciones.
- Respaldos.
- Sincronización sin duplicados.
Verificar que los movimientos no se contabilicen dos veces.
27. Orden de implementación
Fase 1 — Aplicación operativa
- Configuración React y PWA.
- Diseño.
- Navegación.
- IndexedDB.
- Configuración inicial.
- Cuentas.
- Ingresos.
- Movimientos.
- Gastos diarios.
- Transferencias.
- Dashboard.
- Respaldos básicos.
Fase 2 — Obligaciones
- Tarjetas de crédito.
- Compras a cuotas.
- Pagos.
- Cortes.
- Vencimientos.
- Gastos fijos.
- Servicios.
- Suscripciones.
- Recordatorios internos.
Fase 3 — Inteligencia financiera
- Presupuestos.
- Proyecciones.
- Planes de deuda.
- Metas de ahorro.
- Recomendaciones.
- Comparación de escenarios.
- Reportes avanzados.
Fase 4 — Sincronización
- Google OAuth.
- Google Sheets API.
- Cola de cambios.
- Restauración.
- Tratamiento de errores y conflictos.
- Optimización.
28. Criterios de aceptación
El proyecto debe permitir:
1. Instalar la PWA en iPhone.
2. Abrirla sin las barras de Safari desde el icono.
3. Registrar gastos rápidamente.
4. Registrar ingresos.
5. Administrar cuentas.
6. Consultar saldos.
7. Administrar tarjetas y cuotas.
8. Consultar próximos pagos.
9. Calcular presupuestos.
10. Proyectar flujo de caja.
11. Simular estrategias de deuda.
12. Planear ahorro.
13. Funcionar offline.
14. Conservar registros al cerrar la aplicación.
15. Conservar datos después de actualizar.
16. Exportar y restaurar respaldos.
17. Publicar actualizaciones en GitHub Pages.
La prioridad es la integridad financiera y la persistencia de la información.