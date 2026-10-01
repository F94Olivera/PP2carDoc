# PP2 carDoc

## Desarrollo local con Supabase

Este repositorio usa Postgres a traves de `DATABASE_URL`. Para desarrollo local, Supabase levanta Postgres en el puerto local `54322`.

### Requisitos

- Docker Desktop o un runtime Docker compatible.
- Dependencias del repo instaladas con `pnpm install`.

### Levantar Supabase

Desde la raiz del repositorio:

```bash
pnpm supabase:start
```

Tambien podes llamar directamente a la CLI instalada en el proyecto:

```bash
pnpm supabase start
```

Supabase Studio queda disponible en `http://127.0.0.1:54323`.

### Variables locales del backend

El backend lee el archivo `.env` de la raiz del repositorio. Para Supabase local, la conexion esperada es:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DATABASE_SSL=false
PORT_BACK=3001
```

`DATABASE_SSL=false` es necesario porque el Postgres local de Supabase no usa SSL. El archivo `.env` esta ignorado por Git y no debe commitearse.

### Levantar el backend

Con Supabase corriendo:

```bash
pnpm dev
```

### Autenticación

Agregar al único .env de la raíz:

```dotenv
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=<clave-publicable-del-proyecto>
```

Para desarrollo local también puede usarse la clave anon local como valor de SUPABASE_PUBLISHABLE_KEY. Obtener las claves con la CLI de Supabase; no usar service_role ni una clave secreta para este login.

POST /login recibe {"email":"usuario@example.com","password":"contraseña"} y devuelve user y session. La sesión contiene access_token y refresh_token; el cliente debe gestionar su almacenamiento y renovación mediante Supabase Auth. El contrato está en docs/openapi.yaml.

El rate limit lo aplica Supabase Auth. Al usar el wrapper, Supabase normalmente ve la IP del backend y el límite se comparte entre usuarios. Los endpoints /logout y /auth/me todavía están pendientes.

Usar .env.example como referencia para crear el único .env de la raíz. Reemplazar la clave publicable con la del proyecto; para Supabase remoto, actualizar también la URL y la conexión Postgres, y usar DATABASE_SSL=true.
