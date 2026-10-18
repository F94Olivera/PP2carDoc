# Requisitos de carDoc

## 1. Objetivo y alcance

Aplicación multiusuario para gestionar clientes, vehículos, órdenes de trabajo, recomendaciones, resumen financiero y presupuestos PDF. Incluye frontend, backend y contratos compartidos. Se usan datos ficticios y Supabase Edge Functions. La prioridad es completar funcionalidades; no hay fecha de entrega ni defensa oral que documentar.

Este documento define el comportamiento objetivo confirmado con el usuario. Las diferencias con el código se identifican aquí y se detallan en [TODO.md](TODO.md). Un requisito o una pantalla existente no implica una funcionalidad terminada. El contrato técnico implementado está en [docs/openapi.yaml](docs/openapi.yaml); debe actualizarse al implementar los pendientes.

## 2. Tecnologías y decisiones confirmadas

- Monorepo pnpm: Next.js/React/Tailwind, Express/TypeScript, contratos `@cardoc/types`.
- Supabase Auth y Postgres; Drizzle/Postgres.js en repositories, Zod para entradas, Pino para logs.
- Express se ejecuta como Edge Function. Un único `.env` raíz; configuración pública separada de secretos.
- Usuarios de demo creados solo mediante seed. No hay registro público, recuperación de contraseña ni administración de usuarios/roles en la aplicación por ahora.
- Roles GOD y MECHANIC; no existe una entidad taller compartida entre varios mecánicos.
- Datos ficticios y esquema de demo recreable, sin migraciones incrementales. La recreación no es parte del despliegue.

## 3. Entidades y relaciones

| Entidad         | Relación y campos relevantes                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Perfil          | ID de Supabase Auth y rol GOD/MECHANIC. No almacena contraseñas propias.                                                                            |
| Cliente         | Pertenece a un MECHANIC mediante `mechanicId`; nombre obligatorio, datos de contacto/documento/notas opcionales, `isActive`.                        |
| Vehículo        | Pertenece a un cliente; patente, marca, modelo y unidad km/mi obligatorios; año y kilometraje inicial opcionales; `isActive`.                       |
| Orden           | Pertenece a un vehículo; `entryDate` y `reportedProblem` obligatorios en el modelo; salida, kilometraje de ingreso, notas y diagnóstico opcionales. |
| Ítem            | Hijo de una orden; descripción, categoría labor/part/other, cantidad positiva y precio unitario no negativo.                                        |
| Recomendación   | Hija opcional de una orden; descripción obligatoria, motivo, estado y prioridad opcionales.                                                         |
| Presupuesto PDF | Documento independiente formado con los datos del formulario; no es una entidad persistida.                                                         |

IDs y timestamps generados no son editables. El documento de cliente es único por mecánico cuando se informa. La patente se compara sin diferencias de mayúsculas ni espacios extremos y es única por mecánico, incluso entre vehículos de clientes distintos.

El modelo actual usa enteros para precios de ítems y permite cantidades fraccionarias. La API y los formularios deben acordar esa representación antes de terminar órdenes; ver TODO. No se requiere un sistema de monedas ni conversiones.

## 4. Reglas de negocio y flujos

### Identidad, roles y propiedad

MECHANIC solo puede consultar y operar sus propios clientes y descendientes. GOD puede consultar, crear, editar, archivar y eliminar en todo el conjunto de datos, pero sigue autenticándose y respetando las reglas de negocio. Se usa principalmente para verificar el sistema.

El propietario de un cliente siempre tiene rol MECHANIC. Al crear, MECHANIC usa su propia identidad; GOD debe identificar un MECHANIC destinatario. **No se permite cambiar `mechanicId` después de crear el cliente, tampoco a GOD.** No se incorpora el cambio de cliente/propietario de un vehículo en esta entrega. La propiedad de vehículos, órdenes, ítems y recomendaciones se hereda de sus padres.

El incremento local de propiedad rechaza transferencias y exige propietario MECHANIC; las garantías SQL todavía deben aplicarse y verificarse en el proyecto de demo. La Data API requiere las mismas reglas que la API HTTP.

### Clientes y archivo

Crear cliente → validar campos declarados y propietario → persistir → devolver contrato público. Consultar/editar/eliminar requiere acceso al recurso. El nombre es obligatorio; no aceptar campos generados o de privilegio.

Archivar cambia `isActive` a false y lo oculta del uso habitual. Un request directo no debe permitir agregar vehículos a un cliente archivado. Sus vehículos no deben aparecer en listados operativos; las órdenes se alcanzan a través de vehículos y no necesitan su propio `isActive`. Los controles de acceso y de padres activos deben aplicarse en servidor; ocultar links no es una validación.

La aplicación ya contempla filtros de archivados y restauración. Se conservan como operaciones explícitas de administración para recursos propios o de GOD, separadas de los recorridos operativos. Archivo no significa eliminación física.

Eliminar físicamente un cliente con vehículos se rechaza por la relación restrictiva; sin dependencias puede eliminarse. Actualmente el detalle por ID permite clientes archivados y existe `includeArchived`; al completar la funcionalidad hay que distinguir administración de archivo de acceso operativo.

### Vehículos

Crear vehículo → verificar acceso y estado activo del cliente → validar datos y patente única por mecánico → persistir. Editar sus datos no permite cambiar `customerId`. Archivar oculta el vehículo de los recorridos operativos y evita iniciar nuevas órdenes sobre él. Restaurar es una operación explícita sobre un recurso autorizado y con padre operativo.

Año mínimo del modelo: 1886; kilometraje no negativo; unidad km o mi. Eliminar un vehículo con órdenes se rechaza por la relación restrictiva. No agregar un propietario duplicado al vehículo para resolver autorización.

### Órdenes de trabajo

Se accede al historial desde el vehículo. No se crea un endpoint global `GET /work-orders`. Una vista del frontend que componga información por vehículo no equivale a ese endpoint; el acceso a cada recurso sigue validándose en servidor.

Crear orden → comprobar vehículo y cliente accesibles/activos → validar entrada y problema reportado → guardar orden e hijos en una transacción. Toda nueva orden tiene fecha de entrada y `exitDate = null`. Los campos obligatorios salen del modelo, no de la opcionalidad accidental del contrato actual.

Completar la fecha de salida cierra la orden; debe ser igual o posterior a la entrada. La orden puede editarse abierta o cerrada. Quitar la salida la reabre; no se agrega un estado redundante ni `isActive`. Su vehículo no se cambia al editar.

Eliminar orden elimina también sus ítems y recomendaciones. Las claves foráneas actuales ya declaran cascada para ambos hijos; el endpoint local las conserva. La edición de orden e hijos debe ser atómica para evitar actualizaciones parciales.

### Recomendaciones

Una orden puede no tener recomendaciones. Permiten registrar observaciones, trabajos que el cliente no quiso realizar y cuestiones para revisar en próximas visitas. Se conserva el estado PENDING/ACCEPTED/REJECTED del contrato público y prioridad low/medium/high. El modelo almacena estados en minúsculas; un mapper debe convertirlos explícitamente.

Aceptar una recomendación no genera automáticamente trabajo ni ítems. El registro es una observación operativa; no se incorpora firma ni mecanismo de aceptación legal.

### Finanzas

El total es la suma de `quantity × unitPrice` de los ítems pertenecientes a órdenes cerradas (`exitDate` no nula). El período se filtra por **fecha de salida**, porque la entrega es el momento relevante. MECHANIC obtiene su total; GOD puede obtener el total global de los mecánicos.

Mostrar importes con `$`. No incluir órdenes abiertas, impuestos, descuentos, notas de crédito, métodos de pago ni tipos de cambio. Reabrir, editar o eliminar una orden cambia el total calculado; no hay un libro contable separado. Sin órdenes que cumplan el filtro, devolver total cero.

El período usa días completos de `America/Argentina/Buenos_Aires`: `startDate` y `endDate` obligatorias en YYYY-MM-DD, fechas reales entre los años 0001 y 9999, inicio no posterior al final. Ambos días son inclusivos; internamente se compara desde medianoche inicial hasta, sin incluir, medianoche posterior al final. Los timestamps actuales sin zona representan UTC (serialización ISO de Drizzle y fechas UTC del seed); se convierten los límites a UTC, sin modificar columnas ni datos existentes. No filtrar por fecha de entrada.

Las órdenes cerradas de clientes o vehículos archivados siguen participando: archivar no borra historial financiero. El acceso operativo continúa ocultando sus órdenes e hijos. Una función agregada privada comprueba identidad, sesión vigente y rol actual; limita por propietario para MECHANIC y permite total global para GOD, sin devolver registros ni aceptar un propietario como parámetro. Todas las categorías de ítems contribuyen, las recomendaciones no. No se redondea en la API; la pantalla muestra `$` y dos decimales sin conversiones. Los filtros rápidos usan el calendario de Buenos Aires aunque el navegador esté en otra zona; carga/error muestran un guion hasta disponer de un total válido.

### Presupuesto PDF

Usuario autenticado → completa nombre del cliente, nombre/patente del vehículo, fecha e ítems → API valida y genera PDF → navegador descarga el archivo para compartirlo manualmente. Solo usa los datos del formulario y calcula los importes; no requiere IDs de cliente, vehículo ni orden.

Implementado localmente en el paso 7: generación en memoria con plantilla `classic`, A4, paginación y encabezados repetidos. Validación estricta compartida entre formulario y API: 1–100 ítems, cantidad entre 1 y 1.000.000 con hasta tres decimales, precio entre 0 y 1.000.000.000 con hasta dos; redondeo de cada renglón a centavos antes de sumar y total seguro. Textos Latin-1 imprimibles (incluye tildes y ñ), sin saltos de línea; cliente/vehículo hasta 120 caracteres, patente hasta 30 y descripción hasta 300. Fecha de calendario real. Se rechazan campos desconocidos y cuerpo mayor que 256 KiB. El endpoint usa la autenticación existente también para GOD, responde `no-store` y expone `Content-Disposition` mediante CORS. El navegador valida antes del request y verifica el tipo PDF antes de descargar. Respuesta binaria PDF con nombre de descarga. No almacenar PDFs en base ni Storage, enviarlos por correo ni vincularlos a órdenes. El borrador que hoy guarda el frontend en localStorage no equivale a persistencia del presupuesto en servidor.

## 5. Autenticación y autorización

- Login del frontend mediante Supabase SSR; `/login` del backend también permite obtener una sesión. Ambos apuntan al mismo proyecto.
- API privada con Bearer explícito. CORS no sustituye autorización; no usar cookies entre orígenes como credencial de API.
- Middleware verifica token con Auth, identidad, `session_id` activo y rol actual del perfil. La aplicación limita tokens a 900 segundos desde `iat` o a su expiración si ocurre antes. No autorizar con `user_metadata` ni roles obsoletos del token.
- Todas las llamadas del frontend a la API Edge pasan por el transporte común, que impone `x-region: us-west-2` (Oregon) en cada método, conservando Bearer, headers de contenido y cuerpo. Las llamadas directas a Supabase Auth mantienen el SDK de autenticación.
- El transporte frontend renueva 30 segundos antes del límite de 900 segundos, comparte la renovación entre pedidos simultáneos del mismo contexto y notifica 401 sin reintentar escrituras. Conserva el Accept de cada módulo, incluido PDF, y omite cookies en requests privados. Finanzas y PDF ya tienen endpoints implementados localmente.
- Logout del frontend llama POST `/logout` con Bearer y después limpia tokens/cookies mediante el SDK con alcance local. Un error 429/503 conserva el estado de error y permite reintentar. Logout revoca solo la sesión actual; los controles de sesión la rechazan en requests posteriores. Otras sesiones permanecen activas.
- Repositories usan `withUserDatabase`: transacción, claims locales, rol authenticated y sesión vigente. RLS controla propiedad heredada; no debe haber fuga de identidad entre conexiones del pool.
- Sin acceso anónimo a tablas de aplicación. No exponer contraseñas, tokens ni claves privilegiadas en respuestas de dominio o logs. Auth devuelve los tokens necesarios de su contrato y usa `Cache-Control: no-store`.
- Recurso ajeno e inexistente deben ser indistinguibles en consultas individuales (404). GOD no evita validaciones ni puede cambiar propietarios.

## 6. Endpoints y estado

Métodos/rutas relativos a la base `/functions/v1/api`. Las filas pendientes reflejan los clientes HTTP existentes y el plan; **todavía no son endpoints disponibles**. Los detalles de cuerpos y errores implementados se consultan en OpenAPI; no duplicar aquí todas sus propiedades.

| Método y ruta                                       | Acceso          | Entrada / salida principal                               | Estado                               |
| --------------------------------------------------- | --------------- | -------------------------------------------------------- | ------------------------------------ |
| GET `/ping`                                         | Público         | `{ pong: true }`.                                        | Implementado.                        |
| POST `/login`                                       | Público         | Email/password → usuario y sesión; límite 8 KB.          | Implementado.                        |
| GET `/auth/me`                                      | Bearer          | Usuario actual: id, email y rol.                         | Implementado.                        |
| POST `/logout`                                      | Bearer          | Revocar sesión actual → 204.                             | Implementado.                        |
| GET `/customers`                                    | Propietario/GOD | Paginación y `includeArchived` → `{ data, meta }`.       | Implementado; revisar archivo.       |
| GET `/customers/:customerId`                        | Propietario/GOD | ID → cliente o 404.                                      | Implementado.                        |
| POST `/customers`                                   | Propietario/GOD | Datos y propietario válido → cliente, 201.               | Implementado; propietario MECHANIC.  |
| PATCH `/customers/:customerId`                      | Propietario/GOD | Parcial no vacío, incluido `isActive` → cliente.         | Implementado; propietario inmutable. |
| DELETE `/customers/:customerId`                     | Propietario/GOD | Sin dependencias → 204; con vehículos → 409.             | Implementado.                        |
| GET `/vehicles`                                     | Propietario/GOD | Paginación/filtros → vehículos de clientes operativos.   | Implementado localmente.             |
| GET `/vehicles/:vehicleId`                          | Propietario/GOD | ID → vehículo accesible.                                 | Implementado localmente.             |
| POST `/vehicles`                                    | Propietario/GOD | Cliente activo y datos → vehículo, 201.                  | Implementado localmente.             |
| PUT `/vehicles/:vehicleId`                          | Propietario/GOD | Datos del vehículo, sin reasignarlo → vehículo.          | Implementado localmente.             |
| PATCH `/vehicles/:vehicleId/archive`                | Propietario/GOD | `isActive` → vehículo.                                   | Implementado localmente.             |
| DELETE `/vehicles/:vehicleId`                       | Propietario/GOD | Sin órdenes → 204; con órdenes → 409.                    | Implementado localmente.             |
| GET `/vehicles/:vehicleId/work-orders`              | Propietario/GOD | Paginación y filtro de cierre → órdenes de ese vehículo. | Implementado localmente.             |
| POST `/work-orders`                                 | Propietario/GOD | Vehículo y datos de entrada/hijos → orden abierta, 201.  | Implementado localmente.             |
| GET `/work-orders/:workOrderId`                     | Propietario/GOD | ID → orden con ítems/recomendaciones.                    | Implementado localmente.             |
| PUT `/vehicles/:vehicleId/work-orders/:workOrderId` | Propietario/GOD | Editar orden e hijos sin reasignarla.                    | Implementado localmente.             |
| DELETE `/work-orders/:workOrderId`                  | Propietario/GOD | Eliminar orden e hijos → 204.                            | Implementado localmente.             |
| GET `/finances`                                     | Propietario/GOD | `startDate`, `endDate` por salida → `{ total }`.         | Implementado localmente.             |
| POST `/budgets/pdf`                                 | Bearer          | Datos independientes del formulario → PDF descargable.   | Implementado localmente (paso 7).    |

El frontend de clientes usa el PATCH general con `isActive` para archivo/restauración y el mismo endpoint para edición de datos, sin permitir editar propietario. No se requiere búsqueda por patente mediante un endpoint nuevo para cumplir el alcance actual.

## 7. Validación, paginación y errores

Validación estricta en schemas: rechazar claves no declaradas; validar body, params y query, incluidos IDs positivos, fechas coherentes, números finitos y límites. No aceptar parentescos o campos generados editables por conveniencia del formulario.

Clientes usa `page=1`, `pageSize=10`, máximo 100; rechaza parámetros desconocidos/repetidos y offsets inseguros. Orden por ID; página fuera de rango devuelve lista vacía. Conteo y filas comparten alcance y snapshot. Adoptar esa envoltura para los listados pendientes y documentar sus filtros antes de implementarlos.

Formato de error implementado: `{ error: string }`. El contrato compartido `ApiErrorResponse` y el lector de errores del frontend usan este mismo formato; cuerpos inválidos conservan el mensaje de respaldo. Usar 400 para entrada inválida, 401 para sesión/token inválido, 403 para operación prohibida, 404 para inexistente/ajeno, 409 para conflictos, 413 para tamaño excesivo, 429 para límite de Auth, 503 para indisponibilidad de autenticación y 500 genérico para fallos inesperados. No filtrar detalles de registros ajenos o errores SQL.

## 8. Criterios de aceptación

- Dos MECHANIC no pueden leer ni modificar recursos del otro mediante interfaz, IDs directos o acceso de datos expuesto. GOD opera globalmente con sesión válida.
- Todo cliente tiene propietario MECHANIC y este no puede cambiarse. Vehículos y órdenes conservan sus padres.
- Cliente archivado no aparece en recorridos operativos y no admite vehículos nuevos; vehículo no operativo no admite órdenes nuevas. El servidor valida las relaciones.
- CRUD de clientes y vehículos respeta validación, unicidad por mecánico y restricciones al borrar padres.
- La orden nace abierta, puede cerrarse/reabrirse y editarse; borrar elimina sus hijos sin afectar otras órdenes.
- Recomendaciones opcionales conservan descripción, motivo, estado y prioridad entre formulario, API y base.
- Finanzas suma solo ítems de órdenes cerradas por fecha de salida y alcance autorizado, sin duplicaciones por joins con recomendaciones.
- PDF se genera con datos del formulario y se descarga sin crear registros persistentes.
- Los módulos de frontend envían Bearer, manejan sesión expirada y muestran estados de carga/error/vacío sin afirmar éxito ante fallos.
- Contratos, documentación y unitarios reflejan las reglas. Una prueba escrita no se declara ejecutada ni una funcionalidad probada por existir su pantalla.

## 9. Fuera de alcance y precisiones pendientes

Fuera de alcance: datos reales, talleres compartidos, nuevos roles, transferencias de propiedad, registro público, administración de cuentas en UI, contabilidad/pagos/impuestos/divisas, archivos PDF persistidos, envío automático de documentos, aceptación firmada, `isActive` de órdenes y endpoint global de listado de órdenes.

Precisiones para cerrar al implementar el módulo correspondiente, sin impedir esta reorganización documental:

- Representación numérica consistente: preservar el modelo actual de precio entero o acordar soporte decimal, sin introducir conversiones de moneda. No cambiar tablas sin necesidad.

El punto pendiente está registrado en TODO paso 4; finanzas conserva el precio entero y admite cantidades fraccionarias sin cambiar las tablas.

## Estado del incremento de propiedad — 17/10/2026

Alta: MECHANIC usa su identidad por defecto; GOD debe enviar `mechanicId` de un MECHANIC existente (403 si falta o no corresponde). PATCH rechaza `mechanicId` como campo no declarado (400), incluso si repite el propietario. El repository comprueba el rol dentro de la transacción de alta.

El schema de demo incorpora propietario MECHANIC mediante FK compuesta con discriminador generado, que impide promociones de propietarios incluso concurrentes; triggers impiden cambiar propietario de cliente y padres de vehículo/orden. Se conserva el índice privado de patentes normalizadas y su restricción única. Los perfiles son de solo lectura para authenticated, incluido GOD; altas/roles quedan en seed/SQL administrativo. Estos cambios SQL están en archivos, sin aplicar ni verificar en una base viva.

## Estado del incremento de clientes y archivo — 17/10/2026

El detalle permite editar datos y restaurar un cliente archivado con confirmación. El formulario de alta y edición se comparte; errores del módulo de vehículos no impiden administrar al cliente. El detalle archivado no ofrece recorrido a vehículos. La búsqueda de clientes y la selección para alta de vehículo recorren todas las páginas; esta última solicita solo activos y valida que el ID seleccionado pertenezca a las opciones cargadas.

En el schema local, vehículos exige cliente activo en USING y WITH CHECK. Un vehículo archivado sigue visible para su administración mientras el cliente esté activo; sus órdenes e hijos quedan inaccesibles. Órdenes exige vehículo y cliente activos para lectura/escritura; ítems y recomendaciones heredan esa condición mediante RLS de la orden. GOD respeta las mismas condiciones. Primero se restaura cliente y luego, si corresponde, vehículo; restaurar cliente no restaura vehículos ni modifica órdenes. El detalle y PATCH de cliente siguen admitiendo archivados para administración autorizada.

Estos controles SQL cubren Data API y la frontera transaccional autenticada del backend cuando se aplique el schema. El paso 3 agrega endpoints y validaciones de service de vehículos; órdenes sigue pendiente del paso 4. Las pruebas de políticas son estáticas y no verifican comportamiento real ni concurrencia. El despliegue y sus datos no cambiaron. El tratamiento financiero de historial archivado sigue pendiente del paso de finanzas.

## Estado del incremento de vehículos — 17/10/2026

Implementados localmente GET/POST de vehículos, GET/PUT/DELETE por ID y PATCH de archivo/restauración. Listado ordenado por ID, misma paginación que clientes y filtros `includeArchived` y `customerId`; conteo y filas comparten transacción y alcance. Incluso con `includeArchived`, el cliente debe estar activo. Detalle/edición/archivo/restauración/eliminación admiten vehículo archivado solo bajo cliente activo. Recurso inexistente, ajeno o bajo padre archivado devuelve 404; alta con padre inaccesible también devuelve 404.

PUT reemplaza patente, marca, modelo y unidad; año/kilometraje omitidos se normalizan a null. `customerId` y `isActive` se rechazan en PUT; el estado se modifica exclusivamente mediante PATCH de archivo. Patente sin espacios extremos y en mayúsculas, marca/modelo no vacíos, año entero >= 1886, kilometraje entero >= 0; números dentro del rango integer de Postgres. La unicidad por mecánico y la restricción al eliminar con órdenes usan las garantías SQL existentes y responden 409 ante sus conflictos.

Frontend con Bearer, cliente fijo al editar, restauración confirmada, búsqueda completa de vehículos y consulta directa del cliente asociado. Errores del historial pendiente de órdenes quedan en su panel y no bloquean edición/archivo. No se carga historial ni se ofrece nueva orden desde un vehículo archivado. No se implementan endpoints de órdenes en este incremento. Verificaciones aisladas en TESTING; sin aplicar ni verificar cambios en Supabase.

## Estado del incremento de finanzas — 17/10/2026

Implementado localmente GET `/finances` protegido, schema estricto de query, controller/service/repository/mapper y contrato OpenAPI. La función `private.finance_total(date, date)` devuelve únicamente un agregado, con búsqueda de objetos fijada, permisos revocados por defecto y ejecución concedida a authenticated. Comprueba sesión y alcance por rol/propietario sin depender del filtro operativo de archivo. La consulta no une recomendaciones y devuelve cero para conjuntos vacíos. No hay caché de totales.

El frontend conserva Bearer y manejo de sesión expirada; explica período y archivo, calcula filtros rápidos en Buenos Aires y evita presentar cero como resultado de una carga o error. El schema SQL solo se editó en el repositorio: aplicar función/permisos al proyecto elegido sigue pendiente del paso 9. Los unitarios y comprobaciones estáticas no prueban ejecución PostgreSQL, RLS real ni recorridos contra API; órdenes sigue pendiente del paso 4. Resultados en TESTING.

## Cierre de demo del paso 9 — 17/10/2026

El seed conserva dos propietarios MECHANIC y GOD sin clientes. Crea todos los árboles antes de archivar a Oliver Queen y Jean Grey (un cliente por mecánico); sus vehículos mantienen `isActive=true`. Archiva por separado Kimoyo Cruiser bajo T'Challa activo, después de crear sus órdenes e hijos. Así la demo distingue los dos niveles de archivo y conserva historial de órdenes abiertas/cerradas para finanzas. Se mantienen los 20 clientes, 19 vehículos, 48 órdenes, 143 ítems y 47 recomendaciones; los precios siguen siendo enteros. Las credenciales y sesiones demo se restablecen al ejecutar el seed.

El schema se aplicó a `lsbgegbghlgxkqxpmgyx`, se ejecutó este seed y se publicó la API versión 7; las tres integraciones existentes aprobaron. La evidencia y sus límites se registran en [el cierre de Supabase](docs/supabase-closure-2026-10-17.md); los registros de incrementos anteriores describen su verificación histórica. Órdenes HTTP sigue pendiente del paso 4; este cierre no implementa ese módulo.

## Órdenes — implementación local del 17/10/2026

Completado el paso 3 de STEPBYSTEP (paso 4 de TODO). Los cinco endpoints de órdenes usan Bearer y la frontera autenticada existente, con padres activos y alcance MECHANIC/GOD tanto en service como en consulta. POST exige problema reportado y entrada ISO con zona; rechaza salida y campos no declarados. PUT exige salida nullable, permite editar cerradas y reabrir, rechaza vehicleId y comprueba coincidencia con ruta. Orden e hijos se crean/reemplazan en una transacción; los hijos reemplazados reciben nuevos IDs. Eliminar conserva las FK cascade existentes. Recomendaciones convierten estados explícitamente y nunca generan ítems. Cantidad finita positiva representable en real, precio entero entre 0 y 2147483647; no cambia el modelo ni el schema SQL. Arrays de ítems vacíos son válidos en API porque el modelo no exige al menos uno; la interfaz conserva su requisito de un ítem.

GET por vehículo pagina con orden estable de ID y `withEndDate=false` para abiertas (predeterminado), `true` para cerradas; no hay GET global. La vista compuesta recorre todas las páginas de vehículos y órdenes. Alta y detalle consultan directamente el cliente asociado; el alta ya no ofrece salida y exige problema. Edición preserva reason de recomendaciones y timestamps sin cambios; los días modificados se convierten desde medianoche de Buenos Aires. El historial del vehículo conserva paginación y filtros de cierre.

Esta entrega es local: unitarios/dobles y compilación no demuestran RLS, rollback PostgreSQL real ni recorrido de navegador contra API. El cierre remoto histórico v7 precede estos endpoints y debe repetirse con autorización específica según TODO paso 9. Las notas anteriores conservan el estado histórico de cada incremento.

### Cierre local de recorridos — 17/10/2026

Listados de clientes, vehículos y órdenes: al cambiar filtros o paginación solo la carga vigente puede actualizar datos, error y estado de carga. Un fallo limpia las filas y no se presenta como lista vacía exitosa. Detalles de cliente, vehículo y orden, historial paginado del vehículo y contexto de nuevas altas descartan respuestas obsoletas y cargas encoladas de efectos cancelados. Se conserva la autorización del servidor, transporte Bearer, paginación completa y validación independiente del PDF. Revisión estática y unitarios aislados en TESTING; no acredita un recorrido visual conectado ni modifica contratos HTTP.

### Segundo cierre remoto — 17/10/2026

Publicada API v8 en la demo `lsbgegbghlgxkqxpmgyx`, incluidos los endpoints de órdenes del incremento local y la API vigente de finanzas/PDF. Seed regenerado sin cambios de fixtures ni aplicación de DDL: se conserva el schema compatible de v7. La publicación no acredita por sí sola cada flujo HTTP ni un recorrido visual; alcance de integraciones y resultados en TESTING y [el segundo informe](docs/supabase-closure-repeat-2026-10-17.md). Las notas previas de v7 son históricas; frontend sin desplegar.

### Rendimiento de lecturas y CORS

El permiso CORS de preflight OPTIONS puede reutilizarse 600 segundos. Esto no almacena respuestas de datos ni evita la autenticación y autorización de las requests reales. El detalle de vehículo obtiene vehículo y cliente en una sola transacción autorizada; el detalle de orden obtiene orden, padres e hijos dentro de la misma transacción. Los servicios validan actividad/propiedad sobre ese snapshot, sin reconsultar los padres. Vehículos archivados continúan visibles para restauración bajo cliente activo; órdenes requieren ambos padres activos, incluso para GOD. Contratos de respuesta sin cambios; los mappers no exponen los padres internos.

### Salida PDF de diagnóstico solicitada — 17/10/2026

POST `/budgets/pdf` conserva autenticación, validación del formulario y headers de descarga, pero devuelve temporalmente una única hoja blanca A4 con el texto `hola mundo`. Los datos del formulario no se imprimen. Esta salida reemplaza la plantilla detallada del paso 7 durante el diagnóstico; no persiste archivos. El frontend conserva la ruta `/budgets/pdf` sobre `NEXT_PUBLIC_API_URL`.

Compatibilidad Edge del PDF: el controller importa `Buffer` desde `node:buffer` para enviar el archivo binario sin depender de globals de Node. Corrección publicada en API v11; no cambia validación, permisos ni contrato HTTP.

### Presupuesto Racing — 18/10/2026

La salida de diagnóstico `hola mundo` queda reemplazada por el diseño aportado en CarDoc_Racing_HTML_CSS, adaptado como PDF nativo A4: fondo oscuro, foto de automovilismo, marca CarDoc y acentos rojos, cliente/dominio/vehículo/fecha, tabla y resumen. Se conservan el identificador `classic`, la validación compartida, autenticación y descarga binaria. Las filas muestran cantidad, precio unitario e importe; subtotal y total son la suma redondeada de los renglones, sin IVA ni conceptos adicionales. Nombres y descripciones se ajustan en líneas; importes extensos ajustan tamaño para respetar su columna. Paginación sin dividir filas, encabezados repetidos y total en la última página.

HTML/CSS/imagen originales conservados en `docs/templates/cardoc-racing`; el servicio reproduce su composición mediante pdf-lib y fuentes estándar Helvetica, sin ejecutar Chromium ni el JavaScript de ejemplo. Imagen integrada al bundle mediante base64; sin filesystem, recursos externos ni servicios de renderizado durante el request. Los gradientes y detalles CSS se adaptan a formas y colores PDF, por lo que no se promete reproducción píxel a píxel del HTML.
