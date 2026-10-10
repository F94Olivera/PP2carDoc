# Frontend de carDoc

Aplicación Next.js/React/Tailwind del monorepo, paquete `@cardoc/front`.

La instalación y configuración se realizan desde la raíz según [README](../../README.md), usando exclusivamente el `.env` raíz. Para iniciar el frontend:

```bash
pnpm dev:web
```

Disponible en http://localhost:3000. Auth del navegador, URL de la API y base deben corresponder al mismo proyecto Supabase. No colocar secretos en variables `NEXT_PUBLIC_*`.

Las pantallas existentes cubren clientes, vehículos, órdenes, finanzas y presupuesto, pero varios endpoints todavía faltan. El estado real y las reglas están en [REQUIREMENTS](../../REQUIREMENTS.md); el trabajo pendiente, en [TODO](../../TODO.md), y su orden en [STEPBYSTEP](../../STEPBYSTEP.md).

Supabase SSR maneja sesión/cookies del frontend. Las requests a la API deben usar Bearer mediante `fetchAuthenticated`; su adopción completa está pendiente. No asumir que `credentials: include` autentica una llamada a la API Edge.

Validación y política de pruebas: [TESTING](../../TESTING.md). Las integraciones requieren solicitud explícita.
