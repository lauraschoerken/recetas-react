import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'

import { IndexLayout } from '@/layouts'
import { LoginContainer } from '@/features/auth/containers/LoginContainer'
import { RegisterContainer } from '@/features/auth/containers/RegisterContainer'
import { HomeContainer } from '@/features/home/containers/HomeContainer'
import { IngredientListContainer } from '@/features/ingredient/containers/IngredientListContainer'
import { SettingsContainer } from '@/features/profile/containers/SettingsContainer'
import { RecipeDetailContainer } from '@/features/recipe/containers/RecipeDetailContainer'
import { RecipeFormContainer } from '@/features/recipe/containers/RecipeFormContainer'
import { RecipeListContainer } from '@/features/recipe/containers/RecipeListContainer'
import { ShoppingListContainer } from '@/features/shopping/containers/ShoppingListContainer'
import { WeekPlanContainer } from '@/features/weekplan/containers/WeekPlanContainer'
import { authService } from '@/services/auth'

import Demo from '../components/Demo/containers/Demo'

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
					{ path: 'demo', element: <Demo /> },
				],
			},
		],
	},
	{
		path: '*',
		element: <Navigate to={authService.isAuthenticated() ? '/recipes' : '/login'} replace />,
	},
])
