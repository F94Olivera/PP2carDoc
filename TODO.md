# Cambios de código pendientes

El backlog se inició tras la reorganización documental del 17/10/2026. El paso 1 fue implementado localmente por solicitud del usuario; no se aplicó al despliegue. Los demás pasos siguen pendientes. Orden de entrega en [STEPBYSTEP.md](STEPBYSTEP.md); reglas en [REQUIREMENTS.md](REQUIREMENTS.md).

## 1. Propiedad y autorización — primero

- [x] Separar creación y edición de clientes en `apps/back/src/schemas/customer.ts` y `packages/types/src/customer.ts`: permitir asignar MECHANIC al crear como GOD, prohibir cambiar `mechanicId` en PATCH incluso como GOD. La asignación por defecto a GOD tampoco es válida.
- [x] Ajustar `customer-service.ts` y repositories para comprobar que el propietario existe y tiene rol MECHANIC. Mantener las reglas en la base ante Data API directa; una FK al perfil no comprueba su rol.
- [x] Alinear `supabase/schema.sql`: hoy las políticas permiten cambiar propietario y los triggers mantienen patentes durante transferencias. Impedir reasignaciones de cliente y de padres de vehículo/orden. Revisar triggers que quedan obsoletos sin perder unicidad de patente bajo concurrencia.
- [x] Evitar que un cambio de rol deje a GOD como propietario de clientes; revisar la operación directa de perfiles que hoy permite GOD. La aplicación solo necesita seed para altas/roles por ahora.
- [x] Revisar el seed para que sus fixtures sigan cumpliendo las reglas; documentar cómo alinear datos de demo preexistentes sin asumir que editar SQL cambia el despliegue.
- [x] Actualizar unitarios y `tests/integration/smoke-authorization.mjs`: hoy prueban transferencias permitidas a GOD. Corregir escenarios a rechazo de transferencias y propietario MECHANIC. No crear una integración nueva ni ejecutar las existentes sin las autorizaciones indicadas en TESTING.

Verificación local y límites en TESTING. Para alinear una demo existente, consultar [docs/demo-ownership-alignment.md](docs/demo-ownership-alignment.md); editar el schema no actualiza la base desplegada.

## 2. Clientes y archivo

- [ ] Corregir `apps/front/app/(app)/customers/customer-api.ts`: archivo usa `/customers/:id/archive`, ruta inexistente. Enviar PATCH a `/customers/:id` con `{ isActive }`; revisar si falta conectar edición general en la UI.
- [ ] Diferenciar administración de archivados del acceso operativo. No dejar que un cliente archivado aparezca como opción de alta de vehículo; comprobarlo también en servidor.
- [ ] Implementar validación de cliente/vehículo activos en las operaciones descendientes y revisar políticas directas: las políticas actuales heredan propiedad, pero no comprueban `is_active`.
- [ ] Definir pruebas unitarias de acceso directo a descendientes de padres no operativos, sin depender de esconder links. Conservar archivo/restauración explícitos y sus validaciones de padre.

## 3. Vehículos

- [ ] Implementar endpoints pendientes con schema/controller/service/repository/mapper: listar, consultar, crear, editar, archivar/restaurar y eliminar.
- [ ] Mantener `customerId` fijo al editar; el contrato actual `CreateVehicleRequest` se reutiliza para PUT y permite enviarlo. Diferenciar tipos de alta/edición y rechazar reasignaciones.
- [ ] Validar patente, marca, modelo, año, kilometraje y unidad; manejar patente duplicada por mecánico y conflicto al eliminar vehículos con órdenes.
- [ ] Conectar las pantallas existentes y aplicar paginación completa, evitando asumir que los primeros 100 registros representan todo el conjunto.

## 4. Órdenes, ítems y recomendaciones

- [ ] Implementar creación, detalle, edición, eliminación y listado exclusivamente por vehículo; no crear GET global `/work-orders`.
- [ ] Separar contratos de creación/edición en `packages/types/src/work-order.ts`. Hoy `reportedProblem` es opcional aunque el modelo lo requiere; `exitDate` en creación permite nacer cerrada. Asegurar salida nula al crear y problema reportado obligatorio; revisar formulario de nueva orden que hoy admite salida.
- [ ] No permitir cambiar `vehicleId` al editar. Validar que IDs de ruta y parentesco coinciden y pertenecen al alcance autorizado.
- [ ] Usar transacciones para orden e hijos; comprobar cascada existente de ítems/recomendaciones sin recrearla innecesariamente. Editar cerradas, cerrar con salida válida y reabrir con salida nula.
- [ ] Normalizar estados: persistencia `pending/accepted/rejected`, contrato `PENDING/ACCEPTED/REJECTED`; prioridad `low/medium/high`. No generar ítems al aceptar recomendaciones.
- [ ] Alinear números entre modelos, contratos y formularios: el precio de ítem es entero en base; no aceptar decimales que fallen después en persistencia ni cambiar tablas silenciosamente. Validar cantidad positiva, precio no negativo y valores finitos.
- [ ] Revisar la vista frontend `/work-orders`: hoy compone un listado recorriendo vehículos y tiene enlaces directos. Mantener el acceso autorizado por vehículo, sin introducir un endpoint global; corregir truncamiento a la primera página de vehículos/órdenes.

## 5. Transporte y contratos compartidos

- [ ] Usar `fetchAuthenticated` en vehículos/órdenes, finanzas y PDF: hoy llaman a `fetchApi` con `credentials: include` sin Bearer, a diferencia de clientes.
- [ ] Revisar logout del frontend y renovación para mantener coherencia con revocación de sesión y límite de 15 minutos de la API.
- [ ] Alinear `packages/types/src/api-error.ts` y consumidores con el formato implementado `{ error: string }`; no mantener contratos divergentes por módulo.
- [ ] Actualizar `docs/openapi.yaml` en la misma entrega que cambie endpoints. Los contratos de propiedad de clientes se alinearon en el paso 1; mantenerlos actualizados en los siguientes módulos.

## 6. Finanzas

- [ ] Implementar GET `/finances` por alcance de propietario, sumando `quantity * unitPrice` solo de órdenes con `exitDate` no nula y filtrando por salida.
- [ ] Definir zona horaria y límites de `startDate/endDate` compatibles con los timestamps actuales. Propuesta para evaluar: días de Buenos Aires e intervalo semiabierto hasta el comienzo del día siguiente al final.
- [ ] Acordar el tratamiento de órdenes cerradas cuyos padres estén archivados; no confundir ocultar historial operativo con excluirlo de un total financiero.
- [ ] Evitar duplicar importes al unir ítems y recomendaciones; cero resultados devuelve cero. Cubrir cambios del total al editar/reabrir/eliminar una orden.
- [ ] Conectar UI con Bearer y mostrar `$`, sin conversiones, impuestos, cobros ni notas de crédito.

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
- [ ] Con autorización explícita, aplicar el schema o la migración elegida. Incluir restricciones de propietario MECHANIC y parentesco inmutable, permisos de perfiles, retiro de triggers de transferencia y conservación del índice privado de patentes. Editar SQL en el repositorio no modifica el despliegue.
- [ ] Con autorización explícita, ejecutar el seed revisado sobre el proyecto elegido. Tener en cuenta que elimina/recrea fixtures y restaura credenciales y sesiones de cuentas demo; comprobar el resultado solo dentro del alcance autorizado.
- [ ] Revisar las tres integraciones existentes frente a los contratos finales, manteniéndolas separadas de los agregados unitarios. La suite de autorización ya fue adaptada a rechazo de transferencias y propietarios inválidos, pero no fue ejecutada. Antes de crear nuevas integraciones, solicitar la aprobación específica prevista en TESTING.
- [ ] Con solicitud explícita para ejecutar integraciones, correr las suites acordadas (`test:auth`, `test:customers`, `test:authorization`) contra API, Auth y base del mismo proyecto. Verificar propiedad, parentescos, roles actuales, aislamiento RLS, unicidad de patentes bajo concurrencia y revocación; registrar resultados, limpieza y límites reales. Aprobar creación de tests no autoriza su ejecución.
- [ ] Preparar el deploy: completar formato, lint, TypeScript, unitarios, build y diff-check; revisar configuración del proyecto, secretos exclusivamente de servidor y compatibilidad del schema con la API que se publicará. Definir el orden de aplicación y recuperación antes de cambiar el entorno.
- [ ] Con autorización explícita, desplegar la API a Supabase mediante el comando documentado y coordinarlo con la actualización de base. Acordar las comprobaciones posteriores que hagan requests reales; no ejecutar integraciones como efecto incidental del deploy.
- [ ] Actualizar README, REQUIREMENTS, STEPBYSTEP y TESTING con la versión efectivamente aplicada, fecha, proyecto sin secretos, cambios de schema/seed, comandos ejecutados, resultados y pendientes. Cerrar estas casillas únicamente con evidencia de cada operación.
