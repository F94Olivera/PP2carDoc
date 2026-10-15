# Segundo cierre de la demo Supabase — 17/10/2026

El usuario solicitó repetir TODO paso 9 tras completar órdenes HTTP y el cierre local de STEPBYSTEP 4–6. Proyecto comprobado: `carDoc`, `lsbgegbghlgxkqxpmgyx`, `us-west-2`, estado ACTIVE_HEALTHY. Esta ejecución incluye seed, las tres suites existentes y deploy; no se crean integraciones nuevas ni se publica frontend.

## Preparación, schema y recuperación

Controles locales sobre commit `0befc9f`: lint sin advertencias, TypeScript, 81/81 unitarios y build de tipos/API/Next.js aprobados. Changelog y documentación oficial de despliegue consultados; se conserva la configuración vigente de autenticación propia de la API.

Inventario anterior: tres perfiles, 20 clientes, 19 vehículos, 48 órdenes, 143 ítems, 47 recomendaciones y 19 claims de patente. Cero clientes ajenos al prefijo SH, propietarios inválidos y sesiones demo. Copia de dominio/catálogos y fuentes de API v7 en `~/.codex/backups/cardoc-step9-repeat-2026-10-17/`, con directorio 0700 y archivos 0600; manifest incluye commit y hash de schema. No contiene `.env` ni un volcado de Auth; recuperación no ensayada.

Se conserva el schema: no cambió desde la entrega de finanzas anterior al cierre v7, y los nueve cuerpos de funciones privadas desplegadas coinciden con el archivo local. El catálogo de columnas, restricciones, políticas y triggers se conserva en la copia; las suites existentes verifican sus garantías dentro de su alcance. No se ejecutó DDL, reinicio destructivo ni migración. Reaplicar `supabase/schema.sql` no aporta cambios para esta entrega.

Seed revisado frente a contratos de órdenes: problema/entrada obligatorios, fechas de salida ordenadas, precios enteros, cantidades positivas y estados de recomendaciones válidos. Los fixtures persistidos pueden incluir órdenes cerradas; la restricción de crear siempre abierta corresponde al endpoint HTTP. No hizo falta modificar el seed ni las suites existentes.

Orden: controles e inventario/copia → iniciar seed → publicar API v8 → finalizar seed → assertions → integraciones secuenciales → assertions de limpieza. Durante la regeneración la demo puede mostrar datos transitorios. Seed restablece credenciales y revoca sesiones de las tres cuentas demo; esas sesiones no se recuperan. Si falla una integración, revisar su limpieza antes de reintentar. Para recuperar dominio, revisar copia y restaurar padres/hijos y secuencias en orden; para volver a API v7 están sus fuentes, pero perdería los endpoints de órdenes. No se necesita revertir schema porque no se modifica.

## Despliegue

API **versión 8 ACTIVE**, publicada con el conector Supabase, entrypoint `index.ts` y bundle `dist/index.js` del build local. `verify_jwt=false` se conserva: login/ping son públicos y las rutas privadas usan `requireAuth`. Recuperados ambos archivos remotos y comparados exactamente con los locales: coinciden. Sin cambios de secretos, dependencias ni configuración remota. El frontend no se despliega en este paso.

## Seguridad y límites

Advisor de seguridad: persiste la advertencia previa de protección contra contraseñas filtradas desactivada. [Configuración y mitigación oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). No se cambió esa configuración de Auth; sin avisos de tablas públicas sin RLS en este análisis.

Las tres suites existentes cubren Auth, clientes, autorización/RLS, parentescos y unicidad concurrente. No demuestran todo el CRUD HTTP de órdenes/vehículos, finanzas/PDF ni recorridos visuales; los 81 unitarios conservan su alcance aislado. No se amplía la cobertura remota ni se crean integraciones sin la aprobación específica requerida.

## Seed y comprobación previa a integraciones

`pnpm seed:superheroes`: salida 0. Assertions posteriores aprobadas: 20 clientes (dos archivados), 19 vehículos (uno archivado), 48 órdenes (21 abiertas y 27 cerradas), 143 ítems, 47 recomendaciones y 19 claims. GOD sin clientes y cada MECHANIC con diez; cero propietarios inválidos, fixtures ajenos, órdenes/ítems inválidos, patentes duplicadas y sesiones demo. Authenticated sigue sin UPDATE de role y el trigger obsoleto `customers_plates` permanece ausente.

Dos intentos de comprobación no se cuentan como aprobados: el inventario inicial usó un nombre incorrecto de tabla privada (corregido a `vehicle_plate_claims` antes de guardar la copia), y una assertion se lanzó mientras el seed aún tenía su inserción sin confirmar, por lo que observó cero clientes. Se repitió tras finalizar el seed y aprobó; no hubo escritura manual para corregir los conteos.

## Integraciones existentes

- `pnpm --filter @cardoc/back test:auth`: salida 0; salud, CORS, validación, login, identidad, logout y rechazo inmediato de token revocado.
- `pnpm --filter @cardoc/back test:customers`: salida 0; validación de query, defaults, paginación, detalle y paridad SQL; limpieza propia completada.
- `pnpm --filter @cardoc/back test:authorization`: salida 0; identidad/CRUD/paginación, tres roles, aislamiento concurrente, RLS en cinco tablas, escrituras de hijos, unicidad de patentes concurrente, padres inmutables, tokens falsificados, metadata no confiable, rol vigente y revocación.

Assertions posteriores a las tres suites: aprobadas, inventario idéntico al seed (20/19/48/143/47 y 19 claims), dos clientes y un vehículo archivados, 21 órdenes abiertas y 27 cerradas. Cero fixtures ajenos/temporales, propietarios inválidos, patentes duplicadas y sesiones demo. GOD sin clientes, ambos MECHANIC con diez; roles restaurados, UPDATE de role por authenticated denegado y trigger obsoleto ausente. No fue necesario repetir seed ni limpiar residuos manualmente.

## Resultado final

Paso 9 repetido y completado para la API v8 y el alcance de las tres integraciones existentes. Formato enfocado, enlaces locales y `git diff --check` aprobados. Se actualizaron README, REQUIREMENTS, STEPBYSTEP, TESTING y TODO, conservando la evidencia v7. Sin cambios de schema/seed/código ni nuevas mediciones de performance. Persisten los límites de cobertura y frontend indicados arriba.
