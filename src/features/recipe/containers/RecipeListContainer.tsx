import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RecipeList } from '../components/RecipeList';
import { AddToWeekModal } from '../components/AddToWeekModal';
import { useDialog } from '@/utils/dialog/DialogContext';
import { Recipe, recipeService } from '@/services/recipe';
import { authService } from '@/services/auth';

export function RecipeListContainer() {
  const { confirm, toast } = useDialog();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const currentUser = authService.getUser();

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const data = await recipeService.getAll();
      setRecipes(data);
    } catch (err) {
      setError('Error al cargar recetas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Eliminar receta',
      message: '¿Estás seguro de que quieres eliminar esta receta?',
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await recipeService.delete(id);
      setRecipes(recipes.filter(r => r.id !== id));
      toast.success('Receta eliminada correctamente');
    } catch {
      toast.error('Error al eliminar la receta');
    }
  };

  const handleAddToWeek = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setModalOpen(true);
  };

  if (loading) return <div className="loading">Cargando recetas...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Mis Recetas</h1>
        <Link to="/recipes/new" className="btn btn-primary">
          + Nueva Receta
        </Link>
      </div>

      <RecipeList
        recipes={recipes}
        currentUserId={currentUser?.id || 0}
        onDelete={handleDelete}
        onAddToWeek={handleAddToWeek}
      />

      <AddToWeekModal
        recipe={selectedRecipe}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
