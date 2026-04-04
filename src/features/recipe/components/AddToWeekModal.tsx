import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/shared/Modal';
import { Recipe, recipeService } from '@/services/recipe';
import { shoppingService, WeekPlanType } from '@/services/shopping';
import { useDialog } from '@/utils/dialog/DialogContext';

interface ComponentOption {
  id: number;
  name: string;
  isDefault: boolean;
  recipeId?: number | null;
  isRecipe: boolean;
}

interface ComponentSelection {
  componentId: number;
  componentName: string;
  isOptional: boolean;
  defaultEnabled: boolean;
  enabled: boolean;
  selectedOptionId: number | null;
  options: ComponentOption[];
  parentRecipeId?: number;
  parentRecipeName?: string;
}

interface AddToWeekModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddToWeekModal({ recipe, isOpen, onClose, onSuccess }: AddToWeekModalProps) {
  const { toast } = useDialog();
  const [fullRecipe, setFullRecipe] = useState<Recipe | null>(null);
  const [plannedDate, setPlannedDate] = useState('');
  const [servings, setServings] = useState(4);
  const [planType, setPlanType] = useState<WeekPlanType>('meal');
  const [componentSelections, setComponentSelections] = useState<ComponentSelection[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const extractComponentSelections = useCallback((
    data: Recipe, 
    parentRecipeId?: number, 
    parentRecipeName?: string
  ): ComponentSelection[] => {
    if (!data.components || data.components.length === 0) return [];
    
    return data.components.map(comp => {
      const defaultOption = comp.options.find(o => o.isDefault) || comp.options[0];
      return {
        componentId: comp.id,
        componentName: comp.name,
        isOptional: comp.isOptional,
        defaultEnabled: comp.defaultEnabled,
        enabled: !comp.isOptional || comp.defaultEnabled,
        selectedOptionId: defaultOption?.id || null,
        options: comp.options.map(o => ({
          id: o.id,
          name: o.name || o.recipe?.title || o.ingredient?.name || 'Opción',
          isDefault: o.isDefault,
          recipeId: o.recipeId || o.recipe?.id,
          isRecipe: !!(o.recipeId || o.recipe)
        })),
        parentRecipeId,
        parentRecipeName
      };
    });
  }, []);

  const loadSubRecipeComponents = useCallback(async (
    recipeId: number, 
    recipeName: string,
    existingSelections: ComponentSelection[]
  ): Promise<ComponentSelection[]> => {
    try {
      const subRecipe = await recipeService.getById(recipeId);
      const subSelections = extractComponentSelections(subRecipe, recipeId, recipeName);
      
      // Recursively load sub-sub-recipes
      let allSelections = [...existingSelections, ...subSelections];
      
      for (const sel of subSelections) {
        const selectedOpt = sel.options.find(o => o.id === sel.selectedOptionId);
        if (selectedOpt?.recipeId && sel.enabled) {
          allSelections = await loadSubRecipeComponents(
            selectedOpt.recipeId, 
            selectedOpt.name,
            allSelections
          );
        }
      }
      
      return allSelections;
    } catch (err) {
      console.error('Error loading sub-recipe:', err);
      return existingSelections;
    }
  }, [extractComponentSelections]);

  useEffect(() => {
    if (isOpen && recipe) {
      setPlannedDate(new Date().toISOString().split('T')[0]);
      setServings(recipe.servings);
      setPlanType('meal');
      setComponentSelections([]);
      loadFullRecipe(recipe.id);
    }
  }, [isOpen, recipe]);

  const loadFullRecipe = async (recipeId: number) => {
    setLoadingRecipe(true);
    try {
      const data = await recipeService.getById(recipeId);
      setFullRecipe(data);
      
      let selections = extractComponentSelections(data);
      
      // Load sub-recipe components for selected recipe options
      const loadedIds = new Set<number>();
      for (const sel of selections) {
        const selectedOpt = sel.options.find(o => o.id === sel.selectedOptionId);
        if (selectedOpt?.recipeId && sel.enabled && !loadedIds.has(selectedOpt.recipeId)) {
          loadedIds.add(selectedOpt.recipeId);
          selections = await loadSubRecipeComponents(
            selectedOpt.recipeId, 
            selectedOpt.name,
            selections
          );
        }
      }
      
      setComponentSelections(selections);
    } catch (err) {
      console.error('Error loading recipe details:', err);
    } finally {
      setLoadingRecipe(false);
    }
  };

  const updateComponentSelection = async (
    componentId: number, 
    field: 'enabled' | 'selectedOptionId', 
    value: any
  ) => {
    // Find the component being updated
    const comp = componentSelections.find(cs => cs.componentId === componentId);
    if (!comp) return;

    // Remove sub-components of this component's previously selected recipe option
    const oldSelectedOpt = comp.options.find(o => o.id === comp.selectedOptionId);
    let newSelections = componentSelections.map(cs => 
      cs.componentId === componentId ? { ...cs, [field]: value } : cs
    );
    
    // If changing the selected option or disabling, remove child selections
    if (oldSelectedOpt?.recipeId) {
      const removeSubSelectionsOf = (recipeId: number) => {
        const toRemove = newSelections.filter(s => s.parentRecipeId === recipeId);
        newSelections = newSelections.filter(s => s.parentRecipeId !== recipeId);
        toRemove.forEach(s => {
          const opt = s.options.find(o => o.id === s.selectedOptionId);
          if (opt?.recipeId) removeSubSelectionsOf(opt.recipeId);
        });
      };
      removeSubSelectionsOf(oldSelectedOpt.recipeId);
    }
    
    setComponentSelections(newSelections);

    // If enabling or selecting a new recipe option, load its components
    const updatedComp = newSelections.find(cs => cs.componentId === componentId);
    if (updatedComp?.enabled) {
      const newSelectedOpt = updatedComp.options.find(o => o.id === updatedComp.selectedOptionId);
      if (newSelectedOpt?.recipeId) {
        setLoadingRecipe(true);
        const finalSelections = await loadSubRecipeComponents(
          newSelectedOpt.recipeId,
          newSelectedOpt.name,
          newSelections
        );
        setComponentSelections(finalSelections);
        setLoadingRecipe(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!recipe || !plannedDate) return;

    setSubmitting(true);
    try {
      const selections = componentSelections
        .filter(cs => cs.enabled && cs.selectedOptionId)
        .map(cs => cs.selectedOptionId!);

      const result = await shoppingService.addToWeekPlan({
        recipeId: recipe.id,
        plannedDate,
        servings,
        type: planType,
        selections: selections.length > 0 ? selections : undefined
      });
      
      onClose();
      
      if (result.autoPrepsCreated && result.autoPrepsCreated.length > 0) {
        const prepNames = result.autoPrepsCreated.map(p => p.title).join(', ');
        toast.info(`Receta añadida. También se ha añadido a preparar: ${prepNames}`);
      } else {
        const typeLabel = planType === 'meal' ? 'comida' : 'preparación';
        toast.success(`Receta añadida como ${typeLabel} al plan semanal`);
      }
      
      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al añadir al plan semanal');
    } finally {
      setSubmitting(false);
    }
  };

  if (!recipe) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Añadir al plan semanal"
    >
      <div>
        <p className="mb-2">
          <strong>{recipe.title}</strong>
        </p>

        <div className="form-group">
          <label className="form-label">Fecha</label>
          <input
            type="date"
            className="form-input"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Porciones</label>
          <input
            type="number"
            className="form-input"
            value={servings}
            onChange={(e) => setServings(parseInt(e.target.value) || 1)}
            min={1}
            style={{ width: '100px' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Tipo</label>
          <div className="plan-type-selector">
            <button
              type="button"
              className={`plan-type-btn ${planType === 'meal' ? 'active' : ''}`}
              onClick={() => setPlanType('meal')}
            >
              Comida
            </button>
            <button
              type="button"
              className={`plan-type-btn ${planType === 'prep' ? 'active' : ''}`}
              onClick={() => setPlanType('prep')}
            >
              A preparar
            </button>
          </div>
          <small className="form-help">
            {planType === 'meal' 
              ? 'Se descontara de casa cuando la consumas' 
              : 'Al cocinarla, se guardaran las raciones en casa'}
          </small>
        </div>

        {componentSelections.length > 0 && (
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Variantes</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(() => {
                // Agrupar por receta padre
                const mainComponents = componentSelections.filter(cs => !cs.parentRecipeId);
                const subComponentsByParent = componentSelections.reduce((acc, cs) => {
                  if (cs.parentRecipeId) {
                    if (!acc[cs.parentRecipeId]) acc[cs.parentRecipeId] = [];
                    acc[cs.parentRecipeId].push(cs);
                  }
                  return acc;
                }, {} as Record<number, ComponentSelection[]>);

                const renderSubComponent = (sc: ComponentSelection) => {
                  const selectedOpt = sc.options.find(o => o.id === sc.selectedOptionId);
                  const subSubComps = selectedOpt?.recipeId ? subComponentsByParent[selectedOpt.recipeId] : [];
                  const hasSubVariants = subSubComps && subSubComps.length > 0;
                  
                  return (
                    <div key={sc.componentId} style={{ marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: sc.enabled && sc.options.length > 1 ? '0.5rem' : 0 }}>
                        {sc.isOptional && (
                          <input
                            type="checkbox"
                            checked={sc.enabled}
                            onChange={(e) => updateComponentSelection(sc.componentId, 'enabled', e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        )}
                        <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                          {sc.options.length === 1 && (
                            <span style={{ marginRight: '0.25rem' }}>{selectedOpt?.isRecipe ? '📖' : '🥬'}</span>
                          )}
                          {sc.componentName}
                        </span>
                        {sc.isOptional && <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f1f5f9', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>opcional</span>}
                      </div>
                      {sc.enabled && sc.options.length > 1 && (
                        <select
                          value={sc.selectedOptionId || ''}
                          onChange={(e) => updateComponentSelection(sc.componentId, 'selectedOptionId', parseInt(e.target.value))}
                          style={{ 
                            width: '100%', 
                            padding: '0.35rem 0.5rem', 
                            border: '1px solid #bae6fd', 
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            background: 'white'
                          }}
                        >
                          {sc.options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.isRecipe ? '📖' : '🥬'} {opt.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {/* Sub-sub-componentes recursivos */}
                      {hasSubVariants && sc.enabled && (
                        <div style={{ 
                          marginTop: '0.5rem', 
                          marginLeft: '0.75rem', 
                          paddingLeft: '0.75rem', 
                          borderLeft: '2px solid #7dd3fc' 
                        }}>
                          <div style={{ fontSize: '0.7rem', color: '#0369a1', marginBottom: '0.25rem', fontWeight: 500 }}>
                            📖 {selectedOpt?.name}
                          </div>
                          {subSubComps.map(ssc => renderSubComponent(ssc))}
                        </div>
                      )}
                    </div>
                  );
                };

                const renderComponent = (cs: ComponentSelection) => {
                  const selectedOpt = cs.options.find(o => o.id === cs.selectedOptionId);
                  const subComps = selectedOpt?.recipeId ? subComponentsByParent[selectedOpt.recipeId] : [];
                  const hasSubVariants = subComps && subComps.length > 0;
                  
                  return (
                    <div 
                      key={cs.componentId}
                      style={{ 
                        padding: '0.75rem', 
                        background: cs.enabled ? '#f0fdf4' : '#f8fafc', 
                        border: `1px solid ${cs.enabled ? '#86efac' : '#e2e8f0'}`,
                        borderRadius: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: cs.enabled && cs.options.length > 1 ? '0.5rem' : 0 }}>
                        {cs.isOptional && (
                          <input
                            type="checkbox"
                            checked={cs.enabled}
                            onChange={(e) => updateComponentSelection(cs.componentId, 'enabled', e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        )}
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {cs.options.length === 1 && (
                            <span style={{ marginRight: '0.25rem' }}>{selectedOpt?.isRecipe ? '📖' : '🥬'}</span>
                          )}
                          {cs.componentName}
                        </span>
                        {cs.isOptional && <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>opcional</span>}
                        {hasSubVariants && cs.enabled && (
                          <span style={{ fontSize: '0.65rem', color: '#059669', background: '#d1fae5', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>tiene variantes</span>
                        )}
                      </div>
                      {cs.enabled && cs.options.length > 1 && (
                        <select
                          value={cs.selectedOptionId || ''}
                          onChange={(e) => updateComponentSelection(cs.componentId, 'selectedOptionId', parseInt(e.target.value))}
                          style={{ 
                            width: '100%', 
                            padding: '0.4rem 0.5rem', 
                            border: '1px solid #d1d5db', 
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            background: 'white'
                          }}
                        >
                          {cs.options.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.isRecipe ? '📖' : '🥬'} {opt.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {/* Sub-componentes dentro del mismo bloque */}
                      {hasSubVariants && cs.enabled && (
                        <div style={{ 
                          marginTop: '0.75rem', 
                          paddingTop: '0.5rem',
                          paddingLeft: '0.75rem',
                          borderTop: '1px dashed #86efac',
                          borderLeft: '3px solid #0ea5e9',
                          background: '#f0f9ff',
                          borderRadius: '0 0 6px 6px',
                          marginLeft: '-0.75rem',
                          marginRight: '-0.75rem',
                          marginBottom: '-0.75rem',
                          paddingBottom: '0.5rem',
                          paddingRight: '0.75rem'
                        }}>
                          <div style={{ fontSize: '0.7rem', color: '#0369a1', marginBottom: '0.25rem', fontWeight: 500 }}>
                            📖 {selectedOpt?.name}
                          </div>
                          {subComps.map(sc => renderSubComponent(sc))}
                        </div>
                      )}
                    </div>
                  );
                };

                return mainComponents.map(cs => renderComponent(cs));
              })()}
            </div>
          </div>
        )}

        {loadingRecipe && (
          <div style={{ padding: '0.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            Cargando variantes...
          </div>
        )}

        <div className="flex gap-1 mt-2">
          <button className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={loadingRecipe || submitting}
          >
            {submitting ? 'Añadiendo...' : 'Añadir'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
