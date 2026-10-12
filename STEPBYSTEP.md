# Plan de implementación

Prioridad: completar funcionalidades del monorepo. Las casillas representan trabajo pendiente; los criterios de salida no son resultados de pruebas. El detalle de cambios de código está en [TODO.md](TODO.md), las reglas en [REQUIREMENTS.md](REQUIREMENTS.md) y la verificación en [TESTING.md](TESTING.md).

## Punto de partida — 17/10/2026

Existe runtime Edge, autenticación, perfiles y RLS, CRUD HTTP de clientes, modelos de las cinco tablas de dominio, contratos compartidos y pantallas frontend. Hay ocho unitarios de autorización/validación en un archivo y tres suites de integración conservadas. Vehículos, órdenes, finanzas y PDF aún no tienen endpoints registrados. La conexión de las pantallas no está completa y hay diferencias con las reglas confirmadas.

Esto surge de lectura del repositorio; no constituye validación funcional ni del despliegue remoto.

## 1. Alinear propiedad, archivo y clientes

- [x] Prohibir transferencias de cliente en schemas, services y base; propietario siempre MECHANIC.
- [x] Alinear los contratos y unitarios que hoy permiten esa transferencia.
- [x] Definir recorridos operativos y de administración de archivados; impedir descendientes sobre padres no operativos en el schema local. Services HTTP de vehículos/órdenes se completan en sus incrementos.
- [x] Corregir PATCH de archivo; conectar edición y restauración. Verificación aislada de transporte y compilación; recorrido real de pantallas pendiente de integración autorizada.
- [x] Actualizar OpenAPI y REQUIREMENTS para propiedad, clientes y archivo.

Salida: clientes funciona con las reglas confirmadas; unitarios aislados cubren permisos y validaciones. No ejecutar schema, seed ni integraciones sin autorización específica.

## 2. Completar vehículos

- [x] Schema, controller, service, repository y mapper para listado, detalle, alta, edición, archivo/restauración y eliminación.
- [x] Validar padre activo, aislamiento heredado y patente única por mecánico; no permitir reasignación de cliente.
- [x] Conectar pantallas y selección/listado de clientes usando transporte Bearer.
- [x] Cubrir éxito, permisos, archivo, unicidad y conflicto por órdenes con unitarios y dobles.

Salida: un mecánico puede gestionar sus vehículos y GOD los de cualquier mecánico; contratos y documentación coinciden. Los conflictos de base tienen respuesta controlada.

## 3. Completar órdenes e hijos

- [ ] Separar contratos de creación y edición para que toda orden nazca abierta y respete los obligatorios del modelo.
- [ ] Implementar listado por vehículo, detalle, creación, edición/cierre/reapertura y eliminación.
- [ ] Guardar orden, ítems y recomendaciones atómicamente; conservar cascada al eliminar.
- [ ] Normalizar estados de recomendaciones en mappers, sin generar ítems automáticamente.
- [ ] Conectar formularios con Bearer; revisar navegación por vehículo y paginación sin truncar resultados a los primeros 100.
- [ ] Cubrir fechas, padres ajenos/inactivos, edición de cerradas, reapertura y eliminación con unitarios.

Salida: recorrido vehículo → orden → edición/cierre/reapertura funciona, sin `isActive` de orden ni endpoint global de listado.

## 4. Completar finanzas

- [ ] Cerrar convención de fechas y tratamiento del historial archivado según REQUIREMENTS, sin introducir reglas contables nuevas.
- [ ] Implementar suma de cantidad por precio solo en órdenes con salida y dentro del período de salida.
- [ ] Aplicar alcance MECHANIC/GOD y evitar multiplicar ítems al unir recomendaciones.
- [ ] Conectar filtros y total del frontend con Bearer y formato `$`.
- [ ] Cubrir exclusión de abiertas, límites de fechas, cero resultados, reapertura y aislamiento con unitarios.

Salida: total verificable con fixtures aislados, sin impuestos, conversiones ni registro de cobros.

## 5. Completar presupuesto PDF

- [ ] Validar contrato independiente de formulario y plantilla classic.
- [ ] Implementar generación compatible con Edge y respuesta PDF con nombre de descarga; admitir los headers necesarios en CORS.
- [ ] Conectar descarga autenticada, estado de generación y mensajes de error; no persistir PDFs.
- [ ] Cubrir cálculos, validación y respuesta con pruebas aisladas; revisar visualmente un PDF con datos ficticios generado sin servicios externos.

Salida: PDF legible descargable con importes y datos del formulario, independiente de clientes/órdenes almacenados.

## 6. Cierre funcional y documental

- [ ] Revisar todos los recorridos del frontend, autorización, estados vacíos y errores; no confundir compilación con verificación de flujo real.
- [ ] Ejecutar formato enfocado, lint, typecheck, unitarios, build y diff-check según el cambio.
- [ ] Actualizar OpenAPI, REQUIREMENTS, TESTING y TODO con el estado real y resultados fechados.
- [ ] Solo ante autorización explícita, ejecutar las integraciones existentes. Pedir aprobación separada antes de crear nuevas integraciones.
- [ ] Después de completar funcionalidades, evaluar optimizaciones justificadas por el informe de performance; no reducir controles de acceso para ganar tiempo.

Salida: alcance implementado, comprobaciones registradas y limitaciones explícitas. No se requiere commit ni despliegue como parte de este plan.

## Registro breve

| Fecha      | Alcance y cambios                                                                                                | Verificación                                                                                                           | Pendiente                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 17/10/2026 | Reorganización de Markdown; incorporación de reglas confirmadas; flujos integrados en REQUIREMENTS; plan y TODO. | Revisión estática y comprobaciones documentales; resultados en TESTING. Sin pruebas funcionales ni servicios externos. | Todo cambio de código listado en TODO y los incrementos anteriores. |

Al completar un incremento, registrar solamente alcance final, cambios, verificaciones efectivamente realizadas y pendientes. No marcar terminado por haber escrito el plan o creado un test.

### 17/10/2026 — TODO paso 1

Implementados contratos y autorización de alta/edición, garantías SQL de propiedad y parentesco, perfiles sin escritura Data API, seed revisado y suite de integración existente alineada sin ejecutarla. OpenAPI y REQUIREMENTS actualizados para este alcance. Archivo y frontend del incremento 1 siguen pendientes en TODO paso 2. Resultados locales en TESTING; sin cambios remotos.

### 17/10/2026 — TODO paso 2

Corregido PATCH de archivo y conectadas edición/restauración explícitas. Formulario compartido de clientes, selección activa y paginación completa en búsqueda/selección/detalle. El fallo del endpoint pendiente de vehículos se muestra sin bloquear al cliente. RLS local condiciona descendientes al estado de sus padres, conservando administración del vehículo archivado bajo cliente activo. No se implementaron los endpoints de vehículos/órdenes de los pasos siguientes. Verificaciones locales y límites en TESTING; sin cambios remotos.

### 17/10/2026 — TODO paso 3

Implementado CRUD HTTP de vehículos y archivo/restauración, contratos separados, cliente inmutable, validación estricta y controles de padre activo/propiedad en service y repository. Pantallas con Bearer, restauración y paginación completa de búsqueda. Reutilizadas restricciones SQL de patente por mecánico y FK restrictiva de órdenes; errores 409 sin detalles de base. OpenAPI y REQUIREMENTS alineados. Verificación local en TESTING; sin schema, seed, integraciones remotas ni deploy. Órdenes permanece en TODO paso 4.
