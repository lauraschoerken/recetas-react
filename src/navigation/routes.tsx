import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'

import { LoginContainer } from '@/components/pages/auth/containers/LoginContainer'
import { RegisterContainer } from '@/components/pages/auth/containers/RegisterContainer'
import { HomeContainer } from '@/components/pages/home/containers/HomeContainer'
import { IngredientListContainer } from '@/components/pages/ingredient/containers/IngredientListContainer'
import { SettingsContainer } from '@/components/pages/profile/containers/SettingsContainer'
import { RecipeDetailContainer } from '@/components/pages/recipe/containers/RecipeDetailContainer'
import { RecipeFormContainer } from '@/components/pages/recipe/containers/RecipeFormContainer'
import { RecipeListContainer } from '@/components/pages/recipe/containers/RecipeListContainer'
import { ShoppingListContainer } from '@/components/pages/shopping/containers/ShoppingListContainer'
import { WeekPlanContainer } from '@/components/pages/weekplan/containers/WeekPlanContainer'
import { IndexLayout } from '@/layouts'
import { authService } from '@/services/auth'

const ProtectedRoutes = () => {
	if (!authService.isAuthenticated()) {
		return <Navigate to='/login' replace />
	}

	return <Outlet />
}

const PublicOnlyRoutes = () => {
	if (authService.isAuthenticated()) {
		return <Navigate to='/recipes' replace />
	}

	return <Outlet />
}

export const router = createBrowserRouter([
	{
		element: <PublicOnlyRoutes />,
		children: [
			{
				path: '/',
				element: <IndexLayout layout='minimal' />,
				children: [
					{ index: true, element: <Navigate to='/login' replace /> },
					{ path: 'login', element: <LoginContainer /> },
					{ path: 'register', element: <RegisterContainer /> },
				],
			},
		],
	},
	{
		element: <ProtectedRoutes />,
		children: [
			{
				path: '/',
				element: <IndexLayout />,
				children: [
					{ index: true, element: <Navigate to='/recipes' replace /> },
					{ path: 'recipes', element: <RecipeListContainer /> },
					{ path: 'recipes/new', element: <RecipeFormContainer /> },
					{ path: 'recipes/:id', element: <RecipeDetailContainer /> },
					{ path: 'recipes/:id/edit', element: <RecipeFormContainer /> },
					{ path: 'home', element: <HomeContainer /> },
					{ path: 'ingredients', element: <IngredientListContainer /> },
					{ path: 'week-plan', element: <WeekPlanContainer /> },
					{ path: 'shopping-list', element: <ShoppingListContainer /> },
					{ path: 'settings', element: <SettingsContainer /> },
				],
			},
		],
	},
	{
		path: '*',
		element: <Navigate to={authService.isAuthenticated() ? '/recipes' : '/login'} replace />,
	},
])
