# Portal del cliente — alcance aprobado

Fecha: 27/10/2026. Versión 5. Implementación autorizada por el usuario después de cuatro iteraciones de definición. El email fijo quedó aprobado al autorizar el documento completo.

Este archivo conserva las decisiones del incremento. Los requisitos vigentes se integran en [REQUIREMENTS.md](REQUIREMENTS.md), los contratos HTTP en [OpenAPI](docs/openapi.yaml), el progreso en [STEPBYSTEP.md](STEPBYSTEP.md) y la evidencia y límites en [TESTING.md](TESTING.md).

## Reglas acordadas

- Roles `GOD`, `MECHANIC` y `USER`. “Cliente/client” significa USER, no un cuarto rol.
- Una cuenta USER por customer; email obligatorio, normalizado y único entre todas las cuentas, incluso entre talleres. No vincular ni sobrescribir cuentas existentes por conocer su mail. Email fijo después del alta en customer y Auth.
- Customer conserva su propietario MECHANIC, ID numérico y relaciones existentes. Agrega `uuid` obligatorio, único, generado e inmutable y `userId` único asociado a su perfil Auth. El UUID de customer es distinto del UUID Auth.
- Al crear customer se crea también su cuenta con contraseña. Alta completa o rollback; no dejar cuentas/clientes parciales. No otorgar MECHANIC provisionalmente a cuentas cliente.
- La contraseña la elige el mecánico. React sugiere `123qweASD` en alta/restablecimiento y permite reemplazarla. El backend no proporciona contraseñas predeterminadas. Mínimo ocho caracteres y máximo 72 bytes UTF-8.
- Solo el mecánico propietario restablece la contraseña desde edición del customer. No puede hacerlo USER ni GOD. Se revocan todas las sesiones/refresh tokens del cliente. No se exige cambio al primer ingreso.
- Si el cliente la olvida, contacta al mecánico fuera del sistema. No hay otro flujo: sin recuperación por email, autoservicio ni cambio propio de contraseña.
- No devolver contraseñas, hashes, verificadores o datos internos de Auth, ni guardarlos en logs o almacenamiento del navegador.
- Borrar físicamente customer elimina también su cuenta USER, perfil y sesiones en la misma transacción. Customer con vehículos no se borra: la restricción preserva también su cuenta. Nunca eliminar al mecánico propietario.
- Archivo conserva la cuenta y respeta los flujos anteriores: customer archivado oculta vehículos e historial; vehículo archivado no se muestra ni abre en el portal. Restaurar recupera visibilidad según ambos padres. No alterar finanzas de históricos archivados.
- Transferencias/venta de vehículos, registro público, cuentas compartidas entre talleres y administración general de roles quedan fuera de alcance.

## Token e identidad

El access token firmado, tanto al iniciar como al renovar sesión, incluye identidad (`sub`, `email`), `app_metadata.user_role` y `app_metadata.customerId`:

| Rol          | customerId               |
| ------------ | ------------------------ |
| USER         | UUID de `customers.uuid` |
| MECHANIC/GOD | `null` explícito         |

El claim técnico `role` de Supabase permanece `authenticated`. No se reemplaza por el rol de aplicación. Los claims proceden de perfil y vínculo confiables; nunca de `user_metadata` editable.

En cada request se verifica token, expiración, sesión y perfil/vínculo vigente. Rol/customerId firmados deben coincidir con los datos actuales. USER sin vínculo, tokens anteriores sin claims o sesiones revocadas no conceden acceso. Decodificar un JWT no autentica.

Implementación elegida: triggers sincronizan metadata administrativa desde perfil y customer; Supabase Auth la firma al emitir/renovar tokens. No hace falta configurar un Access Token Hook. `/auth/me` también expone rol y customerId para la navegación verificada.

## Página y endpoint /myvehicles

La nueva página React `/myvehicles` es el destino inicial de USER y su única opción de navegación lateral. GOD/MECHANIC conservan las pantallas de taller. Revisar rutas directas además del menú, con guard, proxy y validación de servidor.

Contrato dedicado:

- `GET /myvehicles`, relativo a `/functions/v1/api`.
- Bearer token obligatorio. Sin query params ni body; se rechazan entradas no admitidas.
- La llamada React usa el transporte común con `x-region: us-west-2` obligatorio. No inventar otro hostname regional ni omitir el header. Localhost no simula una región AWS.
- El backend obtiene customerId UUID del token verificado, contrasta su vínculo con la cuenta, lo resuelve a `customers.id` numérico y cruza con `vehicles.customerId`.
- Solo USER. GOD/MECHANIC reciben 403 y usan los endpoints existentes de gestión.
- Respuesta 200 `{ "data": [...] }`, todos los vehículos activos propios bajo customer activo, con orden estable por ID. Sin truncamiento a la primera página o límite fijo. Sin vehículos o con customer archivado, lista vacía.
- Token ausente/inválido/vencido, sesión revocada o vínculo incoherente: 401. Parámetros/body no admitidos: 400.

React no envía customerId ni obtiene vehículos globales para filtrarlos localmente. Cada consulta posterior por ID vuelve a comprobar pertenencia y actividad.

## Historial y presentación

Recorrido: `/myvehicles` → `/myvehicles/:vehicleId` → `/myvehicles/:vehicleId/services/:workOrderId`.

“Servicios” son las órdenes existentes, sus ítems y recomendaciones. Mostrar órdenes abiertas y cerradas, todos sus datos, notas, diagnóstico, kilometraje, problemas, precios, cantidades y recomendaciones, salvo las de estado `REJECTED`. Ese valor es un estado, no una categoría ni prioridad. Se conserva la conversión interno `rejected` ↔ público `REJECTED`.

La exclusión de REJECTED se aplica en backend antes de serializar y en RLS para lectura directa USER. MECHANIC/GOD conservan su visibilidad. Solo ocultarlo en React no cumple.

Los listados de órdenes existentes separan abiertas/cerradas mediante `withEndDate`; el portal recorre todas las páginas de ambos conjuntos y ofrece Todos/Abiertos/Cerrados con paginación visual. Se comparten componentes de lectura de vehículo y orden con las vistas existentes; no se comparten acciones administrativas. Mantener carga, vacío, error, sesión vencida y descarte de respuestas obsoletas. La información de la orden debe permanecer accesible también en móvil.

## Matriz de permisos

| Operación                                      | USER                          | MECHANIC              | GOD                        |
| ---------------------------------------------- | ----------------------------- | --------------------- | -------------------------- |
| Login, sesión actual, logout                   | Sí                            | Sí                    | Sí                         |
| GET /myvehicles                                | Solo propios                  | No                    | No                         |
| Vehículo, historial y orden por ID             | Solo propios activos, lectura | Gestión propia actual | Gestión global actual      |
| Crear acceso con customer                      | No                            | Propios               | Para un MECHANIC explícito |
| Restablecer contraseña de customer             | No                            | Solo propios          | No                         |
| Customers y escrituras de vehículo/orden/hijos | No                            | Propios               | Gestión global actual      |
| Presupuestos y finanzas                        | No                            | Sí                    | Sí                         |
| Administración general de perfiles/roles       | No                            | No                    | Sin endpoint nuevo         |

La lista de rutas/métodos permitidos restringe USER en HTTP. RLS separa SELECT de las políticas de escritura en toda la cadena: abrir lectura del padre no puede habilitar mutaciones de descendientes. Los detalles ajenos o archivados responden 404 sin revelar su existencia.

## Ciclo de cuentas y límites técnicos

Se implementan funciones privadas acotadas de Postgres para crear customer/cuenta, restablecer contraseña y eliminar ambos. Derivan identidad de la sesión verificada, comprueban rol/propietario y usan una única transacción. Reutilizan el mecanismo SQL/bcrypt que ya tenía el seed. No usan contraseñas de aplicación duplicadas ni claves administrativas en el frontend.

Esto sustituye la alternativa inicial de llamada Admin HTTP más transacción SQL y compensaciones: todas las escrituras de Auth y negocio aquí comparten la transacción. Las funciones están en schema no expuesto, con search_path fijo y sin permisos públicos/anónimos. El usuario autenticado solo puede ejecutar los casos concedidos, que vuelven a validar identidad y alcance.

Un trigger de `auth.users` impide que USER cambie contraseña o email directamente mediante Auth. El restablecimiento privado permite la actualización de contraseña únicamente bajo el rol de base autorizado y un permiso local de transacción, que luego limpia; revoca sesiones y tokens de un solo uso. Perfil y vínculo conservan sus FK y restricciones inmutables. La protección real contra Auth requiere verificación específica autorizada; no se acredita solo por haber escrito un trigger.

Una pantalla puede hacer dos llamadas sin romper la arquitectura: el alta es una operación coordinada del backend; en edición, guardar datos y restablecer contraseña son acciones separadas, con carga/error propios. No sugerir que ambas son una única transacción desde React.

## Schema, seed y publicación

Prohibidas las migraciones. El usuario autorizó recrear base/tablas afectadas, ajustar el seed y ejecutarlo si el modelo lo requiere; no es necesario preservar datos demo. Se recrean objetos de carDoc desde `supabase/schema.sql`, conservando infraestructura administrada Auth/Storage. No ejecutar esta recreación como validación incidental de futuros cambios.

El seed conserva los dos MECHANIC, GOD y los árboles ficticios; agrega una cuenta USER para cada héroe con su email `@hero.test`. La contraseña demo se guarda únicamente en `SEED_DEMO_PASSWORD` del `.env` raíz. La sugerencia del formulario no obliga a usar esa contraseña en el seed. Las credenciales de base permanecen en `.env`, excluido de Git.

La autorización de recreación/seed no autoriza suites de integración ni llamadas equivalentes a endpoints para verificar comportamiento. Separar aplicación/publicación de verificaciones funcionales y dejar resultados reales en TESTING.

## Aceptación y evidencia

- Validar entradas, email único/fijo, contraseña y campos de privilegio/generados rechazados.
- Alta y borrado sin éxitos parciales; restricciones de dependencias y reintentos no sobrescriben cuentas.
- Claims correctos para los tres roles, contraste con vínculo vigente y rechazo de faltantes/inconsistentes.
- Listado propio completo, sin query/body, Bearer y región obligatoria.
- Lectura por ID propia, sin acceso ajeno, archivado ni escritura HTTP/Data API.
- Historial de ambas clases de órdenes sin REJECTED, con campos completos en todos los tamaños.
- Contraseña restablecida solo por el mecánico propietario, sin recuperación ni cambio propio.
- Regresión de GOD/MECHANIC, archivo, restauración, finanzas, sesiones y paginación.

La revisión inicial fue realizada por `evaluar_propuesta` y luego contrastada por `auditar_conclusiones`. Ambos coincidieron en la viabilidad y detectaron los riesgos de RLS FOR ALL, altas parciales, emails opcionales, rol por defecto y reutilización de pantallas. Las iteraciones posteriores fueron revisadas por el agente principal. Los resultados actuales de unitarios, controles, schema, seed y publicación se registran en TESTING; ninguna inspección estática equivale a probar Auth/RLS reales o un recorrido conectado.
