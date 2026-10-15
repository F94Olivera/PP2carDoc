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

- [x] Separar contratos de creación y edición para que toda orden nazca abierta y respete los obligatorios del modelo.
- [x] Implementar listado por vehículo, detalle, creación, edición/cierre/reapertura y eliminación.
- [x] Guardar orden, ítems y recomendaciones atómicamente; conservar cascada al eliminar.
- [x] Normalizar estados de recomendaciones en mappers, sin generar ítems automáticamente.
- [x] Conectar formularios con Bearer; revisar navegación por vehículo y paginación sin truncar resultados a los primeros 100.
- [x] Cubrir fechas, padres ajenos/inactivos, edición de cerradas, reapertura y eliminación con unitarios.

Salida: recorrido vehículo → orden → edición/cierre/reapertura funciona, sin `isActive` de orden ni endpoint global de listado.

## 4. Completar finanzas

- [x] Cerrar convención de fechas y tratamiento del historial archivado según REQUIREMENTS, sin introducir reglas contables nuevas.
- [x] Implementar suma de cantidad por precio solo en órdenes con salida y dentro del período de salida.
- [x] Aplicar alcance MECHANIC/GOD y evitar multiplicar ítems al unir recomendaciones.
- [x] Conectar filtros y total del frontend con Bearer y formato `$`.
- [x] Cubrir exclusión de abiertas, límites de fechas, cero resultados, reapertura y aislamiento con unitarios.

Salida local: validación, límites de calendario, transporte y frontera de consulta cubiertos con unitarios/dobles; suma/alcance SQL comprobados estáticamente. Sin ejecución PostgreSQL/RLS ni prueba real de edición de órdenes. Sin impuestos, conversiones ni registro de cobros.

## 5. Completar presupuesto PDF

- [x] Validar contrato independiente de formulario y plantilla classic.
- [x] Implementar generación compatible con Edge y respuesta PDF con nombre de descarga; admitir los headers necesarios en CORS.
- [x] Conectar descarga autenticada, estado de generación y mensajes de error; no persistir PDFs.
- [x] Cubrir cálculos, validación y respuesta con pruebas aisladas; revisar visualmente un PDF con datos ficticios generado sin servicios externos.

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

### 17/10/2026 — TODO paso 5 (transporte y contratos)

Completado Bearer en finanzas y PDF; API I/O del PDF en módulo de dominio. Transporte conserva Accept, omite cookies, comparte renovación anticipada y centraliza aviso de 401 sin reintentar mutaciones. Logout usa API y luego limpieza local; contrato compartido de error alineado a `{ error: string }`. Ocho unitarios nuevos aislados; resultados en TESTING. Los endpoints de finanzas/PDF y el paso 4 de TODO siguen pendientes. El cierre remoto ya está en TODO paso 9; no se ejecutó.

### 17/10/2026 — TODO paso 6 (finanzas)

Implementado GET `/finances` y agregado privado con sesión/propiedad/rol vigente, órdenes cerradas, período de salida por días de Buenos Aires e inclusión de padres archivados. Sin joins con recomendaciones, total cero sin coincidencias y lectura nueva por petición. Frontend con Bearer, filtros rápidos en Buenos Aires, explicación del alcance y estados de carga/error diferenciados de cero. Contratos y documentación alineados. Verificaciones aisladas y límites en TESTING; función SQL sin aplicar, sin seed, integraciones ni deploy. Cierre remoto en TODO paso 9.

### Paso 7 de TODO — presupuesto PDF (17/10/2026)

Endpoint protegido, schema compartido estricto, classic en memoria con paginación, CORS de descarga y validación frontend implementados localmente. Unitarios y muestra visual aislada registrados en TESTING; sin schema, seed, integraciones ni deploy. El cierre remoto continúa en TODO paso 9.

### 17/10/2026 — TODO paso 8 (calidad local)

Ampliada cobertura aislada de casos de uso, controllers y mappers de clientes/Auth: 60/60 unitarios aprobados. Node 26.3.0 fijado en `.nvmrc` y rango engines documentado; pnpm 11.7.0 existente. Revisión estática de efectos y viajes a Postgres registrada en TODO; región ya implementada, pool conservado. La revisión final de rendimiento queda abierta hasta terminar órdenes (paso 4). Sin cambios de flujo ni contratos; evidencia y límites en TESTING. Cierre de seed/schema/integraciones/deploy ya contemplado en paso 9, sin ejecutar.

### 17/10/2026 — TODO paso 9 (demo Supabase)

Con autorización explícita se ejecutó reinicio destructivo de `lsbgegbghlgxkqxpmgyx`, con inventario y copia local de dominio/fuentes anteriores. Seed ampliado con casos de archivo de cliente/vehículo e integración existente alineada con los nuevos totales y padres operativos. Schema aplicado y API versión 7 publicada mediante conector Supabase; la CLI carece de access token. Resultados de seed e integraciones en [el informe de cierre](docs/supabase-closure-2026-10-17.md) y TESTING. Este cierre corresponde a las funcionalidades disponibles: TODO paso 4 y revisión final del paso 8 siguen pendientes y exigirán revalidación y otro despliegue cuando se implementen.

Resultado del paso 9: 60/60 unitarios, formato, lint, TypeScript, build, enlaces y diff-check aprobados; las tres integraciones terminaron con salida 0. Inventario final igual al seed, roles restaurados, sin fixtures ni sesiones temporales. Bundle remoto idéntico al build local.

### 17/10/2026 — STEPBYSTEP pasos 1, 2 y 3

Pasos 1 y 2 ya implementados, revalidados con la suite local. Completado órdenes e hijos (TODO paso 4): contratos separados, cinco rutas autenticadas, transacciones de agregado, mappers de estados, validación estricta, edición/cierre/reapertura, eliminación con cascada existente y pantallas con paginación completa. OpenAPI y REQUIREMENTS actualizados. Verificaciones y límites en TESTING. Cierre remoto ya contemplado al final de TODO paso 9; no se repite ni ejecuta en esta entrega.
