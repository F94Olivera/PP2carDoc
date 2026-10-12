# Cierre de la demo Supabase — 17/10/2026

Proyecto: `carDoc`, `lsbgegbghlgxkqxpmgyx`, región `us-west-2`, PostgreSQL 17.6. El usuario autorizó explícitamente reinicio destructivo, seed, las tres integraciones existentes y deploy. Se mantiene pendiente implementar órdenes HTTP (TODO paso 4) y la revisión final de rendimiento (paso 8). Este cierre publica el alcance implementado, sin declarar terminado el producto.

## Preparación y recuperación

Se verificó que URL de Auth, API, frontend y conexión de base correspondieran al proyecto documentado, sin imprimir credenciales. Inventario previo: tres perfiles, 20 clientes, 19 vehículos, 48 órdenes, 143 ítems, 47 recomendaciones y 19 registros privados de patentes. Ningún cliente tenía documento ajeno a los fixtures SH.

Se guardaron fuera del repositorio, en `~/.codex/backups/cardoc-step9-2026-10-17/`, `domain-before-reset.json` (filas de las siete tablas y catálogo de funciones, columnas, restricciones, políticas y triggers) y `api-version6.json` (fuentes de la función anterior). Archivos con permisos 0600; no se incluyen secretos de entorno ni un volcado de Auth. Es una copia de recuperación de dominio y fuentes, no un backup completo del proyecto ni una restauración ensayada. El seed invalida sesiones y restablece credenciales demo; las sesiones anteriores no se restauran.

Orden elegido: controles locales → copia e inventario → schema transaccional → inicio de seed → deploy → Auth → finalización de seed → clientes → autorización → inventario de limpieza. Durante el reinicio no se garantiza disponibilidad ni una vista consistente de la demo. En caso de fallo de schema, su transacción revierte; después de aplicarlo, corregir y repetir seed/deploy en el mismo proyecto antes de habilitar uso. Para recuperar datos previos, revisar los catálogos/copia y restaurar padres antes que hijos, omitiendo columnas generadas y ajustando secuencias; no ejecutar una importación automática ni restaurar solo el código anterior contra un schema incompatible.

## Cambios y operaciones

- Seed: dos clientes archivados (Oliver Queen y Jean Grey), uno por MECHANIC, con vehículos cuyo estado propio se conserva activo; Kimoyo Cruiser archivado bajo cliente activo. Los árboles se insertan completos antes de archivar. Se mantienen propietarios MECHANIC, GOD sin clientes, precios enteros, patentes únicas y limpieza de hijos antes que padres; el rechazo de GOD con clientes ajenos al seed se conserva.
- Integración de autorización existente: totales de activos 9/9/18, selección de árboles operativos para probar acceso autorizado y restauración del cliente de prueba antes de insertar descendientes/concurrencia. Sin esa restauración, el test esperaba escrituras sobre un padre que había archivado.
- Schema: ejecutado el archivo completo `supabase/schema.sql` mediante Postgres.js con CA y validación TLS, en el proyecto comprobado. Se preserva Auth; se recrean tablas/perfiles, restricciones, índice privado de patentes, políticas y función de finanzas con sus permisos. No se creó una migración de conservación de datos porque se autorizó reinicio destructivo.
- Deploy: API versión **7**, estado **ACTIVE**, `verify_jwt=false` como en la versión 6 y config del repositorio; las rutas privadas siguen usando `requireAuth`. Se publicó el bundle generado por `pnpm build` mediante `supabase_deploy_edge_function`, archivos `index.ts` y `dist/index.js`. La consulta `pnpm supabase secrets list --project-ref lsbgegbghlgxkqxpmgyx` falló por falta de access token CLI; no se copiaron secretos ni se cambió configuración remota. Se usó la conexión del conector ya autenticado.

La ayuda de `pnpm supabase functions deploy --help` se revisó sin desplegar por CLI. El comando documentado sigue siendo `pnpm deploy:api --project-ref lsbgegbghlgxkqxpmgyx` cuando la CLI tenga sesión. Se consultaron changelog y [documentación oficial de copia/restauración y funciones](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). El cambio anunciado sobre cifrados TLS antiguos no requiere cambios en este cliente Node con validación TLS.

## Seguridad y límites

Advisor de seguridad posterior al schema: una advertencia de Auth, protección contra contraseñas filtradas desactivada. [Configuración y mitigación oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se modificó esa configuración de cuenta. Sin avisos de tablas públicas sin RLS en ese análisis.

No se desplegó el frontend, no se crearon integraciones nuevas y no se implementaron endpoints de órdenes. Las tres suites existentes no cubren todo el CRUD HTTP de vehículos, finanzas, PDF ni recorridos visuales de frontend. Las verificaciones aisladas previas conservan sus límites; no atribuir cobertura remota a los 60 unitarios.

## Resultado del seed

`pnpm seed:superheroes`: aprobado. Consulta posterior con assertions: 20 clientes (dos archivados), 19 vehículos (uno archivado), cuatro vehículos con estado propio activo bajo clientes archivados, 21 órdenes abiertas y 27 cerradas, 143 ítems, 47 recomendaciones y 19 claims de patente. Cero propietarios distintos de MECHANIC y cero patentes normalizadas duplicadas por propietario. La comparación posterior a las integraciones comprueba que sus fixtures temporales fueron retirados; no se reutiliza este inventario inicial como prueba de limpieza.

## Verificación y cierre

| Comando / comprobación                          | Resultado                                                                                                                               |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                                     | Aprobado                                                                                                                                |
| `pnpm typecheck`                                | Aprobado                                                                                                                                |
| `pnpm test:unit`                                | 60/60 aprobados                                                                                                                         |
| `pnpm build`                                    | Tipos, bundle Edge y Next.js aprobados                                                                                                  |
| `pnpm seed:superheroes`                         | Aprobado; totales anteriores                                                                                                            |
| `pnpm --filter @cardoc/back test:auth`          | Salida 0: Auth, CORS, validación, logout y token revocado                                                                               |
| `pnpm --filter @cardoc/back test:customers`     | Salida 0: validación, paginación, detalle y paridad SQL                                                                                 |
| `pnpm --filter @cardoc/back test:authorization` | Salida 0: CRUD/permisos, tres roles, RLS en cinco tablas, concurrencia, patentes, padres inmutables, metadata, rol vigente y revocación |
| Prettier enfocado, enlaces y `git diff --check` | Aprobados; 24 enlaces locales resueltos                                                                                                 |
| Recuperación de fuentes de API versión 7        | Bundle idéntico al generado localmente                                                                                                  |

Tras finalizar las tres suites, consulta con assertions aprobada: 20 clientes, 19 vehículos, 48 órdenes, 143 ítems, 47 recomendaciones, 19 claims; dos clientes y un vehículo archivados; cero clientes AUTH-TEST, vehículos TEST/CONCURRENT y sesiones demo. GOD conserva cero clientes y los MECHANIC diez cada uno. `has_column_privilege('authenticated', 'public.user_profiles', 'role', 'UPDATE')` devuelve false; trigger obsoleto `customers_plates` ausente. La limpieza propia de las suites terminó con salida 0; no fue necesario reejecutar seed ni borrar manualmente residuos.

Los comandos temporales de inventario, aplicación del SQL y assertions se ejecutaron mediante `pnpm --filter @cardoc/back exec node --env-file=/Users/folivera/Documents/projects/PP2carDoc/.env --input-type=module`, usando Postgres.js instalado, CA del backend y validación del project-ref antes del acceso. Los primeros intentos con rutas de entorno/import equivocadas fallaron antes de conectar; se corrigieron y no se cuentan como comprobaciones exitosas.

El paso 9 queda completado para la demo y el alcance de API disponible. Al terminar TODO paso 4 se deben revisar de nuevo contratos/fixtures, verificar y publicar esa implementación con autorización remota correspondiente. Las tareas ya estaban reunidas al final de TODO; no se creó un bloque duplicado.
