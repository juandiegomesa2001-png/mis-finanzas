1. Contexto del proyecto
Este repositorio contiene Mis Finanzas, una aplicación PWA local-first de finanzas personales para iPhone.
Antes de realizar cambios importantes, leer SPEC.md.
Este archivo define las reglas permanentes de implementación.
No cambiar los objetivos principales del proyecto sin una justificación técnica.
2. Principios obligatorios
Priorizar, en este orden:
1. Integridad de datos financieros.
2. Persistencia y prevención de pérdidas.
3. Corrección de cálculos.
4. Seguridad y privacidad.
5. Funcionalidad offline.
6. Experiencia de usuario.
7. Rendimiento.
8. Mantenibilidad.
No sacrificar integridad financiera por simplificar el código o acelerar el desarrollo.
3. Reglas de desarrollo
- Utilizar TypeScript con tipado estricto.
- Evitar any salvo justificación concreta.
- Mantener módulos pequeños y cohesionados.
- Evitar componentes gigantes.
- Separar UI, lógica financiera y persistencia.
- Reutilizar componentes y funciones.
- Evitar dependencias innecesarias.
- Documentar decisiones arquitectónicas relevantes.
- Mantener nombres consistentes.
- Ejecutar pruebas antes de considerar terminada una funcionalidad.
Toda la interfaz debe estar en español.
Las variables, funciones y clases pueden utilizar nombres técnicos en inglés para mantener consistencia.
4. Protección absoluta de los datos
Nunca:
- Eliminar IndexedDB para corregir errores.
- Recrear tablas borrando registros reales.
- Vaciar información durante actualizaciones.
- Reemplazar datos reales por información de demostración.
- Ejecutar migraciones destructivas sin respaldo.
- Borrar movimientos relacionados sin analizar sus consecuencias.
Toda modificación de esquema debe tener una migración versionada.
Si una operación puede destruir información, detener la ejecución automática y explicar el riesgo antes de implementarla.
5. Reglas contables
Los saldos deben derivarse de movimientos y saldos iniciales.
Una transferencia entre cuentas propias no es un ingreso ni un gasto.
Una compra con tarjeta:
- Registra un gasto.
- Incrementa la deuda.
Un pago a una tarjeta:
- Disminuye el efectivo.
- Disminuye la deuda.
- No genera un nuevo gasto de consumo por el principal pagado.
Los intereses y comisiones sí pueden constituir gastos financieros.
No duplicar cuotas, compras ni pagos.
Diferenciar movimientos confirmados de obligaciones futuras.
No modificar el historial real para hacer coincidir artificialmente una proyección.
6. Precisión financiera
No utilizar cálculos monetarios inseguros.
Preferir enteros en unidades menores o representaciones decimales exactas.
Realizar conversiones correctas entre tasas y periodos.
No inventar tasas, saldos ni condiciones bancarias.
Las proyecciones deben identificar sus supuestos.
Si faltan datos relevantes, indicar que el resultado es estimado.
7. Persistencia y sincronización
IndexedDB es la fuente principal.
Toda operación financiera debe guardarse localmente antes de actualizar su estado como completada.
La sincronización remota debe ser opcional.
No bloquear la aplicación cuando falle Google Sheets.
Utilizar UUID para evitar duplicados.
Mantener una cola de cambios pendientes.
No considerar un cambio sincronizado hasta recibir confirmación del servicio remoto.
No sobrescribir registros ante conflictos sin una estrategia explícita.
8. Restricciones de iOS y PWA
La aplicación debe ser compatible con iOS 26.
No asumir disponibilidad de APIs web que Safari no soporte.
No prometer:
- Ejecución periódica garantizada en segundo plano.
- Sincronización automática con la PWA cerrada.
- Notificaciones locales futuras con horario garantizado.
- Acceso directo universal a Face ID.
- Persistencia absolutamente garantizada sin respaldos.
La experiencia sin barras de Safari debe lograrse mediante instalación en pantalla de inicio y modo standalone.
Respetar safe areas, Dynamic Island y teclado virtual.
9. Reglas de UI/UX
- Mantener el diseño definido en SPEC.md.
- Priorizar dispositivos móviles.
- Evitar scroll horizontal.
- Evitar elementos debajo del indicador de inicio.
- Mantener importes legibles.
- Utilizar estados vacíos.
- Mostrar mensajes de error útiles.
- Confirmar operaciones destructivas.
- No utilizar colores como único indicador.
- Evitar saturar la pantalla.
- Mantener consistencia visual.
No reemplazar componentes funcionales por componentes decorativos.
10. Seguridad
Nunca incorporar:
- Contraseñas.
- Tokens privados.
- Claves de cuentas de servicio.
- Credenciales bancarias.
- Secretos OAuth.
- Datos financieros reales en el repositorio.
No registrar datos sensibles en consola.
No incorporar servicios externos de analítica o seguimiento sin necesidad y autorización.
Usar permisos mínimos.
11. Librerías y dependencias
Utilizar el stack definido en SPEC.md.
Antes de instalar una dependencia:
1. Comprobar si realmente es necesaria.
2. Verificar compatibilidad.
3. Evitar duplicar funcionalidades.
4. Mantener el proyecto compilable.
No cambiar React, Vite o Dexie por otras tecnologías sin justificación.
12. Validaciones
Después de modificar código relevante, ejecutar las comprobaciones disponibles:
npm run build
npm run lint
npm run test


Si alguno de los scripts todavía no existe, crearlo cuando corresponda o informar que no está configurado.
No afirmar que las pruebas pasaron si no fueron ejecutadas.
No ocultar errores de TypeScript.
No deshabilitar reglas de lint para evitar corregir problemas reales.
13. Desarrollo incremental
No implementar toda la aplicación en una única modificación gigantesca.
Trabajar por módulos.
Para cada módulo:
1. Definir entidades.
2. Definir reglas de negocio.
3. Implementar persistencia.
4. Implementar lógica.
5. Implementar interfaz.
6. Crear pruebas.
7. Ejecutar compilación.
8. Documentar resultados.
Mantener operativa la versión existente durante el desarrollo.
14. Proyectos y archivos
Organizar el código preferiblemente en:
src/
├── app/
├── components/
├── features/
├── domain/
├── database/
├── services/
├── hooks/
├── utils/
├── styles/
└── tests/


No colocar toda la lógica en App.tsx.
No crear archivos innecesarios ni estructuras complejas que no aporten valor.
15. Git y control de versiones
Realizar cambios pequeños y verificables.
No ejecutar operaciones destructivas de Git sin autorización.
No sobrescribir modificaciones existentes del usuario.
No subir archivos .env que contengan secretos.
Mantener .gitignore correctamente configurado.
No incluir bases de datos, respaldos privados ni movimientos financieros reales en el repositorio.
16. GitHub Pages
Mantener compatibilidad con hosting estático.
No introducir dependencias obligatorias de un backend Node.js para la operación cotidiana.
Conservar la configuración correcta del base de Vite.
No romper el Service Worker, el manifiesto ni las rutas al modificar navegación.
Las actualizaciones deben conservar IndexedDB.
17. Recordatorios
Implementar únicamente recordatorios internos.
No integrar OneSignal ni servicios externos de notificaciones.
Los avisos se calcularán al abrir la aplicación, recuperar visibilidad o modificar información relevante.
No introducir sistemas de notificaciones push externas.
18. Google Sheets
No comenzar la integración con Google Sheets hasta que la persistencia local y los respaldos estén probados.
Cuando se implemente:
- Utilizar OAuth 2.0.
- Mantener permisos mínimos.
- No guardar secretos en el frontend.
- Sincronizar de manera controlada.
- Evitar registros duplicados.
- Manejar errores y conflictos.
- Mantener funcionamiento offline.
19. Datos de demostración
Solo utilizar datos ficticios claramente identificados para desarrollo y pruebas.
La base de datos de producción debe comenzar vacía o con la información introducida durante el onboarding.
Nunca generar movimientos ficticios automáticamente para simular funcionalidades completas.
20. Documentación
Actualizar la documentación cuando se modifiquen:
- Arquitectura.
- Esquema de datos.
- Lógica financiera.
- Configuración PWA.
- Configuración de despliegue.
- Sincronización.
- Seguridad.
Mantener instrucciones claras de instalación y ejecución.
21. Comunicación con el usuario
Antes de cambios complejos, explicar brevemente qué se va a implementar.
Al terminar una tarea, indicar:
- Qué se implementó.
- Qué archivos cambiaron.
- Qué pruebas se ejecutaron.
- Qué quedó pendiente.
- Qué riesgos o limitaciones existen.
No afirmar que una funcionalidad está completa si solo está representada visualmente.
No realizar preguntas innecesarias cuando se pueda avanzar razonablemente utilizando SPEC.md.
22. Regla final
La aplicación administra información financiera personal.
La integridad contable, la protección de datos y la recuperación ante fallos son más importantes que la complejidad visual o la cantidad de funcionalidades.
Nunca sacrificar datos reales del usuario para facilitar una actualización, migración o modificación del código.

3. Primer mensaje para Codex
Una vez creados los dos archivos, abre la extensión de Codex dentro de VS Code y envíale este mensaje:
Estoy desarrollando una aplicación llamada Mis Finanzas.

Lee completamente los archivos SPEC.md y AGENTS.md antes de modificar cualquier código.

Quiero que analices toda la especificación del proyecto y comiences su desarrollo de manera profesional.

Primero:

1. Analiza la arquitectura y las dependencias actuales del proyecto Vite.
2. Define el modelo de datos y las relaciones entre cuentas, ingresos, gastos, transferencias y tarjetas.
3. Establece las reglas contables necesarias para evitar duplicaciones.
4. Organiza la estructura del proyecto.
5. Configura Tailwind CSS, Dexie, IndexedDB, React Router, Lucide React y las dependencias necesarias.
6. Configura la PWA para iOS 26 y GitHub Pages.
7. Implementa el sistema visual, navegación y tema oscuro.

Después desarrolla la Fase 1 definida en SPEC.md:

- Dashboard funcional.
- Configuración inicial.
- Cuentas bancarias.
- Ingresos.
- Registro rápido de gastos.
- Historial de movimientos.
- Transferencias entre cuentas.
- Persistencia IndexedDB.
- Copias de seguridad básicas.

No implementes todavía Google Sheets ni los módulos financieros avanzados.

Evita datos ficticios permanentes y no desarrolles pantallas que aparenten funcionar sin estar conectadas con la base de datos.

Ejecuta pruebas, lint y build.

Mantén toda la interfaz en español y optimizada para iPhone 16 Pro Max.

Al terminar, entrega un resumen de lo implementado, los archivos modificados, las pruebas realizadas y los siguientes pasos.


4. Estructura final en VS Code
C:\Proyectos\mis-finanzas

src/
Código de la aplicación


public/
Iconos y recursos


SPEC.md
Especificaciones completas


AGENTS.md
Reglas permanentes de Codex


package.json
Dependencias y comandos


vite.config.ts
Configuración de Vite
