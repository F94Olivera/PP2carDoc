# Pruebas y verificación

## Política obligatoria

Las pruebas nuevas son unitarias por defecto: sin Supabase real, APIs externas ni base viva. Usar entradas aisladas y dobles de Auth/repositories. Un pedido genérico de correr tests o verificar cambios autoriza **solo unitarios**.

Conservar las tres integraciones en `apps/back/tests/integration`. **No ejecutarlas salvo pedido explícito del usuario**, ni en local ni en remoto. No incluirlas en agregados, hooks, CI, despliegues o verificación habitual; tampoco reemplazarlas por requests o SQL manuales equivalentes. Protege el rate limit de Supabase.

Antes de crear una nueva integración, decir: "mira que conviene sumar el test como integracion tambien", explicar cobertura concreta y costo de servicios externos, y esperar aprobación. Aprobar creación no autoriza ejecución. Modificar documentación de un escenario tampoco autoriza probarlo contra un servicio.

## Unitarios existentes y comandos

Desde la raíz:

```bash
pnpm test
# Equivalente explícito:
pnpm test:unit
# Solo workspace backend:
pnpm --filter @cardoc/back test:unit
```

Ejecutar una alternativa, no las tres para repetir el mismo resultado. Todos apuntan actualmente a `tsx --test tests/*.test.ts` del backend y excluyen el directorio de integración.

`apps/back/tests/authorization.test.ts` contiene ocho casos: parseo de identidad ya verificada, límite de 15 minutos, identidad distinta, tokens viejos/futuros, claims de sesión/rol inválidos, metadata no confiable, elección de propietario/schemas estrictos y clasificación de sesión revocada. Algunos temas comparten caso. No prueban firmas JWT reales, HTTP completo, RLS ni transacciones reales.

El caso actual que permite elegir otro propietario como GOD y los schemas de edición deben revisarse al separar alta de transferencia. Un unitario existente no demuestra conformidad con las reglas nuevas.

## Comprobaciones de código

Según el alcance, ejecutar formato enfocado, lint, TypeScript y unitarios. Antes de un commit completar además build y diff-check; no crear el commit si falla un check configurado.

```bash
pnpm exec prettier <archivos-modificados> --check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
git diff --check
```

`<archivos-modificados>` es un marcador, no un argumento literal. `pnpm build` construye todos los workspaces configurados; no es una prueba funcional. Para cambios exclusivamente Markdown, comprobar formato, enlaces locales y diff; no iniciar servicios ni ejecutar tests/build sin una razón adicional. No se requiere commit para revisar cambios locales.

## Escenarios que deben cubrirse

Esta matriz es un plan, **no evidencia de ejecución**. Salvo inventario explícito anterior, la cobertura queda pendiente. Las reglas completas están en REQUIREMENTS.

| Área            | Éxito                                                                               | Validación, permisos y errores                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth            | Login, identidad, renovación y logout de la sesión actual.                          | Credenciales incorrectas, token ausente/alterado/vencido, sesión revocada, metadata maliciosa, rol obsoleto, 429/503.                              |
| Propiedad       | MECHANIC opera lo propio; GOD opera globalmente y crea para MECHANIC.               | Recurso ajeno devuelve 404; rechazar propietario GOD, inexistente o transferencia incluso como GOD; impedir reasignar padres.                      |
| Clientes        | Alta, detalle, edición, listado paginado, archivo/restauración y borrado sin hijos. | Claves extra, campos generados, nombre vacío, ID inválido, documento duplicado por mecánico, conflicto al borrar con vehículos.                    |
| Archivo         | Ocultar clientes y vehículos no operativos; administración explícita autorizada.    | Alta de vehículo bajo cliente archivado y alta de orden bajo padre no operativo bloqueadas aunque se envíen IDs directos.                          |
| Vehículos       | CRUD y patente única por mecánico.                                                  | Colisión normalizada dentro del mismo mecánico; permitir la misma patente entre mecánicos; año/kilometraje/unidad inválidos y borrado con órdenes. |
| Órdenes         | Crear abierta, editar abierta/cerrada, cerrar y reabrir; listar por vehículo.       | Falta entrada/problema, salida anterior, intento de crear cerrada, padre ajeno/inactivo, IDs inconsistentes, cambio de vehículo, paginación.       |
| Hijos de orden  | Guardado atómico y cascada al eliminar.                                             | Fallo intermedio no deja escrituras parciales; ítems con cantidad/precio inválidos; no afectar otras órdenes.                                      |
| Recomendaciones | Ausentes o múltiples, estados y prioridad preservados.                              | Mapear mayúsculas/minúsculas; rechazar enums inválidos; aceptar no crea ítems.                                                                     |
| Finanzas        | Suma por salida de cerradas, alcance MECHANIC/GOD, total cero.                      | Excluir abiertas; límites del período; no duplicar por recomendaciones; editar/reabrir/eliminar cambia total; resolver historial archivado.        |
| PDF             | Generación y descarga desde formulario independiente.                               | Datos inválidos, ausencia de sesión, error al generar, headers de descarga y archivo legible; no crear persistencia.                               |
| Frontend        | Recorridos, carga, vacío, errores y sesión expirada.                                | Bearer en cada módulo; archivo usa ruta existente; no truncar datos por leer solo primera página; no confirmar éxito ante fallo.                   |

Para unitarios de persistencia usar dobles y probar coordinación/reglas. No afirmar que esos dobles verifican RLS o cascadas de Postgres. Si hace falta verificar esas garantías en integración, aplica la aprobación previa de esta política.

## Integraciones existentes — solo por solicitud explícita

Requieren API, Auth y base del mismo proyecto de demo. Configurar en `.env` raíz las credenciales ficticias apropiadas; no imprimir contraseñas ni tokens. No ejecutar schema ni seed automáticamente como preparación de tests.

| Comando desde raíz                              | Archivo                                     | Cobertura y efectos                                                                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @cardoc/back test:auth`          | `tests/integration/smoke-auth.mjs`          | Salud, CORS, JSON/límites, login real, identidad y rechazo tras logout. Abre y revoca su sesión.                                                                                                     |
| `pnpm --filter @cardoc/back test:customers`     | `tests/integration/smoke-customers.mjs`     | Lista/detalle, paginación, archivo, autorización y timestamps contra expectativas de base; lecturas y sesión de prueba.                                                                              |
| `pnpm --filter @cardoc/back test:authorization` | `tests/integration/smoke-authorization.mjs` | Tres cuentas demo contra API, Auth, Data API y SQL restringido; CRUD, RLS heredada, concurrencia, roles, tokens y logout. Escribe fixtures temporalmente, restaura roles/metadata y revoca sesiones. |

Los dos primeros usan `TEST_LOGIN_EMAIL` y `TEST_LOGIN_PASSWORD`; `TEST_API_URL` permite seleccionar la API. La suite multiusuario usa las cuentas del seed y `SEED_DEMO_PASSWORD`. Los scripts cargan `../../.env` desde el workspace backend.

La suite de autorización aún incluye transferencias permitidas por la implementación anterior: debe alinearse antes de considerarla una verificación de las reglas finales. No sumar un comando agregado que ejecute las tres.

## Resultados y límites

| Fecha      | Revisión                                                                       | Resultado / límite                                                                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17/10/2026 | Lectura de código, contratos, modelos, scripts y Markdown para reorganización. | Se identificaron diferencias en propiedad, archivo, transporte Bearer, contratos de órdenes/recomendaciones y rutas. Registradas en TODO. Sin cambios de código ni servicios externos.                      |
| 17/10/2026 | Verificación documental de esta reorganización.                                | Formato Prettier correcto en los siete Markdown editados/creados; 21 enlaces locales con destino existente; `git diff --check` sin errores. Diff limitado a Markdown (incluida la eliminación de FLOWS.MD). |
| 17/10/2026 | Diagnóstico histórico de performance.                                          | Ver informe en docs; muestras y límites propios. No demuestra conformidad con las reglas nuevas ni el estado del despliegue actual.                                                                         |

En la reorganización documental no se ejecutaron unitarios, integraciones, build, seed ni schema. En la preparación posterior del commit se ejecutaron y aprobaron formato enfocado, `pnpm lint`, `pnpm typecheck`, `pnpm build` y `git diff --check`; no se ejecutaron unitarios ni integraciones. Tampoco se verificó el despliegue remoto. Registrar futuras ejecuciones con fecha, comando, resultado, alcance y restricciones; no transformar escenarios planeados en resultados aprobados.
