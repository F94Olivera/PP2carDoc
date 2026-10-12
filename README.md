# carDoc

Sistema para mecánicos con clientes, vehículos, órdenes de trabajo, recomendaciones, finanzas y presupuestos PDF. Cada MECHANIC trabaja con sus propios datos; GOD puede operar sobre todos, respetando las reglas de negocio. Se usan exclusivamente datos ficticios.

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

Existen endpoints de salud, login, identidad, logout, CRUD de clientes y CRUD de vehículos con archivo/restauración, además de GET `/finances`. Los incrementos locales de propiedad, clientes/archivo, vehículos, transporte y finanzas están implementados; órdenes y PDF siguen pendientes. Finanzas incluye historial de padres archivados y usa días completos de Buenos Aires; requiere aplicar la función privada `finance_total` y sus permisos antes del deploy de la API. El schema y la API desplegada no se actualizaron con estos incrementos; ver TODO y TESTING.

## Desarrollo local

Requisitos: Node.js y pnpm compatibles con los paquetes, Docker en ejecución y Supabase CLI instalada como dependencia del repositorio. `package.json` fija pnpm 11.7.0; todavía no declara una versión común de Node mediante `engines`.

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

El seed prepara Mateo y Lucia como MECHANIC y `god.cardoc@example.test` como GOD. Las otras cuentas son `mateo.cardoc.20261006@example.test` y `lucia.cardoc.20261006@example.test`. Sus contraseñas vienen del entorno y no se imprimen. Se recrean 20 clientes, 19 vehículos, 48 órdenes, 143 ítems y 47 recomendaciones de muestra. Reejecutarlo restablece credenciales/roles de estas cuentas y revoca sus sesiones.

El seed usa acceso privilegiado para fixtures, sin registro público ni SMTP. Desplegar la función no crea tablas, no ejecuta el esquema y no copia usuarios o datos. Local y remoto son entornos independientes. Los comandos de este apartado son instrucciones de preparación manual, no pasos automáticos de verificación.

## Autenticación y uso de la API

Las rutas de OpenAPI son relativas a la URL base. `/login` recibe email/password; las rutas protegidas requieren `Authorization: Bearer <access_token>`. La función tiene `verify_jwt=false` para permitir login público; `requireAuth` protege las rutas privadas y consulta Auth, sesión y rol actual. La aplicación limita la antigüedad del token a 15 minutos. Logout revoca la sesión actual y las comprobaciones de sesión rechazan sus tokens en requests posteriores.

El frontend inicia sesión directamente con Supabase Auth y `@supabase/ssr`, que gestiona cookies y renovación. Para la API debe enviar Bearer explícito; el transporte autenticado ya se usa en clientes, pero falta extenderlo a otros módulos. Las cookies entre frontend y API no reemplazan ese token.

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
