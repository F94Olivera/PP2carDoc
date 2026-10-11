# Alinear una demo con las reglas de propiedad

Cambios preparados el 17/10/2026; no aplicados ni verificados en un proyecto Supabase. `supabase/schema.sql` es destructivo: editarlo no cambia una base existente.

Para una demo descartable, respaldar lo necesario, seleccionar explícitamente el proyecto y ejecutar manualmente schema y luego seed, solo con autorización para esas operaciones. Se pierden los datos de dominio; Auth se conserva y el seed restaura las tres cuentas ficticias. El seed elimina primero sus fixtures SH y descendientes, reparte clientes entre los dos MECHANIC y nunca asigna a GOD. Si GOD conserva clientes ajenos al seed, falla y exige revisión.

Para conservar datos, preparar una migración administrativa revisada antes de desplegar la API. Inventariar clientes cuyo perfil no sea MECHANIC, documentos repetidos por mecánico y patentes normalizadas repetidas por mecánico. No resolverlos mediante transferencias silenciosas: decidir explícitamente si se conserva el perfil como MECHANIC o se descartan/recrean fixtures con su árbol completo en la demo. Revisar colisiones antes de recrear; no desactivar las restricciones como operación ordinaria.

Una actualización que conserve datos debe incorporar las funciones/triggers de propietario y padres inmutables del schema, la restricción única `(id, role)` en perfiles y la FK compuesta de clientes con el discriminador generado MECHANIC. Retirar `customers_plates`/`sync_customer_plates`, conservar y comprobar la tabla privada de patentes y su unique normalizado; ajustar `vehicles_plate` a altas/cambios de patente. Revocar también el privilegio **por columna** `update(role)` previamente otorgado a authenticated y eliminar `profiles_update`: revocar solo UPDATE de tabla no elimina grants por columna. Conservar SELECT con RLS. Funciones privadas sin EXECUTE público salvo los tres helpers de sesión/autorización.

No aplicar parcialmente: auditar y corregir datos antes de instalar restricciones, y coordinar schema con el despliegue de API. Las integraciones existentes requieren autorización explícita para ejecutarse después; build y unitarios no prueban RLS, locks ni concurrencia en Postgres.
