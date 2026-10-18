# Performance de clientes, vehículos y órdenes — 17/10/2026

## Alcance

Medición autorizada por el usuario con curl sobre la API remota `https://lsbgegbghlgxkqxpmgyx.supabase.co/functions/v1/api`. Tres GET secuenciales por endpoint y escenario, alternando bloques de región automática y header `x-region: us-west-2`. Un login con las credenciales TEST del entorno obtuvo el Bearer, sin registrarlo. No se ejecutaron suites de integración, SQL remoto, seed, cambios de configuración ni deploy.

Cada muestra usa un proceso curl independiente con timeout de 30 segundos. Se incluyen las primeras muestras; no se identifica cold start. Los listados usan los parámetros por defecto, sin query string. Se mide tiempo total, TTFB, TLS y bytes. Tres muestras permiten una comparación exploratoria, no estimar p95/p99 ni capacidad bajo carga. No se guardaron cuerpos de respuesta ni secretos. El header regional se envió en la request; esta corrida no capturó `x-sb-edge-region` para verificar la región efectiva.

## Resultados nuevos

Los 30 GET devolvieron HTTP 200. Medianas de tiempo total en milisegundos:

| Endpoint          | Automática | Oregon solicitado | Reducción |
| ----------------- | ---------: | ----------------: | --------: |
| `/customers`      |       6359 |              1366 |     78.5% |
| `/customers/30`   |       5992 |              1297 |     78.4% |
| `/vehicles`       |       6556 |              1511 |     77.0% |
| `/vehicles/31`    |       7586 |              1519 |     80.0% |
| `/work-orders/55` |      10579 |              1809 |     82.9% |

Muestras individuales de tiempo total (ms), en orden:

| Endpoint          | Automática          | Oregon solicitado |
| ----------------- | ------------------- | ----------------- |
| `/customers`      | 6485, 6359, 6347    | 1366, 1293, 1522  |
| `/customers/30`   | 5969, 5992, 6438    | 1297, 1325, 1191  |
| `/vehicles`       | 6554, 6556, 10191   | 1511, 1436, 1548  |
| `/vehicles/31`    | 7586, 7676, 7291    | 1677, 1519, 1466  |
| `/work-orders/55` | 10579, 10293, 10777 | 1886, 1751, 1809  |

TTFB y total difieren como máximo 1 ms. El TLS terminó entre 42 y 141 ms desde el inicio de curl; los cuerpos midieron entre 227 y 3207 bytes. La demora observada está antes del primer byte; estas métricas no separan red, gateway y ejecución interna. La tercera muestra automática de vehículos subió a 10,2 s; se conserva, sin atribuir su causa.

## Opciones evaluadas en el código local

1. **Región:** el frontend ya envía `x-region: us-west-2` en `apps/front/app/lib/auth-client.ts`, y CORS ya admite ese header. No corresponde proponer agregarlo otra vez. curl sin header representa otro escenario. Supabase recomienda ejecutar cerca de la base cuando hay múltiples viajes a Postgres: [Regional Invocations](https://supabase.com/docs/guides/functions/regional-invocation). Esta selección pierde el reruteo regional automático ante una caída. La región de la base está documentada en el cierre previo; no se volvió a consultar la configuración remota.
2. **Detalles de vehículos y órdenes:** `getVehicleById` consulta vehículo y luego cliente en transacciones separadas. `getWorkOrderById` consulta orden/ítems/recomendaciones y después vehículo y cliente, también separados. Sus repositorios principales ya unen los padres y filtran actividad/propiedad. Evaluar una lectura autorizada completa en una sola transacción y retirar las relecturas redundantes del servicio, preservando reglas de archivo, GOD/MECHANIC y resultado 404. Esto requiere adaptar unitarios; la ganancia todavía no se midió.
3. **Frontera común de autenticación:** cada request llama a Auth `getUser`, abre una transacción de perfil y luego otra de dominio (o varias en detalles). Cada `withUserDatabase` configura claims, rol y sesión, además de BEGIN/COMMIT. Evaluar agrupar preparación y reducir fronteras sin perder claims locales, RLS, rol actual ni rechazo de sesión revocada. Evitar mantener una transacción abierta durante una llamada HTTP externa.
4. **Consultas:** COUNT y página son secuenciales; órdenes agrega dos SELECT de hijos. Evaluar una consulta que devuelva total y página incluso cuando la página esté vacía, y agregados de hijos sin multiplicar filas. Poner `Promise.all` sobre una sola conexión transaccional no elimina los viajes SQL. No se midieron planes SQL ni ejecución interna en esta corrida.
5. **Instrumentación antes de afinar:** agregar Server-Timing y Pino por etapa: Auth, espera/adquisición de conexión, perfil, dominio y duración total. No registrar tokens ni datos personales. Sin esa información no se puede atribuir el residual a Auth, pool, RLS o consultas con precisión.
6. **Pool y capacidad:** `max: 1` puede producir cola dentro de un worker con requests concurrentes. Esta prueba secuencial no demuestra saturación. Medir concurrencia acotada antes de aumentar conexiones; considerar el límite del pooler y los workers Edge. Conservar por ahora la configuración.
7. **Índices/RLS o cambio de arquitectura:** revisar planes con volumen representativo antes de modificar índices/políticas. Una RPC de lectura o un backend persistente junto a la base podrían reducir intercambios y arranques, pero aumentan alcance y mantenimiento. No hay evidencia actual que justifique empezar por una migración de plataforma.

## Prioridad propuesta

Primero, tomar como referencia el escenario regional que ya usa el frontend. Después instrumentar etapas y consolidar lecturas de detalles, empezando por órdenes. Continuar con la preparación compartida de transacciones y las consultas de listados. Medir cada cambio por separado con los mismos IDs y escenario. Mantener los controles de autorización y no agregar caché de permisos/sesiones que demore la revocación.

No se modificó código de aplicación ni se atribuyen mejoras permanentes al despliegue. La revisión estática corresponde al árbol local; esta corrida no cotejó el bundle remoto con él.

## Navegador local — recorrido posterior con sesión iniciada

Se abrió el frontend existente en localhost:3000, se inició sesión con la cuenta TEST del entorno y se navegó desde Presupuesto a Clientes y Vehículos. La configuración pública apunta directamente a la API/Auth remotos del mismo proyecto. Instrumentación temporal en el transporte con performance.now(), restaurada al terminar. Se midió desde fetch hasta headers, incluyendo preflight cuando corresponda; no incluye render ni descarga/parseo del cuerpo.

Primera navegación: Clientes 1884 ms y Vehículos 2049 ms, ambos HTTP 200 con header de respuesta `x-sb-edge-region: us-west-2`. Segunda navegación a Clientes: 1944 ms, HTTP 200, Oregon. La espera previa de sesión fue 0 ms en las tres cargas. Hubo una llamada de listado por navegación en esta muestra; no se reprodujo duplicación del listado por Strict Mode. En el ingreso inicial se observaron dos getUser de 314 y 550 ms; no corresponden al tiempo de cada navegación posterior. No se midió duración total del login.

Contraste curl desde la misma máquina, con Origin localhost y región solicitada: `/customers` 1326 ms, `/vehicles/31` 1385 ms y `/work-orders/55` 1768 ms; las tres HTTP 200 y región efectiva Oregon. OPTIONS de `/customers`, reproduciendo los headers de preflight del navegador, devolvió 204 en 702 ms y región São Paulo. La request preflight anuncia `x-region` en Access-Control-Request-Headers, pero no transporta su valor. No hubo Access-Control-Max-Age en la respuesta. Esta muestra OPTIONS es independiente: no constituye un desglose exacto del fetch del navegador.

El header regional funciona; la latencia residual no está resuelta. La centralización del transporte realizada antes de este recorrido conservó un header existente, sin optimizar el backend remoto. Opciones concretas: cachear preflight con un Max-Age explícito (requiere cambio y publicación backend), instrumentar backend y reducir viajes a Postgres. El detalle de vehículo espera vehículo y cliente secuenciales; el de orden espera orden, vehículo y cliente. El listado general de órdenes hace un listado de vehículos y luego pedidos por vehículo. Esto puede amplificar el tiempo de pantalla, pero no explica por sí solo el tiempo de una request individual de Clientes. No se ha medido aquí el impacto de compilación inicial de Next ni el navegador habitual del usuario.

## Optimización publicada — API v9

Implementado y publicado en el proyecto carDoc `lsbgegbghlgxkqxpmgyx`, comprobado ACTIVE_HEALTHY y base en Oregon. API **v9 ACTIVE**; entrypoint y bundle remotos recuperados y comparados exactamente con los archivos del build local. Se conserva verify_jwt=false y autenticación propia en cada ruta privada. Copia previa de API v8 en `~/.codex/backups/cardoc-performance-2026-10-17/api-v8.json`, fuera del repo, directorio 0700 y archivo 0600. Sin schema, seed, secretos ni deploy frontend.

Cambios: OPTIONS permite cachear permisos CORS 600 segundos. El detalle de vehículo lee su cliente en la misma transacción y evita una transacción adicional; el detalle de orden obtiene sus padres en el SELECT principal y evita dos transacciones adicionales. Los servicios validan actividad/propiedad sobre el snapshot autorizado; se conservan RLS, claims, sesión y rol actual. Los mappers preservan las respuestas públicas. Los listados y las llamadas HTTP de Auth no cambiaron; el detalle de orden conserva las dos lecturas de hijos dentro de su transacción.

### Verificación y curl posterior

87/87 unitarios, lint, TypeScript, build completo, formato y git diff --check aprobados. Cinco unitarios adicionales respecto de los 82 iniciales verifican middleware CORS, consultas de detalle con ámbito y snapshot, y ausencia de relecturas de padres. No se crearon ni ejecutaron integraciones. Solo login, GET de los cinco endpoints autorizados y OPTIONS de medición contra la API remota; no se probó todo el CRUD remoto.

Tres muestras por endpoint, curl independiente con Origin localhost y x-region Oregon. Los 15 GET devolvieron HTTP 200 y región efectiva us-west-2; sin propiedades internas vehicle/customer/order en el nivel raíz de la respuesta. Comparación exploratoria con las tres muestras Oregon anteriores (no simultáneas):

| Endpoint          | Mediana v8 (ms) | Mediana v9 (ms) | Muestras v9 (ms) |
| ----------------- | --------------: | --------------: | ---------------- |
| `/customers`      |            1366 |            1370 | 1370, 1355, 1988 |
| `/customers/30`   |            1297 |            1276 | 1329, 1276, 1122 |
| `/vehicles`       |            1511 |            1548 | 1548, 1455, 1873 |
| `/vehicles/31`    |            1519 |            1336 | 1336, 2104, 1320 |
| `/work-orders/55` |            1809 |            1868 | 1999, 1702, 1868 |

OPTIONS posterior: HTTP 204, Access-Control-Max-Age 600 confirmado, 2711 ms, región automática sa-east-1. Es la primera muestra posterior al despliegue; no se atribuye a un cold start sin evidencia. El cambio no evita el primer preflight y curl no reutiliza la caché CORS del navegador. [MDN documenta el permiso de caché y sus límites](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Max-Age).

### Navegador posterior y límites

Con sesión vigente contra Supabase remoto, Clientes dio 3051 ms inicialmente, 1987 ms tras recarga y 1937 ms al volver desde Vehículos. Vehículos dio 2015 ms. Todos HTTP 200 con región Oregon. Misma medición temporal fetch-a-headers, retirada al terminar. No se midió la cantidad de OPTIONS para demostrar hits de caché.

Vehículo mejora alrededor de 12% en la mediana curl, pero tres muestras no permiten separar el efecto de la variación de red/runtime. Órdenes y listados no muestran una mejora general; las navegaciones repetidas continúan cerca de dos segundos. No se presenta la publicación como solución completa de la latencia. Siguiente trabajo: instrumentar backend por etapa y medir Auth, conexión, RLS y dominio antes de modificar la frontera compartida o el pool.
