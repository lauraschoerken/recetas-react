import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RecipeForm } from '../components/RecipeForm';
import { Recipe, CreateRecipeData, recipeService } from '@/services/recipe';

export function RecipeFormContainer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!id;

  useEffect(() => {
    if (id) {
      loadRecipe();
    }
  }, [id]);

  const loadRecipe = async () => {
    try {
      const data = await recipeService.getById(parseInt(id!));
      setRecipe(data);
    } catch {
      setError('Receta no encontrada');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (data: CreateRecipeData) => {
    setError(null);
    setLoading(true);

    try {
      if (isEditing && id) {
        await recipeService.update(parseInt(id), data);
      } else {
        await recipeService.create(data);
      }
      navigate('/recipes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar receta');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (initialLoading) {
    return <div className="loading">Cargando receta...</div>;
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          {isEditing ? 'Editar Receta' : 'Nueva Receta'}
        </h1>
      </div>

      <div className="card">
        <RecipeForm
          initialData={recipe || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
          error={error}
        />
      </div>
    </>
  );
}
