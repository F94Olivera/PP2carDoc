# Diagnóstico de performance — 17 de octubre de 2026

La principal demora medida es la comunicación entre regiones, amplificada por las consultas secuenciales del backend. La API remota se ejecutó en `sa-east-1` y el pooler configurado pertenece a `us-west-2`. Forzar **solamente las invocaciones de prueba** a `us-west-2` redujo la mediana de `/customers` de **6112 ms a 1169 ms (80,9%)**, sin desplegar ni cambiar la base.

## Entorno y metodología

- Frontend iniciado con `pnpm dev:web`, en `http://localhost:3000`; su configuración actual apunta a la API y Auth remotos.
- Docker estaba apagado. Se inició Docker Desktop y luego `pnpm dev`, que sirve el runtime Edge en `http://127.0.0.1:54321/functions/v1/api`.
- El runtime Edge local inyecta el Auth del proyecto local. Para comparar usando las credenciales y la base **remotas ya configuradas**, también se ejecutó el mismo código fuente Express con Node/tsx en `http://127.0.0.1:3001/api`. Esa columna no representa Deno/Edge local.
- API remota: `https://lsbgegbghlgxkqxpmgyx.supabase.co/functions/v1/api`.
- Se usaron `TEST_LOGIN_EMAIL` y `TEST_LOGIN_PASSWORD` del `.env`, sin incluir credenciales ni tokens en este documento.
- Cinco requests secuenciales por endpoint y escenario, con procesos curl independientes. Se midieron tiempo total, TTFB, DNS, TCP, TLS y bytes. No es una prueba de carga ni permite estimar percentiles de producción.
- Todos los endpoints de la tabla devolvieron HTTP 200. `/login` se midió con POST; el resto con GET y Bearer cuando corresponde. Se tomó el ID 24 de la respuesta del listado.
- El listado de curl usó `page=1&pageSize=100`; devolvió diez clientes visibles. El navegador usó `pageSize=10`.
- Se incluyó la primera muestra de cada serie; no se garantiza que sea un arranque en frío. No se verificó que el despliegue remoto corresponda exactamente al árbol de trabajo local, que ya contenía cambios del usuario.

## Resultados de curl

Medianas en milisegundos, incluyendo conexión HTTP y descarga:

| Endpoint                         | Remota automática, São Paulo | Express local → Supabase remoto | Remota forzada, Oregon |
| -------------------------------- | ---------------------------: | ------------------------------: | ---------------------: |
| `/ping`                          |                          494 |                               1 |                    813 |
| `/login`                         |                         4438 |                            2943 |                   1228 |
| `/auth/me`                       |                         4179 |                            2384 |                   1027 |
| `/customers?page=1&pageSize=100` |                         6112 |                            5196 |                   1169 |
| `/customers/24`                  |                         5805 |                            4690 |                   1100 |

Muestras individuales, en ms y en orden de ejecución:

| Endpoint        | Remota automática            | Express local                | Remota Oregon                |
| --------------- | ---------------------------- | ---------------------------- | ---------------------------- |
| `/ping`         | 794, 494, 472, 490, 505      | 13, 1, 1, 1, 1               | 1699, 1512, 736, 813, 698    |
| `/login`        | 5536, 4438, 4336, 4412, 4445 | 5516, 2714, 2923, 2943, 3101 | 1360, 1393, 1134, 1228, 1114 |
| `/auth/me`      | 4195, 4179, 4184, 4124, 4153 | 2374, 2384, 2357, 2489, 2569 | 1026, 1025, 1278, 1027, 1136 |
| `/customers`    | 6108, 6095, 6112, 6146, 6164 | 5325, 5377, 4990, 5196, 5187 | 1169, 1244, 1323, 1075, 1076 |
| `/customers/24` | 5805, 5757, 5989, 7764, 5744 | 4591, 4690, 4984, 4740, 4575 | 1100, 1029, 1111, 1193, 1018 |

En la API remota el tiempo total fue prácticamente igual al TTFB: el cuerpo de `/customers` era de unos 3,5 KB y su descarga no explica los segundos de espera. DNS/TCP/TLS tampoco explican la diferencia entre regiones.

La región se verificó con el header de respuesta `x-sb-edge-region`. La segunda serie agregó `x-region: us-west-2` a curl; no modificó el despliegue. La documentación oficial describe esta opción y recomienda comparar la función cerca de la base cuando existen múltiples viajes a Postgres: [Regional Invocations](https://supabase.com/docs/guides/functions/regional-invocation).

## Navegador real

Se inició sesión desde la pantalla `/login`, se abrió Clientes desde la navegación y se hicieron dos recargas medidas. El login del front usa **Supabase Auth directamente**, no el endpoint `/login` del backend; por eso el tiempo de POST `/login` de curl no representa el login visual.

Se instrumentó temporalmente `fetchAuthenticated` para medir con `performance.now()` desde el inicio de `fetch` hasta recibir los headers de respuesta. Ese intervalo incluye la espera de la request y el preflight si ocurre, pero excluye la obtención/renovación previa de la sesión, parseo completo de JSON y renderizado posterior. La instrumentación se retiró y se restauró el archivo exactamente a su estado previo.

| Carga de Clientes | Request 1 | Request 2 |
| ----------------- | --------: | --------: |
| Primera           |   6641 ms |   6875 ms |
| Segunda           |   6449 ms |   6529 ms |

Las cuatro respuestas fueron HTTP 200. Se visualizaron los diez clientes. Las dos requests de cada carga comenzaron con menos de 1 ms de diferencia. Es consistente con la doble ejecución de efectos en desarrollo/Strict Mode: `customers/page.tsx` inicia `loadCustomers` en un efecto mediante `queueMicrotask`, sin cancelación ni deduplicación. No se comprobó el comportamiento en un build de producción. Tampoco se midió desde el navegador la región forzada; esa comparación se hizo con curl.

## Desglose de Auth y Postgres desde esta máquina

Se ejecutaron las funciones del repositorio para Auth y transacciones de lectura con claims y rol `authenticated`, conservando RLS y validación de sesión. No se modificaron clientes ni esquema.

| Operación                                                         | Tiempo observado |
| ----------------------------------------------------------------- | ---------------: |
| Supabase Auth `signInWithPassword` directo                        |           354 ms |
| Supabase Auth `getUser` directo                                   |           261 ms |
| Primer `SELECT 1`, incluida conexión/TLS a Postgres               |          2322 ms |
| `SELECT 1` con conexión abierta, tres muestras                    | 232, 313, 296 ms |
| Transacción de perfil completa, dos muestras                      |    2149, 2116 ms |
| Transacción de clientes, incluida una consulta EXPLAIN adicional  |    2465, 2482 ms |
| Ejecución interna del SELECT de clientes con RLS, EXPLAIN ANALYZE |   36,9 y 37,3 ms |

Los pasos `SET LOCAL ROLE` y `session_active` tardaron aproximadamente 230–237 ms cada uno; el COUNT y SELECT de clientes, 271–278 ms por llamada. El primer paso de una transacción y el SELECT de perfil tardaron alrededor de 470 ms; esos tiempos incluyen overhead del protocolo/transacción y no deben interpretarse como ejecución SQL pura.

El EXPLAIN se tomó sobre `SELECT * FROM public.customers WHERE is_active=true ORDER BY id LIMIT 100` bajo la identidad autenticada y sus políticas RLS. No incluye el filtro explícito adicional por propietario que agrega el repositorio para MECHANIC, ni mide el endpoint completo. Por eso es evidencia de una consulta de decenas de milisegundos, no una medición exacta de cada query del despliegue.

## Dónde se acumula el tiempo

1. `requireAuth` llama a `getCurrentUser` en cada request protegida. Se hace una llamada HTTP a Auth y una transacción para leer el perfil.
2. `withUserDatabase` configura claims, configura rol, verifica la sesión y ejecuta la operación, además del inicio/cierre de transacción. Son varios intercambios secuenciales con la base.
3. `/customers` abre después otra transacción, repite esa preparación y hace COUNT y SELECT secuenciales. `/customers/:id` también abre otra transacción.
4. `database.ts` usa `max: 1`: dentro de un mismo proceso/worker, las operaciones concurrentes comparten una sola conexión. La duplicación del front puede sumar trabajo/espera; no se midió saturación y no se atribuye a esto toda la demora.
5. La distancia São Paulo–Oregon encarece repetidamente esos pasos. La prueba cambiando solo la región produjo la mayor mejora observada.

## Orden recomendado de trabajo

1. **Alinear la región de ejecución de la API con la base, `us-west-2`, y repetir las mediciones.** La mejora ya está demostrada en curl. En el front, agregar el header `x-region` también requiere admitirlo en CORS. La alternativa `forceFunctionRegion` en el query string hoy devuelve HTTP 400 en `/customers`, porque la validación rechaza parámetros desconocidos: se verificó y no debe agregarse sin adaptar ese límite.
2. **Reducir viajes secuenciales a Postgres.** Evaluar reutilizar una transacción por request para sesión/perfil/operación, agrupar preparación y combinar count/listado cuando corresponda. Conservar claims locales a la transacción, RLS y el rechazo inmediato de sesiones revocadas; no eliminar controles para ganar tiempo.
3. **Evitar requests duplicadas y carreras de estado en Clientes.** Revisar cleanup, deduplicación y cancelación del efecto; verificar en producción antes de cuantificar el beneficio.
4. **Agregar medición por etapa**, por ejemplo `Server-Timing` y logs Pino con Auth, adquisición de conexión, perfil y consulta. Medir concurrencia antes de cambiar `max: 1`.
5. **Revisar políticas e índices con mayor volumen**, después de corregir la ubicación. La muestra actual es pequeña y no descarta problemas futuros de RLS/COUNT con más datos.

No se aplicaron optimizaciones permanentes ni se desplegó. Los únicos cambios permanentes de este diagnóstico son este informe. Los servicios iniciados quedan disponibles para inspección: front en 3000, Express de diagnóstico en 3001 y runtime Edge local en 54321.
