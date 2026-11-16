# carDoc

Sistema para mecánicos con clientes, vehículos, órdenes de trabajo, recomendaciones, finanzas y presupuestos PDF. Cada MECHANIC trabaja con sus propios datos; GOD puede operar sobre todos, respetando las reglas de negocio. Se usan exclusivamente datos ficticios.

## Uso de agentes de IA

Durante el desarrollo de carDoc se utilizaron Claude y Codex como agentes de IA de apoyo al equipo.

## Documentación

| Archivo                                | Propósito                                                                   |
| -------------------------------------- | --------------------------------------------------------------------------- |
| [REQUIREMENTS.md](REQUIREMENTS.md)     | Alcance, reglas, flujos, criterios de aceptación y estado de los endpoints. |
| [AGENTS.md](AGENTS.md)                 | Cómo trabajar en el repositorio y verificaciones obligatorias.              |
| [STEPBYSTEP.md](STEPBYSTEP.md)         | Orden de implementación, avances y pendientes por incremento.               |
| [TESTING.md](TESTING.md)               | Escenarios, comandos, resultados y límites de verificación.                 |
| [TODO.md](TODO.md)                     | Cambios de código pendientes; ninguno se implementa por documentarlo.       |
| [docs/openapi.yaml](docs/openapi.yaml) | Contrato técnico de los endpoints implementados.                            |

Los flujos están integrados en REQUIREMENTS. El [informe de performance del 17/10/2026](docs/performance-2026-10-17.md) es evidencia histórica, no un listado vigente de tareas ni una garantía de tiempos actuales.

## Estructura y estado

- `apps/front`: Next.js, React y Tailwind; pantallas de clientes, vehículos, órdenes, finanzas y presupuesto. La existencia de una pantalla no significa que su API esté terminada.
- `apps/back/src`: Express y TypeScript, compilados para una Supabase Edge Function; Drizzle y Postgres.js para persistencia, Zod para validación y Pino para logs.
- `packages/types`: contratos compartidos entre frontend y backend.
- `supabase`: configuración, esquema SQL y entrada de la función.
- `scripts`: herramientas compartidas.

Existen endpoints de salud, login, identidad, logout, CRUD de clientes y vehículos con archivo/restauración, órdenes con alta abierta, detalle, listado por vehículo, edición/cierre/reapertura y eliminación atómica con hijos, además de GET `/finances` y POST `/budgets/pdf`. Finanzas incluye historial de padres archivados y días completos de Buenos Aires. El segundo cierre autorizado del 17/10/2026 publicó la API versión 8 en `lsbgegbghlgxkqxpmgyx`, incluidos los endpoints de órdenes, y regeneró el seed conservando el schema compatible de v7. Evidencia, recuperación y límites en [el segundo informe de cierre](docs/supabase-closure-repeat-2026-10-17.md) y TESTING; [el primer cierre](docs/supabase-closure-2026-10-17.md) conserva su alcance histórico. El frontend no se desplegó en estos cierres.

## Desarrollo local

Requisitos: Node.js 26.3.0 (fijado en `.nvmrc`), pnpm 11.7.0, Docker en ejecución y Supabase CLI instalada como dependencia del repositorio. `package.json` limita Node a `>=26.3.0 <27`; la versión comprobada localmente es 26.3.0. Con nvm disponible, usar `nvm use` antes de instalar. Los controles locales verifican compilación y unitarios; no equivalen a iniciar Docker ni verificar el runtime Edge desplegado.

Desde la raíz:

```bash
pnpm install
# Crear el único .env a partir de .env.example y configurar sus valores.
pnpm supabase:start
pnpm dev
```

En otra terminal:

```bash
pnpm dev:web
```

| Servicio        | Dirección local                              |
| --------------- | -------------------------------------------- |
| API             | http://127.0.0.1:54321/functions/v1/api      |
| Salud           | http://127.0.0.1:54321/functions/v1/api/ping |
| Supabase Studio | http://127.0.0.1:54323                       |
| Frontend        | http://localhost:3000                        |

`pnpm dev:api` equivale a `pnpm dev`. El backend habitual se sirve mediante Edge, no en el puerto 3001. Express escucha internamente en 8000 salvo override de `PORT_BACK`. El watcher reconstruye el bundle y el runtime recarga la función; durante la recarga puede aparecer un 502 transitorio.

El código editable está en `apps/back/src`. `supabase/functions/api/index.ts` carga `supabase/functions/api/dist/index.js`, generado e ignorado por Git. No editarlo ni commitearlo. `pnpm --filter @cardoc/back build` lo regenera; al cambiar dependencias, reiniciar `pnpm dev`.

## Configuración y base de datos

Usar solamente el `.env` raíz, basado en [.env.example](.env.example). No subir credenciales ni tokens al repositorio. El frontend requiere estas variables públicas, todas del mismo proyecto que la API:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:54321/functions/v1/api
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave-publicable-local>
```

La CLI recibe `.env` explícitamente. Edge inyecta su URL y claves públicas de Supabase; los avisos por variables `SUPABASE_*` ignoradas del archivo son esperados. Obtener las claves locales mediante `pnpm supabase status`. No poner secretos de base de datos ni claves administrativas en variables `NEXT_PUBLIC_*`.

La conexión a Postgres se inicializa al usar un repositorio. Prioridad: `EDGE_DATABASE_URL`, `SUPABASE_DB_URL` del runtime y `DATABASE_URL` como fallback para herramientas fuera de Docker. En local, `DATABASE_SSL=false`; en remoto se valida SSL con la CA incluida o con `DATABASE_SSL_CA`. No subir el `.env` completo como secretos remotos.

Para Edge remoto, configurar `EDGE_DATABASE_URL` con el Transaction pooler de Supabase Connect, puerto 6543 y usuario `postgres.<project-ref>`, manteniendo SSL. La conexión directa puede requerir IPv6 no disponible en Docker. Los repositorios instalan identidad y rol en una transacción para aplicar RLS; no dependen solo de filtros del frontend.

### Preparación manual de datos ficticios

Ejecutar manualmente `supabase/schema.sql` únicamente en el proyecto de demo que se quiere recrear. **Es destructivo:** restablece tablas, perfiles, funciones y políticas de carDoc en una transacción, conservando las cuentas Auth y la infraestructura administrada de Supabase. No hay migraciones incrementales.

Después de crear el esquema, configurar `SEED_DEMO_PASSWORD` de al menos 16 caracteres en `.env` y ejecutar explícitamente:

```bash
pnpm run seed:superheroes
```

El seed prepara Mateo y Lucia como MECHANIC y `god.cardoc@example.test` como GOD. Las otras cuentas son `mateo.cardoc.20261006@example.test` y `lucia.cardoc.20261006@example.test`. Sus contraseñas vienen del entorno y no se imprimen. Hay 18 clientes activos y dos archivados (uno por MECHANIC); sus vehículos mantienen su estado propio. Kimoyo Cruiser queda archivado bajo un cliente activo, con historial abierto/cerrado, para distinguir archivo de vehículo y de cliente. Se recrean 20 clientes, 19 vehículos, 48 órdenes, 143 ítems y 47 recomendaciones de muestra. Reejecutarlo restablece credenciales/roles de estas cuentas y revoca sus sesiones.

El seed usa acceso privilegiado para fixtures, sin registro público ni SMTP. Desplegar la función no crea tablas, no ejecuta el esquema y no copia usuarios o datos. Local y remoto son entornos independientes. Los comandos de este apartado son instrucciones de preparación manual, no pasos automáticos de verificación.

## Autenticación y uso de la API

Las rutas de OpenAPI son relativas a la URL base. `/login` recibe email/password; las rutas protegidas requieren `Authorization: Bearer <access_token>`. La función tiene `verify_jwt=false` para permitir login público; `requireAuth` protege las rutas privadas y consulta Auth, sesión y rol actual. La aplicación limita la antigüedad del token a 15 minutos. Logout revoca la sesión actual y las comprobaciones de sesión rechazan sus tokens en requests posteriores.

El frontend inicia sesión directamente con Supabase Auth y `@supabase/ssr`, que gestiona cookies y renovación. Clientes, vehículos, el portal del cliente, finanzas y presupuestos usan el transporte autenticado, que envía el token Bearer en las solicitudes a la API.

El transporte actual agrega `x-region: us-west-2` para acercar Edge remoto a Postgres; CORS lo admite y expone `x-sb-edge-region`. Esto no modifica llamadas directas a Auth ni ofrece failover regional automático. No usar el diagnóstico histórico como prueba de una nueva medición.

## Comandos de desarrollo y validación

Desde la raíz:

| Comando                                 | Alcance                                               |
| --------------------------------------- | ----------------------------------------------------- |
| `pnpm dev` / `pnpm dev:api`             | Backend Edge local.                                   |
| `pnpm dev:web`                          | Frontend.                                             |
| `pnpm build:api` / `pnpm build:web`     | Build del workspace y dependencias correspondientes.  |
| `pnpm build`                            | Build de todos los workspaces con script configurado. |
| `pnpm lint` / `pnpm typecheck`          | Comprobaciones de los workspaces.                     |
| `pnpm test` / `pnpm test:unit`          | Solo unitarios sin servicios externos.                |
| `pnpm exec prettier <archivos> --check` | Formato enfocado.                                     |
| `git diff --check`                      | Errores de whitespace en el diff.                     |

Las tres integraciones requieren un pedido explícito para ejecutarse. Ver [TESTING.md](TESTING.md); no forman parte de la verificación habitual, hooks o CI.

## Despliegue

Revisar los cambios y completar las verificaciones de AGENTS antes de un commit. El proyecto remoto actualmente referenciado es `lsbgegbghlgxkqxpmgyx`. Con la CLI autenticada mediante `pnpm supabase login`, el despliegue explícito del backend usa:

```bash
pnpm deploy:api --project-ref lsbgegbghlgxkqxpmgyx
```

El comando reconstruye y despliega solo `api`. Los secretos personalizados se configuran por separado; no ejecuta schema ni seed. En CI se necesita `SUPABASE_ACCESS_TOKEN` como secreto. El frontend se publica por separado en un hosting compatible con Next.js, configurado para el mismo proyecto Supabase. Un despliegue no autoriza integraciones ni llamadas manuales equivalentes.

Actualización de rendimiento del 17/10/2026: API v9 publicada con caché de permisos CORS de 600 segundos y detalles de vehículo/orden sin transacciones de relectura de padres. El frontend local continúa apuntando directamente a Supabase remoto. Resultados y límites en [el informe de los cinco endpoints](docs/performance-endpoints-2026-10-17.md); no se afirma una reducción general de latencia.

## Portal del cliente (USER)

Las altas de customer requieren email único y contraseña y crean su acceso USER; email fijo después del alta. El mecánico puede restablecer la contraseña desde edición; el cliente también puede solicitar un enlace desde el login. La sugerencia del formulario es `123qweASD`, reemplazable. La recuperación pública usa Supabase Auth y entrega a la casilla demo. Restablecer revoca las sesiones del cliente.

Después de crear la cuenta, la API intenta enviar un correo de bienvenida sin incluir la contraseña ni enlaces de recuperación. Si Resend rechaza el envío o falta configuración, la cuenta queda creada y la interfaz informa el fallo.

USER inicia en `/myvehicles`, única opción lateral, y consulta vehículos e historial propios sin edición. El GET dedicado no recibe query/body; usa Bearer y el transporte fija `x-region: us-west-2`. El historial incluye abiertas/cerradas y excluye recomendaciones REJECTED. Archivar oculta recursos, sin borrar la cuenta. Borrar customer sin vehículos elimina su acceso; con vehículos se rechaza.

El schema de demo se recrea desde `supabase/schema.sql`, sin migraciones; después se ejecuta `pnpm seed:superheroes`. La recreación es destructiva para las tablas de negocio y perfiles; conserva la infraestructura Auth/Storage. El seed restaura GOD/dos MECHANIC y crea las 20 cuentas USER de los héroes, con los emails `@hero.test` del propio seed. Todas las credenciales demo usan `SEED_DEMO_PASSWORD` del `.env` raíz (no se publican en este documento). Se conservan sus árboles y casos de archivo. No ejecutar schema/seed como verificación incidental; requiere autorización explícita.

El comando unitario construye primero `@cardoc/types` para no depender de un `dist` previo; no llama a Supabase ni ejecuta las integraciones.

Las funciones privadas de ciclo de cuenta escriben Auth y negocio en una misma transacción, con identidad/sesión y propietario comprobados. Usan el mismo formato bcrypt que el seed; no requieren exponer claves administrativas al cliente. El trigger sobre Auth conserva el email inmutable y delega cambios de contraseña a Supabase Auth; el restablecimiento privado del mecánico habilita únicamente su actualización local y revoca sesiones. Los claims de rol/customer UUID se sincronizan mediante metadata administrativa al crear el vínculo, y Auth los firma al iniciar/renovar sesión. No hace falta configurar un Access Token Hook.

### Recuperación de contraseña de demostración

Variables en el único `.env` raíz: `SUPABASE_SECRET_KEY` (o `SUPABASE_SERVICE_ROLE_KEY` legacy; credencial administrativa del mismo proyecto que SUPABASE_URL; solo backend), `RESEND_API_KEY`, `RESEND_TEST_TO`, `RESEND_FROM=onboarding@resend.dev` y `FRONTEND_URL` (origen real del frontend, por ejemplo `http://localhost:3000`). `.env.example` contiene placeholders. El runtime Edge debe recibir los secretos de su proyecto; nunca usar NEXT_PUBLIC para secretos. El destinatario fijo solo cambia el sobre del correo; no modifica las cuentas.

Se usa la [API HTTP de Resend](https://resend.com/docs/api-reference/emails/send-email), sin SDK adicional. El remitente de prueba requiere que RESEND_TEST_TO sea la casilla admitida por tu cuenta Resend. El 2026-11-03 se verificó la entrega real a la casilla demo durante la prueba end to end autorizada.

`supabase/config.toml` declara `[auth.email] otp_expiry = 3600`. Para el proyecto remoto, ir a **Authentication → Sign In / Providers → Email → Email OTP Expiration**, establecer **3600 segundos** y guardar (campo de Management API: `mailer_otp_exp`). Verificado el 2026-11-03 en el dashboard remoto: ya estaba en 3600; no requirió modificación. No cambiar JWT expiry para ajustar el enlace. Supabase verifica expiración y uso único al canjearlo.

El trigger anterior bloquea updateUser para USER. Para una instalación existente, revisar/aplicar **solo** `supabase/password-recovery.sql` mediante SQL Editor; no ejecutar el schema demo destructivo. El parche permite al rol interno `supabase_auth_admin` actualizar contraseñas y conserva la inmutabilidad del email y el permiso del mecánico. Esto también permite updateUser autenticado de Supabase, cuya autorización es responsabilidad de Auth; no agrega permisos SQL a clientes. El schema demo incorpora la misma regla. Aplicado y verificado el 2026-11-03 bajo autorización de la prueba end to end; no se ejecutó el schema demo.

Las rutas `/forgot-password` y `/reset-password` quedan fuera del matcher del proxy y del layout privado para evitar redirecciones al recibir la sesión. El canje usa cookies SSR, elimina el token de la URL y no acepta tokens por query en el middleware del backend. Si se recarga tras limpiar la URL se necesita solicitar otro enlace. Si falla el cierre de sesión tras actualizar, reintentar finaliza el cierre sin repetir updateUser.
