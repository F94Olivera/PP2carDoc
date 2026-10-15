# Pruebas y verificación

## Política obligatoria

Las pruebas nuevas son unitarias por defecto: sin Supabase real, APIs externas ni base viva. Usar entradas aisladas y dobles de Auth/repositories. Un pedido genérico de correr tests o verificar cambios autoriza **solo unitarios**.

Conservar las tres integraciones en `apps/back/tests/integration`. **No ejecutarlas salvo pedido explícito del usuario**, ni en local ni en remoto. No incluirlas en agregados, hooks, CI, despliegues o verificación habitual; tampoco reemplazarlas por requests o SQL manuales equivalentes. Protege el rate limit de Supabase.

Antes de crear una nueva integración, decir: "mira que conviene sumar el test como integracion tambien", explicar cobertura concreta y costo de servicios externos, y esperar aprobación. Aprobar creación no autoriza ejecución. Modificar documentación de un escenario tampoco autoriza probarlo contra un servicio.

## Unitarios existentes y comandos

Desde la raíz:

```bash
pnpm test
# Equivalente explícito:
pnpm test:unit
# Solo workspace backend:
pnpm --filter @cardoc/back test:unit
```

Ejecutar una alternativa, no las tres para repetir el mismo resultado. Todos apuntan actualmente a `tsx --test tests/*.test.ts` del backend y excluyen el directorio de integración.

`apps/back/tests/authorization.test.ts` contiene ocho casos: parseo de identidad ya verificada, límite de 15 minutos, identidad distinta, tokens viejos/futuros, claims de sesión/rol inválidos, metadata no confiable, elección de propietario/schemas estrictos y clasificación de sesión revocada. Algunos temas comparten caso. No prueban firmas JWT reales, HTTP completo, RLS ni transacciones reales.

Los schemas ya separan alta de edición y rechazan mechanicId en PATCH. customer-service.test.ts usa dobles de persistencia para alta propia, asignación por GOD y propietarios rechazados, sin inicializar la base.

## Comprobaciones de código

Según el alcance, ejecutar formato enfocado, lint, TypeScript y unitarios. Antes de un commit completar además build y diff-check; no crear el commit si falla un check configurado.

```bash
pnpm exec prettier <archivos-modificados> --check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
git diff --check
```

`<archivos-modificados>` es un marcador, no un argumento literal. `pnpm build` construye todos los workspaces configurados; no es una prueba funcional. Para cambios exclusivamente Markdown, comprobar formato, enlaces locales y diff; no iniciar servicios ni ejecutar tests/build sin una razón adicional. No se requiere commit para revisar cambios locales.

## Escenarios que deben cubrirse

Esta matriz es un plan, **no evidencia de ejecución**. Salvo inventario explícito anterior, la cobertura queda pendiente. Las reglas completas están en REQUIREMENTS.

| Área            | Éxito                                                                               | Validación, permisos y errores                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth            | Login, identidad, renovación y logout de la sesión actual.                          | Credenciales incorrectas, token ausente/alterado/vencido, sesión revocada, metadata maliciosa, rol obsoleto, 429/503.                              |
| Propiedad       | MECHANIC opera lo propio; GOD opera globalmente y crea para MECHANIC.               | Recurso ajeno devuelve 404; rechazar propietario GOD, inexistente o transferencia incluso como GOD; impedir reasignar padres.                      |
| Clientes        | Alta, detalle, edición, listado paginado, archivo/restauración y borrado sin hijos. | Claves extra, campos generados, nombre vacío, ID inválido, documento duplicado por mecánico, conflicto al borrar con vehículos.                    |
| Archivo         | Ocultar clientes y vehículos no operativos; administración explícita autorizada.    | Alta de vehículo bajo cliente archivado y alta de orden bajo padre no operativo bloqueadas aunque se envíen IDs directos.                          |
| Vehículos       | CRUD y patente única por mecánico.                                                  | Colisión normalizada dentro del mismo mecánico; permitir la misma patente entre mecánicos; año/kilometraje/unidad inválidos y borrado con órdenes. |
| Órdenes         | Crear abierta, editar abierta/cerrada, cerrar y reabrir; listar por vehículo.       | Falta entrada/problema, salida anterior, intento de crear cerrada, padre ajeno/inactivo, IDs inconsistentes, cambio de vehículo, paginación.       |
| Hijos de orden  | Guardado atómico y cascada al eliminar.                                             | Fallo intermedio no deja escrituras parciales; ítems con cantidad/precio inválidos; no afectar otras órdenes.                                      |
| Recomendaciones | Ausentes o múltiples, estados y prioridad preservados.                              | Mapear mayúsculas/minúsculas; rechazar enums inválidos; aceptar no crea ítems.                                                                     |
| Finanzas        | Suma por salida de cerradas, alcance MECHANIC/GOD, total cero.                      | Excluir abiertas; límites del período; no duplicar por recomendaciones; editar/reabrir/eliminar cambia total; resolver historial archivado.        |
| PDF             | Generación y descarga desde formulario independiente.                               | Datos inválidos, ausencia de sesión, error al generar, headers de descarga y archivo legible; no crear persistencia.                               |
| Frontend        | Recorridos, carga, vacío, errores y sesión expirada.                                | Bearer en cada módulo; archivo usa ruta existente; no truncar datos por leer solo primera página; no confirmar éxito ante fallo.                   |

Para unitarios de persistencia usar dobles y probar coordinación/reglas. No afirmar que esos dobles verifican RLS o cascadas de Postgres. Si hace falta verificar esas garantías en integración, aplica la aprobación previa de esta política.

## Integraciones existentes — solo por solicitud explícita

Requieren API, Auth y base del mismo proyecto de demo. Configurar en `.env` raíz las credenciales ficticias apropiadas; no imprimir contraseñas ni tokens. No ejecutar schema ni seed automáticamente como preparación de tests.

| Comando desde raíz                              | Archivo                                     | Cobertura y efectos                                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @cardoc/back test:auth`          | `tests/integration/smoke-auth.mjs`          | Salud, CORS, JSON/límites, login real, identidad y rechazo tras logout. Abre y revoca su sesión.                                                                                                     |
| `pnpm --filter @cardoc/back test:customers`     | `tests/integration/smoke-customers.mjs`     | Lista/detalle, paginación, archivo, autorización y timestamps contra expectativas de base; lecturas y sesión de prueba.                                                                              |
| `pnpm --filter @cardoc/back test:authorization` | `tests/integration/smoke-authorization.mjs` | Tres cuentas demo contra API, Auth, Data API y SQL restringido; CRUD, RLS heredada, concurrencia, roles, tokens y logout. Escribe fixtures temporalmente, restaura roles/metadata y revoca sesiones. |

Los dos primeros usan `TEST_LOGIN_EMAIL` y `TEST_LOGIN_PASSWORD`; `TEST_API_URL` permite seleccionar la API. La suite multiusuario usa las cuentas del seed y `SEED_DEMO_PASSWORD`. Los scripts cargan `../../.env` desde el workspace backend.

La suite de autorización fue alineada para rechazar transferencias, reasignaciones por GOD, propietarios inválidos y cambios de rol por Data API; conserva cambios administrativos de rol solo sobre GOD sin clientes. No fue ejecutada tras estos cambios. No sumar un comando agregado que ejecute las tres.

## Resultados y límites

| Fecha      | Revisión                                                                       | Resultado / límite                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17/10/2026 | Lectura de código, contratos, modelos, scripts y Markdown para reorganización. | Se identificaron diferencias en propiedad, archivo, transporte Bearer, contratos de órdenes/recomendaciones y rutas. Registradas en TODO. Sin cambios de código ni servicios externos.                      |
| 17/10/2026 | Verificación documental de esta reorganización.                                | Formato Prettier correcto en los siete Markdown editados/creados; 21 enlaces locales con destino existente; `git diff --check` sin errores. Diff limitado a Markdown (incluida la eliminación de FLOWS.MD). |
| 17/10/2026 | Diagnóstico histórico de performance.                                          | Ver informe en docs; muestras y límites propios. No demuestra conformidad con las reglas nuevas ni el estado del despliegue actual.                                                                         |

En la reorganización documental no se ejecutaron unitarios, integraciones, build, seed ni schema. En la preparación posterior del commit se ejecutaron y aprobaron formato enfocado, `pnpm lint`, `pnpm typecheck`, `pnpm build` y `git diff --check`; no se ejecutaron unitarios ni integraciones. Tampoco se verificó el despliegue remoto. Registrar futuras ejecuciones con fecha, comando, resultado, alcance y restricciones; no transformar escenarios planeados en resultados aprobados.

### 17/10/2026 — TODO paso 1: propiedad y autorización

`pnpm test:unit`: 11/11 aprobados (ocho casos existentes actualizados y tres nuevos con doble de persistencia). `pnpm lint`, `pnpm typecheck` y `pnpm build`: aprobados. Formato enfocado y `git diff --check`: aprobados. La suite de integración existente fue modificada, sin ejecutarla.

Revisión estática de schema y seed; no se ejecutaron SQL, seed, API, Auth ni base de datos. La FK compuesta y triggers deben comprobarse en integración autorizada antes de afirmar garantías reales de RLS/concurrencia. No hubo despliegue ni commit. Guía de alineación de datos en [docs/demo-ownership-alignment.md](docs/demo-ownership-alignment.md).

### 17/10/2026 — TODO paso 2: clientes y archivo

`pnpm test:unit`: 18/18 comprobaciones aprobadas. Los 11 casos anteriores se mantienen; se agregaron dos unitarios de service con persistencia doble, tres de API frontend con transporte doble y dos regresiones estáticas del schema. El test del frontend se empaqueta en memoria con esbuild ya disponible; reemplaza el transporte antes de cargar el módulo, sin inicializar Auth ni realizar requests.

Cobertura nueva: PATCH de archivo/restauración y edición general con payload esperado; propagación de errores; recorrido de todas las páginas de clientes/vehículos, incluido fallo de página posterior; detalle administrativo archivado y resultado de recurso inaccesible; actualización explícita de isActive. Las comprobaciones del SQL revisan USING/WITH CHECK con cliente activo, ambos padres activos para órdenes e herencia en ítems/recomendaciones; no ejecutan SQL ni demuestran RLS real, aislamiento o concurrencia.

`pnpm lint`, `pnpm typecheck`, `pnpm build`, formato enfocado y `git diff --check`: aprobados. La compilación incluye la nueva ruta de edición de cliente. No se ejecutaron integraciones, API, Auth, SQL, seed ni despliegue, ni se verificó el recorrido con navegador conectado. Los endpoints de vehículos/órdenes todavía están pendientes; el detalle de cliente muestra su error de carga separado sin perder los datos del cliente. La validación funcional de RLS y de esos endpoints se conserva para una ejecución posterior explícitamente autorizada.

## 17/10/2026 — TODO paso 3: vehículos

Implementación local verificada con `pnpm test:unit`: **31/31 aprobados**, incluidos 13 casos nuevos de vehículos. Cubren schemas estrictos e inmutabilidad de customerId, normalización de patente, límites de año/kilometraje/unidad, consultas paginadas, rechazos de controllers, permisos de MECHANIC/GOD, padres archivados/ajenos/inexistentes, alta/edición/archivo/restauración/eliminación con dobles, campos opcionales limpiados por PUT, mapeo de fechas, respuestas 409 sanitizadas y propagación de conflictos. El frontend usa transporte doble para verificar PUT/PATCH/DELETE autenticados, recorrido de páginas posteriores, errores 409 y sesión expirada sin éxito parcial.

`vehicle-repository.test.ts` compila las consultas reales de Drizzle usando pg-proxy con callback local y reemplaza withUserDatabase antes de cargar el repository. Verifica filtros de propietario y cliente activo en conteo/filas/detalle/escrituras, filtros de vehículo activo y cliente solicitado, orden/offset/límite, selección de la frontera transaccional y bloqueo del padre al crear. No abre conexiones ni ejecuta SQL. Sus resultados no prueban comportamiento del motor, aislamiento real, triggers, RLS ni unicidad concurrente. El 409 por patente/FK se verifica mediante errores simulados; se reutilizan las restricciones SQL existentes.

`pnpm lint`, `pnpm typecheck`, `pnpm build`, formato enfocado, referencias internas de OpenAPI, enlaces locales de Markdown modificado y `git diff --check`: aprobados. Build de tipos, bundle Edge y frontend completado. Sin dependencias nuevas. No se ejecutaron integraciones, Auth/API/base real, schema, seed ni deploy, ni un recorrido de navegador conectado. El usuario autorizó en esta conversación integraciones fundamentadas; no se necesitaron para estos controles aislados. El despliegue y la aplicación del schema de los incrementos previos siguen fuera de esta ejecución, por lo que no se atribuye al entorno remoto el resultado local.

La UI mantiene administración de vehículo disponible aunque falle su historial de órdenes. La implementación de ese endpoint y la validación operativa de alta de órdenes quedan en TODO paso 4. La comprobación real de RLS y patentes bajo concurrencia queda pendiente de un entorno alineado con el schema y la API locales.

## 17/10/2026 — TODO paso 5: transporte y contratos compartidos

Verificación local: `pnpm test:unit` **39/39 aprobados**, incluidos ocho casos nuevos en `apps/back/tests/auth-client.test.ts`. El bundle de los módulos frontend reales usa dobles de Auth y fetch: no carga el cliente real ni hace requests externos. Cubre Bearer, omisión de cookies, no-store, conservación de Accept PDF/cuerpo/headers, renovación compartida antes de 900 segundos, iat inválido/futuro, sesión ausente/revocada, recuperación tras fallo de renovación, 401 sin repetir escrituras, errores `{ error: string }` y fallback, logout 204/401 frente a 429/503, consultas de finanzas y respuesta binaria/errores de PDF. El PDF usado es una respuesta ficticia; no se probó generación ni legibilidad.

Pasaron formato enfocado, `pnpm lint`, `pnpm typecheck`, `pnpm build` y `git diff --check`. Revisión de enlaces locales de los Markdown modificados sin destinos faltantes. El build verifica compilación, no un recorrido real del navegador ni revocación/renovación reales. Se consultó documentación pública de Supabase sobre [signOut](https://supabase.com/docs/reference/javascript/auth-signout) y [refreshSession](https://supabase.com/docs/reference/javascript/auth-refreshsession), y la implementación instalada del SDK para limpiar una sesión ya revocada.

Sin schema, seed, integraciones, llamadas manuales a Auth/API/base ni deploy. Los endpoints de finanzas/PDF siguen pendientes; esta entrega completa su transporte frontend. El cierre remoto ya está contemplado en TODO paso 9.

## 17/10/2026 — TODO paso 6: finanzas

Implementado GET `/finances` con validación estricta del período, capas controller/service/repository/mapper y agregado `private.finance_total(date, date)` en el schema local. Se conserva el historial financiero de padres archivados sin modificar las políticas operativas. El intervalo usa días completos de Buenos Aires convertidos a los timestamps UTC actuales. La función verifica sesión y rol/propietario, suma todas las categorías de ítems, no une recomendaciones y devuelve cero sin coincidencias. Frontend con Bearer, filtros rápidos en Buenos Aires, explicación del alcance y guion durante carga/error.

Verificación ejecutada desde la raíz:

- `pnpm --filter @cardoc/back exec tsx --test tests/finance.test.ts`: 7/7 unitarios nuevos aprobados.
- `pnpm test:unit`: 46/46 aprobados, sin integraciones.
- `pnpm lint`: aprobado en los workspaces configurados.
- `pnpm typecheck`: aprobado en los tres workspaces tras corregir el tipo del doble de fechas del frontend para respetar el rootDir del backend.
- `pnpm build`: aprobados contratos, bundle Edge y build Next.js.
- Prettier enfocado sobre los archivos modificados: aprobado. SQL no tiene formateador configurado.
- Referencias locales de OpenAPI: 41 resueltas; enlaces locales de los cinco Markdown principales resueltos.
- `git diff --check`: aprobado.

Los siete casos nuevos cubren fechas reales, bisiestos, rango invertido, parámetros ausentes/desconocidos/repetidos; conversión y rechazo de totales corruptos; consulta nueva en cada llamada sin caché y propagación de errores; SQL parametrizado dentro de la frontera autenticada de solo lectura para ambos roles; controller 400/200; comprobaciones estáticas del agregado, permisos, filtros, archivo y ausencia de recomendaciones; límites de medianoche de Buenos Aires y filtros rápidos. Se comprueba además que el modelo Drizzle serializa un instante con offset como ISO UTC. El unitario existente de transporte cubre Bearer, total cero, errores y sesión expirada de finanzas.

Límites: los resultados variables del service son dobles, no ediciones/reaperturas/eliminaciones reales de órdenes. Las comprobaciones del agregado SQL son estáticas, no ejecutan PostgreSQL ni prueban sumas, aislamiento RLS, permisos o conversiones temporales en una base viva. No se verificó el recorrido visual contra API ni se aplicó schema, seed o deploy; no se crearon ni ejecutaron integraciones. El CRUD de órdenes continúa pendiente del paso 4. La función privada y sus permisos deben aplicarse antes del deploy de esta API; el cierre de estas operaciones ya está en TODO paso 9.

## Paso 7 de TODO: presupuesto PDF — 17/10/2026

Implementado POST `/budgets/pdf` detrás de `requireAuth`, con schema estricto compartido frontend/backend, respuesta `application/pdf`, nombre por fecha, `no-store` y exposición de `Content-Disposition` en CORS. Generador `pdf-lib@1.17.1` en memoria, sin filesystem ni requests en el servicio; bundle Edge con dependencia npm fijada. La compatibilidad de la biblioteca con Deno está documentada en [el ejemplo oficial de Deno](https://docs.deno.com/examples/generate_pdf/); no se ejecutó el worker de Supabase.

Verificación local: `pnpm test:unit` **51/51 aprobados**. Cuatro casos nuevos en `budget.test.ts` cubren rechazo de campos desconocidos, fechas inválidas, límites, NaN/infinito, precisión, caracteres no representables, redondeo de medio centavo, PDF A4 parseable, paginación de 100 ítems, controller/headers y registro protegido (comprobación estática). La comprobación de ruta no sustituye una prueba contra autenticación real. En `auth-client.test.ts` se amplió la cobertura de errores/formulario/tipo de respuesta y se agregó descarga con DOM/URL simulados, nombre de servidor/respaldo y liberación diferida del objeto URL. No se abrió un navegador real ni se verificó la descarga contra una API viva.

Se generaron localmente dos PDFs ficticios con el servicio real: 35 ítems en tres páginas (tildes, ñ, descripciones largas y total **$ 86.196,38**) y un caso extremo con nombres/patente/descripción de longitud máxima e importes grandes. Renderizados con Poppler e inspeccionados visualmente: encabezados repetidos, renglones completos, márgenes, columnas numéricas y total legibles. Extracción de texto utilizada para confirmar importes; sin fuentes ni recursos descargados durante la generación. Archivos temporales de revisión fuera del repositorio.

Checks: formato enfocado, `pnpm typecheck`, `pnpm lint`, `pnpm build` y `git diff --check`. OpenAPI y enlaces locales revisados. El build valida compilación/bundle, sin demostrar ejecución del runtime Edge desplegado.

Sin schema, seed, integraciones, llamadas a Auth/API/base ni deploy. El cierre remoto ya está reunido en TODO paso 9; este endpoint no necesita cambios de schema o fixtures.

## 17/10/2026 — TODO paso 8: calidad local

Runtime observado: Node **26.3.0**, pnpm **11.7.0**. Se agrega `.nvmrc` y engines `>=26.3.0 <27`, sin dependencias ni herramientas nuevas. Esto documenta la versión probada; no demuestra arranque de Docker, servidor de desarrollo ni ejecución Edge.

`pnpm test:unit`: **60/60 aprobados**, nueve casos nuevos en `customer-quality.test.ts` y `auth-quality.test.ts`. Clientes: controllers 400/403/404/201/204, CRUD exitoso, filtros de archivo, primera/última/página vacía, identidad propagada a persistencia, errores propagados al manejador central y mapper con fechas UTC, nulls y selección explícita de campos. Auth: mappers excluyen metadata y tokens de proveedor; controllers traducen éxito/401/429/503, validación, cache no-store, desafío Bearer y excepciones sanitizadas; services prueban login, identidad verificada simulada, rol actual frente a metadata maliciosa, perfil ausente/inválido, sesión revocada, indisponibilidad, errores de proveedor y revocación tras login rechazado. El JWT ficticio solo ejercita decodificación después del doble de verificación: no prueba firma real. Los logs Pino de indisponibilidad durante los tests son errores simulados esperados.

Los módulos se empaquetan en memoria con esbuild existente y se sustituyen repositories antes de evaluarlos. En Auth se reemplaza además la frontera de base por un doble que falla si se intenta acceder; no se inicializa Supabase ni se abren conexiones. Se mantienen las pruebas previas de vehículos, finanzas, PDF y transporte. No se agregan pruebas de órdenes aún no implementadas.

Revisión estática de efectos/transacciones registrada en TODO paso 8: riesgo de duplicación/respuestas obsoletas en Clientes/Vehículos, cleanup existente en Finanzas, transacciones separadas de perfil y operación y consultas COUNT/SELECT secuenciales. Se conserva `max: 1`; Pino/Server-Timing y volumen se evaluarán al terminar funcionalidades. No se midió rendimiento nuevo ni se modificaron flujos de aplicación, contratos HTTP, schema, seed o despliegue. El cierre remoto ya está en TODO paso 9.

Controles finales del paso 8: formato enfocado, `pnpm lint`, `pnpm typecheck`, `pnpm build` (contratos, bundle Edge y Next.js), enlaces locales de Markdown modificado y `git diff --check`: aprobados con Node 26.3.0. Sin integraciones, schema, seed, Auth/API/base real ni deploy.

## 17/10/2026 — TODO paso 9: cierre de demo autorizado

El usuario autorizó expresamente reinicio destructivo, seed, las tres integraciones y deploy. Proyecto comprobado: `lsbgegbghlgxkqxpmgyx` (carDoc, us-west-2). Inventario y copia de dominio/fuentes anteriores fuera del repositorio; schema completo ejecutado con Postgres.js/TLS, Auth conservado y seed restablecido. API versión 7 ACTIVE, publicada mediante el conector Supabase porque la CLI no tiene access token. No se cambiaron secretos remotos. Evidencia de preparación, recuperación y límites en [el informe de cierre](docs/supabase-closure-2026-10-17.md).

Controles locales ejecutados sobre el código modificado: `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` (60/60), `pnpm build` y `git diff --check`: aprobados. Se mantienen suites unitarias e integraciones separadas. No se crearon integraciones nuevas. La revisión de las tres suites existentes conserva Auth/clientes sin cambios y actualiza autorización para los fixtures archivados y restauración del padre antes de probar escrituras concurrentes.

Seed: `pnpm seed:superheroes` aprobado; consulta de assertions posterior aprobada: 20 clientes, dos archivados; 19 vehículos, uno archivado; cuatro vehículos activos bajo clientes archivados; 21 órdenes abiertas y 27 cerradas; 143 ítems, 47 recomendaciones, 19 claims de patente. Cero propietarios inválidos y cero patentes normalizadas duplicadas por mecánico.

`pnpm --filter @cardoc/back test:auth`: aprobado (salida 0), incluido logout y rechazo inmediato de sesión revocada. `pnpm --filter @cardoc/back test:customers`: aprobado (salida 0), validación HTTP, paginación, detalle y paridad con base, con logout final. `pnpm --filter @cardoc/back test:authorization`: aprobado (salida 0), incluidos aislamiento de roles/requests concurrentes, RLS en las cinco tablas, escrituras de hijos, propietario MECHANIC, padres inmutables, patentes por alcance bajo concurrencia, tokens falsificados, metadata no confiable, rol vigente frente a claim antiguo y revocación por API/Data API. Limpieza final aprobada: inventario 20/19/48/143/47 y 19 claims, dos clientes y un vehículo archivados; cero clientes AUTH-TEST, vehículos TEST/CONCURRENT y sesiones demo. GOD quedó sin clientes y cada MECHANIC con diez; authenticated no puede actualizar la columna role y no existe el trigger obsoleto customers_plates. El bundle descargado de la API versión 7 coincide exactamente con el build local.

El advisor de seguridad posterior al schema solo informó protección de contraseñas filtradas desactivada; remediación y alcance en el informe. Sin despliegue de frontend ni validación de sus recorridos visuales. Estas suites no demuestran todo el CRUD HTTP de vehículos, finanzas o PDF; tampoco órdenes HTTP todavía pendientes del paso 4. No se declara terminada la revisión final de rendimiento del paso 8.

Formato enfocado final, 24 enlaces locales resueltos y `git diff --check`: aprobados. Los intentos iniciales de comandos temporales con rutas relativas incorrectas de entorno/import fallaron antes de acceder a base; se corrigieron usando el `.env` raíz y rutas de workspace correctas. La consulta de secretos por CLI falló por falta de login; el conector autenticado permitió completar el deploy. No se registran esos intentos como verificaciones aprobadas.

## 17/10/2026 — STEPBYSTEP 1, 2 y 3: órdenes e hijos

Pasos 1 y 2 existentes revalidados por la suite aislada completa. Agregados 18 unitarios de órdenes en cuatro archivos (`work-order.test.ts`, `work-order-repository.test.ts`, `work-order-controller.test.ts`, `work-order-api.test.ts`), sin Auth/API/base reales:

- Schemas: alta siempre abierta, problema/entrada obligatorios, ISO con offset y fechas reales, salida ordenada, reapertura, claves y padres inmutables, enums, cantidades finitas positivas representables en real y precios integer no negativos.
- Services/mappers con dobles: padres ajenos/archivados para todas las operaciones y ambos roles, acceso global GOD con padres activos, paginación, edición de cerradas/reapertura, eliminación, normalización de estados sin crear ítems y conservación de reason.
- Controllers con servicios sustituidos: validación antes de acceder a servicios, contexto/IDs/query correctos, 201/200/204 y 400/404.
- Repository real compilado contra callback Drizzle local: alcance/archivo, filtro abiertas/cerradas, snapshot de listado, lock de padres, orden e hijos bajo la misma frontera autenticada, padre/ruta antes de reemplazar hijos y eliminación de orden. Fallo de inserción de un hijo se propaga fuera del callback transaccional; esto no ejecuta ni demuestra rollback PostgreSQL.
- Transporte frontend sustituido: alta/edición con contratos separados y métodos correctos, eliminación, todas las páginas, conservación de filtros y rechazo de resultados parciales ante 401/404.

Resultado final local: **78/78 unitarios aprobados**. `pnpm lint`, `pnpm typecheck`, `pnpm build` (API Edge, tipos y Next.js), formato enfocado y `git diff --check` aprobados. OpenAPI revisado frente a schemas y rutas; enlaces locales revisados. Durante la implementación se corrigieron fallos de lint/tipado de los tests y una aserción que debía inspeccionar el error original envuelto por Drizzle; no quedan checks fallidos.

No se modificó ni ejecutó schema/seed; no se ejecutaron integraciones, deploy ni recorridos de navegador contra API. Las FK cascade se conservan sin recrearlas. Los dobles no prueban RLS, concurrencia ni transacciones reales. El cierre remoto histórico v7 no incluye estos nuevos endpoints y requiere otra ejecución autorizada conforme a TODO paso 9. La revisión final de rendimiento del paso 8 sigue pendiente.

## 17/10/2026 — STEPBYSTEP 4, 5 y 6: cierre funcional local

Finanzas y presupuesto PDF ya implementados revalidados mediante la suite aislada existente. No se modifican endpoints ni contratos; OpenAPI revisado frente a rutas protegidas, schemas y consumidores. No se vuelve a generar una muestra visual del PDF: la inspección de la entrega anterior queda como evidencia histórica.

Revisión estática del frontend:

| Recorrido                                                                           | Resultado de revisión                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Login, guard, renovación y logout                                                   | Identidad verificada en servidor, aviso central de 401 y transporte Bearer conservados; sin reintentar mutaciones. |
| Clientes: listado, alta, detalle, edición y archivo/restauración                    | Paginación y selección activa conservadas; cargas de listado/detalle descartan respuestas obsoletas.               |
| Vehículos: listado, alta, detalle, edición y archivo/restauración                   | Contexto de alta, detalle e historial paginado protegidos de cargas obsoletas; permisos siguen en servidor.        |
| Órdenes: listado por vehículos, alta, detalle, edición, cierre/reapertura y borrado | Contratos separados y acceso por vehículo conservados; listado/contexto/detalle descartan cargas anteriores.       |
| Finanzas                                                                            | Filtros por días de Buenos Aires, total cero distinto de error y cleanup existentes conservados.                   |
| PDF                                                                                 | Validación compartida, descarga autenticada, estado de generación y errores existentes conservados.                |

Corregidas carreras de efectos en ocho pantallas: una carga anterior no puede escribir datos, errores ni finalizar el indicador de la vigente. Cleanup invalida las versiones y evita iniciar microtareas descartadas (incluido el ciclo inicial de Strict Mode); no cancela requests que ya comenzaron. Listados limpian filas tras error y no muestran mensajes de vacío ni paginación de éxito ante un fallo.

Tres unitarios nuevos en `list-lifecycle.test.ts` evalúan los componentes reales de los listados empaquetados con dobles locales de hooks, API y JSX. Simulan cleanup antes de iniciar, cargas superpuestas, error obsoleto después de éxito vigente y fallo vigente que limpia datos. No montan React ni prueban DOM/navegador; las extensiones a detalles/formularios se revisan estáticamente y por lint/TypeScript/build. No se realizan requests externos.

Resultado: `pnpm test:unit` **81/81 aprobados**. Formato enfocado, `pnpm lint` sin warnings, `pnpm typecheck`, `pnpm build` y `git diff --check` aprobados; enlaces locales de documentación modificada resueltos. Durante la edición se detectó y corrigió un import de `useRef` faltante antes de repetir los controles finales; no se conserva ese intento como build aprobado.

Revisión final de rendimiento: se preservan claims/rol/sesión por transacción, COUNT/SELECT y pool `max: 1`; no se agrega instrumentación sin una necesidad concreta ni se atribuyen mejoras medidas. Sigue pendiente validar recorridos visuales conectados y comportamiento PostgreSQL/RLS/concurrencia real. Sin integraciones nuevas o existentes ejecutadas, schema, seed, servicios externos ni deploy. Esas operaciones ya están contempladas al final de TODO paso 9; el cierre histórico v7 no incluye órdenes ni estas correcciones.

## 17/10/2026 — Segunda ejecución autorizada de TODO paso 9

Pedido explícito del usuario de repetir el paso 9. Proyecto comprobado `lsbgegbghlgxkqxpmgyx` (carDoc, us-west-2). API **v8 ACTIVE**, incluidos los endpoints de órdenes, desplegada mediante conector; ambos archivos remotos coinciden exactamente con el build local. Schema conservado sin DDL: no cambió desde el cierre anterior y coinciden los nueve cuerpos de funciones privadas. Seed revisado sin modificaciones y ejecutado con salida 0. Copia previa de dominio/catálogos y API v7 fuera del repositorio, sin volcado de Auth ni secretos de entorno.

Resultados ejecutados: `pnpm lint` sin warnings, `pnpm typecheck`, `pnpm test:unit` **81/81**, `pnpm build`, formato enfocado, enlaces locales y `git diff --check`: aprobados. Las tres integraciones existentes se ejecutaron secuencialmente, cada una con salida 0: `pnpm --filter @cardoc/back test:auth`, `test:customers` y `test:authorization`. Sin suites nuevas ni ampliación de casos.

Assertions antes y después de las suites aprobadas: 20 clientes, 19 vehículos, 48 órdenes, 143 ítems, 47 recomendaciones y 19 claims; dos clientes y un vehículo archivados, 21 órdenes abiertas y 27 cerradas. Cero propietarios inválidos, patentes duplicadas, fixtures temporales y sesiones demo. GOD sin clientes y cada MECHANIC con diez; roles restaurados, authenticated sin UPDATE de role y trigger obsoleto ausente. No se requirió limpieza manual.

La suite de autorización verifica RLS en cinco tablas, aislamiento y patentes concurrentes, inmutabilidad, metadata, rol actual y revocación; no prueba todo el CRUD HTTP de órdenes/vehículos, finanzas/PDF ni recorridos visuales del frontend. Sin deploy frontend ni nuevas mediciones. Advisor conserva una advertencia preexistente de [protección contra contraseñas filtradas desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); no se cambió Auth. Detalle de recuperación, resultados e intentos fallidos corregidos en [el segundo informe](docs/supabase-closure-repeat-2026-10-17.md).
