# PP2 carDoc

Monorepo con frontend Next.js (`apps/front`), API Express ejecutada como Supabase Edge
Function (`apps/back/src`) y contratos compartidos (`packages/types`).

## Desarrollo local

Requisitos: Node.js compatible con el proyecto, pnpm y Docker en ejecución. Desde la raíz:

```bash
pnpm install
# Crear el único .env a partir de .env.example y configurar los valores locales.
pnpm supabase:start
pnpm dev
```

En otra terminal:

```bash
pnpm dev:web
```

- API: `http://127.0.0.1:54321/functions/v1/api`
- Health: `http://127.0.0.1:54321/functions/v1/api/ping`
- Studio: `http://127.0.0.1:54323`
- Frontend: `http://localhost:3000`

`pnpm dev:api` es equivalente a `pnpm dev`. El backend ya no se sirve en el puerto 3001.
La CLI ejecuta el runtime Edge local dentro de Docker. El script compila y observa el
backend; cada cambio genera el bundle que recarga la función. Durante la recarga puede
haber una respuesta transitoria 502: esperar a que el runtime esté listo antes de probar.

El código se mantiene en `apps/back/src`, incluidos controllers, services, repositories,
schemas, mappers y models. El archivo `supabase/functions/api/index.ts` carga el bundle
ignorado por Git en `supabase/functions/api/dist/index.js`. `pnpm --filter @cardoc/back build`
lo regenera. No editar ni commitear ese archivo generado. Esbuild incluye el código propio
y deja imports npm con las versiones exactas declaradas en el paquete backend; Supabase
resuelve esas dependencias en Deno. Al cambiar dependencias, reiniciar `pnpm dev`.

## Configuración y datos

Se usa solamente el `.env` de la raíz, ignorado por Git. La CLI lo recibe explícitamente
mediante `--env-file .env`. Obtener las claves públicas locales con `pnpm supabase status`.

El frontend necesita:

```dotenv
NEXT_PUBLIC_API_URL=http://127.0.0.1:54321/functions/v1/api
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave-publicable-local>
```

El runtime Edge inyecta su propio `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS` (si está
disponible), `SUPABASE_ANON_KEY` y `SUPABASE_DB_URL`. Las advertencias de la CLI que ignoran
variables `SUPABASE_*` del `.env` son esperadas: el backend debe usar la dirección interna
de Docker, no el `127.0.0.1` del navegador. No configurar claves secretas en `NEXT_PUBLIC_*`.

Drizzle y Postgres.js se conservan para los repositorios de datos. La conexión se inicializa
cuando un repositorio llama a `initializeDatabase()`, sin bloquear los endpoints de Auth.
Puede usarse `EDGE_DATABASE_URL` como override del pooler de producción; por defecto se usa
`SUPABASE_DB_URL` del runtime. `DATABASE_URL` queda como fallback para herramientas ejecutadas
fuera de Docker, como el seed. En local, `DATABASE_SSL=false`; en remoto, SSL está activado
por defecto. No subir el `.env` local completo como secretos remotos.

Los usuarios y datos locales son independientes de los remotos. Las migraciones de base de
datos se aplican por separado; desplegar la función no crea tablas ni copia usuarios/datos.
El seed de superhéroes requiere que el esquema correspondiente ya exista.

## Autenticación y contratos

La API ofrece `POST /login`, `GET /ping`, `GET /auth/me` y `POST /logout`, relativos a la URL
base. El contrato está en `docs/openapi.yaml`.

`/login` recibe solamente email y password. `/auth/me` y `/logout` requieren
`Authorization: Bearer <access_token>`. La función tiene `verify_jwt=false` para permitir
login sin sesión; todas las rutas protegidas verifican el token en `requireAuth` con
`auth.getUser`. No se confía en claims enviados por el cliente ni se usa una clave admin.
CORS admite Bearer explícito, no cookies entre orígenes. Las respuestas de Auth usan
`Cache-Control: no-store`.

El frontend sigue autenticando directamente con Supabase Auth y `@supabase/ssr`, que gestiona
cookies y renovación. No necesita cambiar a `/login` del backend. Ambos deben apuntar al
mismo proyecto. Cerrar sesión revoca el refresh token de esa sesión; un access token emitido
puede seguir siendo válido hasta su vencimiento.

Los endpoints de clientes, vehículos, órdenes, finanzas y PDF siguen pendientes. Las
pantallas importadas conservan contratos anteriores; esta migración de runtime no los
implementa. Drizzle no hereda automáticamente la identidad del usuario: el aislamiento por
taller requiere autorización explícita.

## Verificación de login local y remoto

Crear un usuario de prueba en Auth del entorno a verificar, y configurar en el `.env` raíz:

```dotenv
TEST_LOGIN_EMAIL=<email-de-prueba>
TEST_LOGIN_PASSWORD=<contraseña-de-prueba>
```

```bash
pnpm --filter @cardoc/back test:auth
```

La prueba verifica ping, preflight CORS, validación de JSON y tamaño, rechazo de campos extra,
credenciales inválidas y solicitudes sin token, login real, `/auth/me` y logout. No imprime
contraseñas ni tokens y revoca su propia sesión al terminar.

Para remoto, usar credenciales pertenecientes al proyecto remoto y ejecutar:

```bash
TEST_API_URL=https://lsbgegbghlgxkqxpmgyx.supabase.co/functions/v1/api pnpm --filter @cardoc/back test:auth
```

## Desplegar solamente el backend

Primero verificar y pushear los cambios:

```bash
pnpm lint
pnpm typecheck
pnpm build
# Ejecutar también el formato enfocado y git diff --check antes del commit.
```

Con la CLI autenticada mediante `pnpm supabase login`, desplegar:

```bash
pnpm deploy:api --project-ref lsbgegbghlgxkqxpmgyx
```

El comando reconstruye el mismo bundle probado localmente y despliega únicamente `api`.
No despliega el frontend, no migra la base y no publica el `.env`. Los secretos personalizados,
si se necesitan, se configuran en el dashboard del proyecto. Después ejecutar la prueba de
login remoto. En CI se necesita `SUPABASE_ACCESS_TOKEN` como secreto del pipeline.

El frontend se publica por separado en un hosting para Next.js, con la URL remota de la API
y las claves públicas del mismo proyecto Supabase.
