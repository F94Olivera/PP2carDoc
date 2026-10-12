# Cambios de código pendientes

El backlog se inició tras la reorganización documental del 17/10/2026. Los pasos 1, 2, 3, 5 y 6 fueron implementados localmente por solicitud del usuario; no se aplicaron al despliegue. Los demás pasos siguen pendientes. Orden de entrega en [STEPBYSTEP.md](STEPBYSTEP.md); reglas en [REQUIREMENTS.md](REQUIREMENTS.md).

## 1. Propiedad y autorización — primero

- [x] Separar creación y edición de clientes en `apps/back/src/schemas/customer.ts` y `packages/types/src/customer.ts`: permitir asignar MECHANIC al crear como GOD, prohibir cambiar `mechanicId` en PATCH incluso como GOD. La asignación por defecto a GOD tampoco es válida.
- [x] Ajustar `customer-service.ts` y repositories para comprobar que el propietario existe y tiene rol MECHANIC. Mantener las reglas en la base ante Data API directa; una FK al perfil no comprueba su rol.
- [x] Alinear `supabase/schema.sql`: hoy las políticas permiten cambiar propietario y los triggers mantienen patentes durante transferencias. Impedir reasignaciones de cliente y de padres de vehículo/orden. Revisar triggers que quedan obsoletos sin perder unicidad de patente bajo concurrencia.
- [x] Evitar que un cambio de rol deje a GOD como propietario de clientes; revisar la operación directa de perfiles que hoy permite GOD. La aplicación solo necesita seed para altas/roles por ahora.
- [x] Revisar el seed para que sus fixtures sigan cumpliendo las reglas; documentar cómo alinear datos de demo preexistentes sin asumir que editar SQL cambia el despliegue.
- [x] Actualizar unitarios y `tests/integration/smoke-authorization.mjs`: hoy prueban transferencias permitidas a GOD. Corregir escenarios a rechazo de transferencias y propietario MECHANIC. No crear una integración nueva ni ejecutar las existentes sin las autorizaciones indicadas en TESTING.

Verificación local y límites en TESTING. Para alinear una demo existente, consultar [docs/demo-ownership-alignment.md](docs/demo-ownership-alignment.md); editar el schema no actualiza la base desplegada.

## 2. Clientes y archivo

- [x] Corregir archivo para enviar PATCH a `/customers/:id` con `{ isActive }`. Conectar edición general mediante formulario compartido con alta y restauración explícita desde el detalle.
- [x] Separar administración de clientes archivados del recorrido operativo. Alta de vehículo selecciona exclusivamente clientes activos, recorre todas las páginas y rechaza selecciones inválidas; RLS exige cliente activo también para escritura directa.
- [x] Aplicar estado activo de padres en políticas de vehículos, órdenes e hijos, sin excepción para GOD. Vehículos archivados conservan acceso administrativo bajo cliente activo; restaurar cliente no cambia el estado propio de sus vehículos.
- [x] Agregar unitarios aislados de archivo/restauración, transporte PATCH, paginación y errores; comprobaciones estáticas de políticas para IDs directos y validación de ambos padres. Estas comprobaciones no ejecutan ni demuestran RLS real.

El detalle de cliente sigue funcionando aunque falle el listado de vehículos, implementado en el paso 3. Las políticas se aplican a Data API y a operaciones bajo `withUserDatabase` una vez aplicado el schema; el paso 3 completa vehículos; órdenes sigue pendiente del paso 4, incluidos sus filtros operativos, validación de padres en services y unitarios por operación. No hay cambios remotos ni verificación contra base viva. Resultados en TESTING.

## 3. Vehículos

- [x] Implementar listado, detalle, alta, edición, archivo/restauración y eliminación con schema/controller/service/repository/mapper.
- [x] Separar alta/edición: PUT rechaza `customerId` y campos generados; padre inmutable.
- [x] Validar patente, marca, modelo, año, kilometraje y unidad. Normalizar patente y traducir conflictos SQL de unicidad por mecánico/dependencias a 409.
- [x] Conectar pantallas con Bearer, restauración explícita y búsqueda por todas las páginas. Consultar directamente al cliente del detalle sin limitarse a los primeros 100.

Implementación y verificaciones locales en TESTING. Las restricciones de patente y parentesco usan el schema SQL existente; no se aplicó schema, seed ni deploy. Unitarios con dobles no demuestran RLS ni concurrencia reales. El historial de órdenes muestra su propio error sin bloquear la administración del vehículo; su endpoint sigue pendiente del paso 4.

## 4. Órdenes, ítems y recomendaciones

- [ ] Implementar creación, detalle, edición, eliminación y listado exclusivamente por vehículo; no crear GET global `/work-orders`.
- [ ] Separar contratos de creación/edición en `packages/types/src/work-order.ts`. Hoy `reportedProblem` es opcional aunque el modelo lo requiere; `exitDate` en creación permite nacer cerrada. Asegurar salida nula al crear y problema reportado obligatorio; revisar formulario de nueva orden que hoy admite salida.
- [ ] No permitir cambiar `vehicleId` al editar. Validar que IDs de ruta y parentesco coinciden y pertenecen al alcance autorizado.
- [ ] Usar transacciones para orden e hijos; comprobar cascada existente de ítems/recomendaciones sin recrearla innecesariamente. Editar cerradas, cerrar con salida válida y reabrir con salida nula.
- [ ] Normalizar estados: persistencia `pending/accepted/rejected`, contrato `PENDING/ACCEPTED/REJECTED`; prioridad `low/medium/high`. No generar ítems al aceptar recomendaciones.
- [ ] Alinear números entre modelos, contratos y formularios: el precio de ítem es entero en base; no aceptar decimales que fallen después en persistencia ni cambiar tablas silenciosamente. Validar cantidad positiva, precio no negativo y valores finitos.
- [ ] Revisar la vista frontend `/work-orders`: hoy compone un listado recorriendo vehículos y tiene enlaces directos. Mantener el acceso autorizado por vehículo, sin introducir un endpoint global; corregir truncamiento a la primera página de vehículos/órdenes.

## 5. Transporte y contratos compartidos

- [x] Completar `fetchAuthenticated` en finanzas y PDF. Clientes, vehículos y órdenes también usan Bearer; se conserva `Accept: application/pdf`, sin cookies como credencial de API.
- [x] Revisar logout del frontend y renovación: POST `/logout` revoca la sesión actual antes de limpiar tokens/cookies con el SDK; fallos 429/503 no confirman éxito. Renovación 30 segundos antes del límite de 15 minutos, compartida entre pedidos simultáneos; 401 notifica sesión expirada sin repetir mutaciones.
- [x] Alinear `packages/types/src/api-error.ts` y consumidores con `{ error: string }`; respuestas inválidas usan el mensaje de respaldo.
- [x] Revisar `docs/openapi.yaml`: el formato de error ya coincide; aclarado el consumo de logout sin cambiar rutas ni contratos HTTP. Finanzas se implementó en el paso 6; PDF sigue pendiente del paso 7.

Verificación aislada del transporte, renovación, errores, logout y clientes de finanzas/PDF en TESTING. Sin llamadas reales a Auth/API/base ni cambios remotos. El cierre de seed, schema, integraciones y deploy ya está contemplado en el paso 9.

## 6. Finanzas

- [x] Implementar GET `/finances` por alcance de propietario, sumando `quantity * unitPrice` solo de órdenes con `exitDate` no nula y filtrando por salida.
- [x] Definir zona horaria y límites de `startDate/endDate` compatibles con los timestamps actuales. Días de Buenos Aires, convertidos a UTC para las columnas actuales; intervalo semiabierto hasta el comienzo del día siguiente al final.
- [x] Conservar órdenes cerradas de padres archivados en el total; función agregada privada con sesión/rol/propiedad explícitos, sin abrir acceso operativo.
- [x] Evitar duplicar importes al unir ítems y recomendaciones; cero resultados devuelve cero. Cubrir cambios del total al editar/reabrir/eliminar una orden.
- [x] Conectar UI con Bearer y mostrar `$`, sin conversiones, impuestos, cobros ni notas de crédito.

Implementación y controles locales en TESTING. La suma y sus filtros SQL tienen comprobaciones estáticas; los dobles verifican transporte, frontera autenticada y recálculo sin caché, sin ejecutar SQL ni demostrar RLS real. La función/permisos de `supabase/schema.sql` deben aplicarse mediante el cierre del paso 9 antes de habilitar el endpoint en el despliegue. Órdenes sigue pendiente del paso 4.

## 7. PDF

- [ ] Implementar POST `/budgets/pdf` protegido, con validación estricta y generación compatible con Edge. Solo usar datos del formulario y plantilla classic; no persistir ni enviar el archivo.
- [ ] Responder `application/pdf` y `Content-Disposition`; exponer el header en CORS si el navegador necesita leer el nombre.
- [ ] Alinear validación de cantidades/precios del formulario y backend; comprobar descarga, errores y legibilidad con datos ficticios y generación aislada.

## 8. Calidad y tareas posteriores

- [ ] Agregar unitarios por caso de uso con dobles de repositories/Auth; ampliar cobertura de controllers y mappers según los módulos implementados. No usar APIs ni base real.
- [ ] Fijar/documentar versión compatible de Node cuando se verifique el runtime de desarrollo; no incorporar herramientas solo para ello.
- [ ] Al terminar funcionalidades, revisar requests duplicadas/carreras en efectos y viajes secuenciales a Postgres; evaluar instrumentación Pino/Server-Timing y volumen antes de modificar el pool `max: 1`.
- [ ] La selección regional `x-region: us-west-2` ya existe en el transporte actual: no registrarla como optimización pendiente de implementar. Las mediciones nuevas con Auth/base/API requieren autorización explícita.
- [ ] Actualizar TESTING con resultados reales y cerrar casillas solo tras implementar y verificar. Ningún resultado histórico demuestra el estado remoto o la conformidad con las nuevas reglas.

## 9. Cierre en Supabase: seed, schema, integraciones y deploy

Este bloque reúne el trabajo pendiente de preparación y ejecución sobre Supabase al finalizar los cambios de aplicación. El paso 1 modificó localmente schema, seed y la integración de autorización; esos archivos todavía no fueron aplicados ni probados contra Supabase. Este listado y la autorización para commit/push no autorizan ejecutar schema, seed, integraciones ni deploy.

- [ ] Revisar y completar las modificaciones del seed según los módulos terminados: propietarios exclusivamente MECHANIC, GOD sin clientes, padres válidos, patentes únicas por mecánico y fixtures representativos de archivo y órdenes abiertas/cerradas. Conservar la limpieza ordenada de fixtures y el rechazo de datos ajenos al seed que impidan restaurar roles.
- [ ] Elegir explícitamente el proyecto de demo y revisar el estado de sus datos antes de tocarlo. Seguir [la guía de alineación](docs/demo-ownership-alignment.md): decidir entre reinicio destructivo con `supabase/schema.sql` o una migración revisada que conserve datos; respaldar lo necesario y resolver propietarios/colisiones existentes.
- [ ] Con autorización explícita, aplicar el schema o la migración elegida. Incluir restricciones de propietario MECHANIC y parentesco inmutable, permisos de perfiles, retiro de triggers de transferencia, conservación del índice privado de patentes y función privada de finanzas con sus permisos. Editar SQL en el repositorio no modifica el despliegue.
- [ ] Con autorización explícita, ejecutar el seed revisado sobre el proyecto elegido. Tener en cuenta que elimina/recrea fixtures y restaura credenciales y sesiones de cuentas demo; comprobar el resultado solo dentro del alcance autorizado.
- [ ] Revisar las tres integraciones existentes frente a los contratos finales, manteniéndolas separadas de los agregados unitarios. La suite de autorización ya fue adaptada a rechazo de transferencias y propietarios inválidos, pero no fue ejecutada. Antes de crear nuevas integraciones, solicitar la aprobación específica prevista en TESTING.
- [ ] Con solicitud explícita para ejecutar integraciones, correr las suites acordadas (`test:auth`, `test:customers`, `test:authorization`) contra API, Auth y base del mismo proyecto. Verificar propiedad, parentescos, roles actuales, aislamiento RLS, unicidad de patentes bajo concurrencia y revocación; registrar resultados, limpieza y límites reales. Aprobar creación de tests no autoriza su ejecución.
- [ ] Preparar el deploy: completar formato, lint, TypeScript, unitarios, build y diff-check; revisar configuración del proyecto, secretos exclusivamente de servidor y compatibilidad del schema con la API que se publicará. Definir el orden de aplicación y recuperación antes de cambiar el entorno.
- [ ] Con autorización explícita, desplegar la API a Supabase mediante el comando documentado y coordinarlo con la actualización de base. Acordar las comprobaciones posteriores que hagan requests reales; no ejecutar integraciones como efecto incidental del deploy.
- [ ] Actualizar README, REQUIREMENTS, STEPBYSTEP y TESTING con la versión efectivamente aplicada, fecha, proyecto sin secretos, cambios de schema/seed, comandos ejecutados, resultados y pendientes. Cerrar estas casillas únicamente con evidencia de cada operación.
