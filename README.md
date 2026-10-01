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

### Migraciones

Las migraciones actuales del backend viven en `apps/back/drizzle` y se ejecutan al inicializar la aplicacion. No se duplican en `supabase/migrations` para evitar que el backend intente crear tablas ya existentes.

### Levantar el backend

Con Supabase corriendo:

```bash
pnpm dev
```
