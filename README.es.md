# MealAgenda — Web

[English](README.md)

MealAgenda es una aplicación web para gestionar recetas e ingredientes, planificar comidas, crear listas de la compra, controlar las existencias del hogar y compartir datos seleccionados con un hogar.

Este repositorio contiene el cliente React y TypeScript. La API REST se encuentra en [recetas-node](https://github.com/lauraschoerken/recetas-node). Consulta [ARCHITECTURE.md](ARCHITECTURE.md) para conocer los detalles de implementación.

## Requisitos

- Para la última verificación local se utilizaron Node.js 24.14.1 y npm 11.11.0. Vite 7 requiere Node.js 20.19+ o 22.12+.
- Una API local de MealAgenda para las funciones que leen o modifican datos del servidor.
- PostgreSQL es un requisito de la API, no una dependencia directa del cliente web.

## Desarrollo local

Arranca la API en el puerto `3002` y después ejecuta:

```bash
git clone --branch develop https://github.com/lauraschoerken/recetas-react.git
cd recetas-react
npm ci
npm run dev
```

El sitio de desarrollo se sirve en `http://localhost:3000` por defecto. La aplicación desplegada requiere una cuenta real y no es un entorno de pruebas; nunca dirijas hacia ella tests automatizados ni comandos locales de limpieza.

## Configuración

Vite lee el directorio heredado `enviroments/`, cuyo nombre incorrecto se mantiene intencionadamente. Los valores comunes están en `enviroments/.env` y las variantes por modo en `enviroments/dev/.env.dev` y `enviroments/prod/.env.prod`. No sobrescribas valores locales o específicos de despliegue al preparar una contribución.

Todos los valores `VITE_*` se incluyen en el código del navegador y nunca deben contener contraseñas, tokens ni otros secretos.

| Variable | Obligatoria | Finalidad |
| --- | --- | --- |
| `VITE_API_URL` | Desarrollo | Destino del proxy `/api` de Vite, normalmente `http://localhost:3002`. No es automáticamente la URL utilizada por las peticiones del navegador. |
| `VITE_DEV_PORT` | Desarrollo | Puerto local de Vite, normalmente `3000`. |
| `VITE_API_MODE` | Sí | Comportamiento de la API. La aplicación actual usa normalmente `api`; `mock` desactiva la URL base. |
| `VITE_API_BASE` | No | URL base opcional y visible en el navegador. Déjala vacía al utilizar el proxy de Vite del mismo origen. |
| `VITE_API_PREFIX` | No | Prefijo de rutas de la API; por defecto `/api`. |
| `VITE_APP_NAME` | No | Nombre de la aplicación utilizado en compilación; por defecto `App`. |

Reinicia Vite después de cambiar la configuración.

## Comprobaciones, tests y build

```bash
npm run lint
npm run test:run
npm run build
```

Comandos adicionales:

```bash
npm run test:coverage
npm run preview
npm run test:e2e
npm run test:e2e:open
```

Los tests unitarios usan Vitest. Cypress espera el frontend en el puerto `3000` y una API local de pruebas dedicada en el `3001`, arrancada con los endpoints de test habilitados. Las rutas de limpieza de Cypress eliminan datos de prueba: nunca ejecutes los E2E contra producción ni contra una base compartida.

### Estado de la verificación

El 6 de noviembre de 2026 se validó una copia sin dependencias mediante `npm ci`: la build de producción terminó correctamente y pasaron los 38 tests unitarios. `npm run lint` todavía informa de 80 errores y 21 avisos en código existente de la aplicación; no se ocultan ni se presentan como una comprobación correcta. Los E2E no se ejecutaron porque no había un entorno aislado de API y base de datos.

## Problemas frecuentes

- **La interfaz carga, pero fallan las peticiones:** comprueba que la API responde en `http://localhost:3002/health` y que `VITE_API_URL` usa el mismo puerto.
- **Errores de proxy o CORS:** utiliza el proxy de Vite en desarrollo local o incluye el origen del frontend en `CORS_ALLOWED_ORIGINS` de la API.
- **Puerto ocupado:** cambia `VITE_DEV_PORT`, reinicia Vite y actualiza la configuración de Cypress si ejecutas E2E.
- **URL de API inesperada:** `VITE_API_URL` configura el proxy de desarrollo; `VITE_API_BASE` configura la URL base visible para el cliente.
- **Los cambios de entorno no se aplican:** confirma el modo activo de Vite (`dev` o `prod`) y reinicia el proceso.

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un pull request. Los cambios visibles para el usuario deben mantener sincronizadas las traducciones en inglés y español.

## Licencia

Copyright © 2025 Laura Schörken. El código fuente está disponible bajo la [Licencia MIT](LICENSE). Consulta los [avisos de terceros](THIRD_PARTY_NOTICES.md) para las dependencias incluidas. Los nombres de producto, imágenes, recetas y materiales de terceros pueden tener derechos diferentes.

