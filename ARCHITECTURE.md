# Frontend — Arquitectura y Documentación

## Stack Tecnológico

| Tecnología       | Versión | Uso                        |
| ---------------- | ------- | -------------------------- |
| React            | 19.1    | UI                         |
| React Router DOM | 7.8     | Routing SPA                |
| TypeScript       | 5.8     | Tipado estático            |
| Vite             | 7       | Bundler + dev server       |
| SCSS + CSS vars  | —       | Estilos + dark/light mode  |
| react-i18next    | 15      | Internacionalización ES/EN |
| Vitest           | 4       | Tests unitarios            |
| Cypress          | 15      | Tests E2E                  |

---

## Estructura de Carpetas

```
recetas-react/
├── enviroments/           # Variables de entorno por modo
│   ├── .env               # Variables globales
│   ├── dev/.env.dev       # Overrides para desarrollo
│   └── prod/.env.prod     # Overrides para producción
├── cypress/
│   ├── e2e/               # Tests E2E
│   ├── fixtures/          # Datos estáticos de test
│   └── support/           # Comandos custom de Cypress
├── src/
│   ├── App.tsx            # Raíz: providers + router
│   ├── main.tsx           # Punto de entrada
│   ├── assets/
│   │   └── styles/        # SCSS global, tokens, mixins
│   ├── components/
│   │   ├── pages/         # Páginas agrupadas por dominio
│   │   │   ├── auth/      # Login, Register, AcceptInvite
│   │   │   ├── recipe/    # Lista, detalle, formulario
│   │   │   ├── ingredient/# Gestión de ingredientes
│   │   │   ├── shopping/  # Lista de compra
│   │   │   ├── weekplan/  # Plan semanal
│   │   │   ├── home/      # Almacenamiento (nevera/despensa)
│   │   │   ├── product/   # Catálogo de productos
│   │   │   ├── profile/   # Ajustes + macros
│   │   │   ├── alerts/    # Alertas de stock
│   │   │   └── admin/     # Panel de administración
│   │   ├── elements/      # Componentes UI del layout (AlertBell, Card, Languague, Theme, User)
│   │   └── shared/        # Componentes reutilizables globales
│   │       ├── confirm-dialog/
│   │       ├── icons/
│   │       ├── ingredient-states-panel/
│   │       ├── ingredients-list/
│   │       ├── item-card/
│   │       ├── markdown-editor/
│   │       ├── modal/
│   │       ├── modals/        # Modales complejos (AddToWeekModal, etc.)
│   │       ├── pagination/
│   │       ├── pdf-variants-modal/
│   │       ├── steps-list/
│   │       ├── tag-multi-select/
│   │       └── toast/
│   ├── i18n/              # Traducciones ES/EN + proveedor
│   ├── layouts/
│   │   ├── Main/          # Layout con Header + Footer + nav
│   │   └── Minimal/       # Layout sin nav (login/register)
│   ├── models/
│   │   ├── domains/       # Interfaces TypeScript por dominio
│   │   └── utils/         # Tipos utilitarios (Theme, etc.)
│   ├── navigation/
│   │   └── routes.tsx     # Router con guards por rol
│   ├── services/          # Capa de acceso a la API (una por dominio)
│   ├── tests/             # Tests unitarios (Vitest)
│   └── utils/             # Utilidades transversales
│       ├── dialog/        # DialogContext (confirm + toast)
│       ├── Theme/         # ThemeContext + toggler
│       ├── normalize/     # Normalización de texto para búsqueda
│       └── pagination/    # usePagination hook
```

---

## Patrón de Arquitectura

Cada sección de la app sigue el patrón **Container / Component**:

```
pages/recipe/
├── containers/
│   ├── RecipeListContainer.tsx    # Estado, llamadas a API, lógica
│   ├── RecipeDetailContainer.tsx
│   └── RecipeFormContainer.tsx
└── components/
    ├── RecipeList.tsx             # Presentacional (solo props)
    ├── RecipeCard.tsx
    ├── RecipeDetail.tsx
    ├── RecipeFilters.tsx
    └── RecipeForm.tsx
```

- **Containers** (`*Container.tsx`): gestionan estado, efectos secundarios y llamadas a servicios. Pasan datos y callbacks a los componentes presentacionales.
- **Components**: reciben props y renderizan UI. No conocen la API.

---

## Rutas y Guards

```
/login                 → LoginContainer          (PublicOnlyRoutes)
/register              → RegisterContainer        (PublicOnlyRoutes)
/recipes               → RecipeListContainer      (ProtectedRoutes)
/recipes/new           → RecipeFormContainer      (ProtectedRoutes)
/recipes/:id           → RecipeDetailContainer    (ProtectedRoutes)
/recipes/:id/edit      → RecipeFormContainer      (ProtectedRoutes)
/home                  → HomeContainer            (ProtectedRoutes)
/ingredients           → IngredientListContainer  (ProtectedRoutes)
/week-plan             → WeekPlanContainer        (ProtectedRoutes)
/shopping-list         → ShoppingListContainer    (ProtectedRoutes)
/products              → ProductListContainer     (ProtectedRoutes)
/settings              → SettingsContainer        (ProtectedRoutes)
/macros                → MacrosContainer          (ProtectedRoutes)
/alerts                → AlertsContainer          (ProtectedRoutes)
/accept-invite         → AcceptInviteContainer    (ProtectedRoutes)
/admin                 → AdminContainer           (AdminRoutes)
```

**Guards implementados** en `routes.tsx`:

- `PublicOnlyRoutes`: redirige a `/recipes` si ya hay sesión.
- `ProtectedRoutes`: redirige a `/login` si no hay token.
- `AdminRoutes`: requiere token + `role === 'ADMIN'`.

---

## Servicios (capa de API)

Cada servicio importa y usa `api.ts` (instancia única de `ApiClient`).

| Servicio             | Fichero               | Principales funciones                                                                         |
| -------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| authService          | `auth.ts`             | login, register, logout, getUser, isAuthenticated, isAdmin, getMe                             |
| recipeService        | `recipe.ts`           | getAll, getAllPaginated, getById, create, update, delete, exportCsv, importFromCsv            |
| ingredientService    | `ingredient.ts`       | getAll, create, update, delete, search                                                        |
| ingredientTagService | `ingredientExtras.ts` | getTags, createTag, assign, unassign                                                          |
| shoppingService      | `shopping.ts`         | getWeekPlan, addToWeekPlan, removeFromWeekPlan, getShoppingList, markAsCooked, markAsConsumed |
| homeService          | `home.ts`             | getAll, getByLocation, create, update, delete, processConsumed, cookIngredient                |
| householdService     | `household.ts`        | getHousehold, createHousehold, invite, getPendingInvites, acceptInvite                        |
| alertService         | `alert.ts`            | getAlerts, snoozeAlert, dismissAlert                                                          |
| adminService         | `admin.ts`            | Admin operations                                                                              |
| pdfService           | `pdf.ts`              | generatePdf, getRecipeData                                                                    |
| storeService         | `store.ts`            | getStores, createStore, updateStore, deleteStore                                              |
| backupService        | `backup.ts`           | exportBackup, importBackup                                                                    |
| productService       | `product.ts`          | getAll, create, update, delete                                                                |

### ApiClient (`services/api.ts`)

```ts
class ApiClient {
	// JWT de localStorage en cada petición (Authorization: Bearer <token>)
	// 401 → elimina token + redirige a /login automáticamente
	get<T>(endpoint): Promise<T>
	post<T>(endpoint, body): Promise<T>
	put<T>(endpoint, body): Promise<T>
	delete<T>(endpoint): Promise<T>
	patch<T>(endpoint, body): Promise<T>
}

export const api = new ApiClient()
```

- `VITE_API_MODE`: `api` (por defecto) | `mock` (sin llamadas, URL='') | `real`
- `VITE_API_BASE`: URL base del backend (ej: `http://localhost:3002`)
- `VITE_API_PREFIX`: prefijo de la API (default: `/api`)
- En dev, el servidor de Vite hace proxy de `/api` → backend

---

## Gestión de Estado

**No hay store global** (ni Redux, ni Zustand, ni Context API para datos).

La gestión de estado es **local en cada Container** usando `useState` + `useEffect`. Los datos no se comparten entre rutas — cada vez que el usuario navega a una página, se vuelve a cargar la información.

**Contextos globales:**

- `ThemeContext` → tema claro/oscuro (persiste en localStorage)
- `DialogContext` → confirm dialogs + sistema de toasts globales
- `I18nProvider` → internacionalización (react-i18next)

---

## Internacionalización (i18n)

- **Idiomas**: Español (`src/i18n/es/common.json`) + Inglés (`src/i18n/en/common.json`)
- **Hook**: `useTranslation()` de react-i18next
- **Patrón**: `t('section.key')` — ej: `t('recipes.title')`, `t('delete')`
- Todo texto visible al usuario **debe** usar claves i18n

---

## Dark/Light Mode

- Sistema de CSS variables definidas en `src/assets/styles/front-global.scss`
- Se activa añadiendo el atributo `data-theme="dark"` al elemento `<html>`
- `ThemeProvider` gestiona el toggle y persiste en localStorage
- Nunca usar colores hex directamente en componentes — usar variables CSS

---

## Variables de Entorno

Configuradas en `enviroments/` (nota: directorio con typo intencional heredado):

| Variable        | Descripción                              | Ejemplo (dev)           |
| --------------- | ---------------------------------------- | ----------------------- |
| `VITE_API_MODE` | Modo de API: `api`, `mock`, `real`       | `api`                   |
| `VITE_API_URL`  | URL del backend (solo para proxy en dev) | `http://localhost:3002` |
| `VITE_APP_NAME` | Nombre de la app                         | `MealAgenda`            |
| `VITE_DEV_PORT` | Puerto del servidor de desarrollo        | `3000`                  |

---

## Ejecución Local

```bash
# Instalar dependencias
cd recetas-react
npm install

# Desarrollo (usa enviroments/dev/.env.dev)
npm run dev

# Build producción (usa enviroments/prod/.env.prod)
npm run build

# Preview del build
npm run preview

# Lint
npm run lint
```

---

## Tests

### Vitest (tests unitarios)

```bash
npm test              # Modo watch
npm run test:run      # Una sola vez
npm run test:coverage # Con cobertura
npm run test:ui       # Con UI visual
```

Configuración en: `vitest.config.ts`

### Cypress (tests E2E con mocks)

```bash
npm run test:e2e        # Headless (CI)
npm run test:e2e:open   # Con UI interactiva
npm run cy:run          # Alias headless
npm run cy:open         # Alias UI
```

Configuración en: `cypress.config.ts`  
Tests en: `cypress/e2e/`  
Comandos custom en: `cypress/support/commands.ts`  
Fixtures/mocks en: `cypress/fixtures/`

---

## Modelos TypeScript Principales

Los modelos están en `src/models/domains/`:

### `Recipe`

```ts
interface Recipe {
	id: number
	title: string
	description: string | null
	instructions: string | null
	imageUrl: string | null
	cookTimeMinutes?: number | null
	difficulty?: string | null // 'fácil' | 'media' | 'difícil'
	servings: number
	isPublic: boolean
	userId: number
	authorName?: string
	ingredients: Ingredient[]
	components?: RecipeComponent[] // Grupos de variantes (ej: "Salsa")
	nutrition?: RecipeNutrition | null // Calculado
	nutritionPerServing?: RecipeNutrition | null
	// Macros manuales (sobreescriben el cálculo)
	customCalories?: number | null
	// ...
}
```

### `Ingredient`

```ts
interface Ingredient {
	id: number
	name: string
	unit: string
	status?: 'GLOBAL' | 'PENDING' | 'PRIVATE' | 'REJECTED'
	variants?: IngredientVariant[] // Variantes crudo/cocinado
	conversions?: UnitConversion[] // Conversiones de unidad
}
```

### `WeekPlan` / `ShoppingItem` / `HomeItem`

Ver `src/models/domains/shopping.ts` y `src/models/domains/home.ts`.
