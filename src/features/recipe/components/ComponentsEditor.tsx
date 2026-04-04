import { useState, useEffect, useRef } from 'react';
import { CreateComponentData, CreateComponentOptionData, Recipe, recipeService } from '@/services/recipe';
import { api } from '@/services/api';
import { IngredientStatesPanel, IngredientVariant } from '@/components/shared/IngredientStatesPanel';
import './ComponentsEditor.css';

interface UnitConversion {
  id: number;
  unitName: string;
  gramsPerUnit: number;
}

interface IngredientSuggestion {
  id: number;
  name: string;
  unit: string;
  conversions?: UnitConversion[];
  variants?: IngredientVariant[];
}

interface OptionIngredientData {
  databaseId?: number;
  variants?: IngredientVariant[];
  conversions?: UnitConversion[];
  variantId?: number | null;
  variantName?: string;
}

interface ComponentsEditorProps {
  components: CreateComponentData[];
  onChange: (components: CreateComponentData[]) => void;
}

type OptionType = 'recipe' | 'ingredient';

function getOptionType(opt: CreateComponentOptionData): OptionType {
  const hasRecipeId = 'recipeId' in opt;
  const hasIngredientName = 'ingredientName' in opt;
  
  if (hasRecipeId && !hasIngredientName) return 'recipe';
  if (hasIngredientName && !hasRecipeId) return 'ingredient';
  
  if (opt.recipeId) return 'recipe';
  return 'ingredient';
}

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function ComponentsEditor({ components, onChange }: ComponentsEditorProps) {
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, IngredientSuggestion[]>>({});
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [ingredientData, setIngredientData] = useState<Record<string, OptionIngredientData>>({});
  const [showMacrosId, setShowMacrosId] = useState<string | null>(null);
  const [showConversionsId, setShowConversionsId] = useState<string | null>(null);
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  useEffect(() => {
    recipeService.getAll().then(setAvailableRecipes).catch(console.error);
  }, []);

  // Inicializar ingredientData con los datos que vienen en las opciones
  useEffect(() => {
    const newData: Record<string, OptionIngredientData> = {};
    
    for (let compIndex = 0; compIndex < components.length; compIndex++) {
      const comp = components[compIndex];
      for (let optIndex = 0; optIndex < comp.options.length; optIndex++) {
        const opt = comp.options[optIndex];
        const inputId = `${compIndex}-${optIndex}`;
        
        // Si ya tenemos datos para este input, saltar
        if (ingredientData[inputId]?.databaseId) continue;
        
        // Si la opción tiene datos de ingrediente, usarlos
        if (opt.ingredientId) {
          const defaultVariant = opt.ingredientVariants?.find(v => v.isDefault) || opt.ingredientVariants?.[0];
          newData[inputId] = {
            databaseId: opt.ingredientId,
            variants: opt.ingredientVariants,
            conversions: opt.ingredientConversions,
            variantId: defaultVariant?.id,
            variantName: defaultVariant?.name
          };
        }
      }
    }
    
    if (Object.keys(newData).length > 0) {
      setIngredientData(prev => ({ ...prev, ...newData }));
    }
  }, [components]); // Se ejecuta cuando cambian los componentes

  useEffect(() => {
    return () => {
      Object.values(debounceRef.current).forEach(clearTimeout);
    };
  }, []);

  const searchIngredients = async (query: string, inputId: string) => {
    if (query.length < 3) {
      setSuggestions(prev => ({ ...prev, [inputId]: [] }));
      return;
    }

    try {
      const results = await api.get<IngredientSuggestion[]>(`/ingredients/search?q=${encodeURIComponent(query)}`);
      setSuggestions(prev => ({ ...prev, [inputId]: results }));
    } catch {
      setSuggestions(prev => ({ ...prev, [inputId]: [] }));
    }
  };

  const addComponent = () => {
    onChange([
      ...components,
      {
        name: '',
        sortOrder: components.length,
        isOptional: false,
        options: [{ name: '', isDefault: true, ingredientName: '' }]
      }
    ]);
  };

  const removeComponent = (index: number) => {
    const updated = [...components];
    updated.splice(index, 1);
    onChange(updated);
  };

  const updateComponent = (index: number, field: keyof CreateComponentData, value: any) => {
    const updated = [...components];
    if (field === 'name' && typeof value === 'string') {
      value = capitalizeFirst(value);
    }
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addOption = (compIndex: number) => {
    const updated = [...components];
    updated[compIndex].options.push({ name: '', isDefault: false, ingredientName: '' });
    onChange(updated);
  };

  const removeOption = (compIndex: number, optIndex: number) => {
    const updated = [...components];
    updated[compIndex].options.splice(optIndex, 1);
    if (updated[compIndex].options.length === 0) {
      updated[compIndex].options.push({ name: '', isDefault: true, ingredientName: '' });
    } else if (!updated[compIndex].options.some(o => o.isDefault)) {
      updated[compIndex].options[0].isDefault = true;
    }
    onChange(updated);
  };

  const setOptionDefault = (compIndex: number, optIndex: number) => {
    const updated = [...components];
    updated[compIndex].options.forEach((opt, i) => {
      opt.isDefault = i === optIndex;
    });
    onChange(updated);
  };

  const changeOptionType = (compIndex: number, optIndex: number, newType: OptionType) => {
    const updated = JSON.parse(JSON.stringify(components));
    const oldOption = updated[compIndex].options[optIndex];
    
    const newOption: any = {
      name: oldOption.name || '',
      isDefault: oldOption.isDefault
    };
    
    if (newType === 'recipe') {
      newOption.recipeId = null;
      newOption.recipeServings = 1;
    } else {
      newOption.ingredientName = '';
      newOption.quantity = null;
      newOption.unit = 'g';
    }
    
    updated[compIndex].options[optIndex] = newOption;
    onChange(updated);
  };

  const updateRecipeOption = (compIndex: number, optIndex: number, recipeId: number | undefined) => {
    const updated = [...components];
    const recipe = availableRecipes.find(r => r.id === recipeId);
    updated[compIndex].options[optIndex] = {
      ...updated[compIndex].options[optIndex],
      recipeId,
      name: recipe?.title || ''
    };
    onChange(updated);
  };

  const updateRecipeServings = (compIndex: number, optIndex: number, servings: number) => {
    const updated = [...components];
    updated[compIndex].options[optIndex].recipeServings = servings;
    onChange(updated);
  };

  const updateIngredientOption = (compIndex: number, optIndex: number, field: string, value: any) => {
    const updated = [...components];
    const opt = updated[compIndex].options[optIndex];
    
    if (field === 'ingredientName') {
      const capitalized = capitalizeFirst(value);
      opt.ingredientName = capitalized;
      opt.name = capitalized;
      
      // Buscar con debounce
      const inputId = `${compIndex}-${optIndex}`;
      if (debounceRef.current[inputId]) {
        clearTimeout(debounceRef.current[inputId]);
      }
      debounceRef.current[inputId] = setTimeout(() => {
        searchIngredients(capitalized, inputId);
      }, 300);
    } else if (field === 'quantity') {
      opt.quantity = value;
    } else if (field === 'unit') {
      opt.unit = value;
    }
    
    onChange(updated);
  };

  const selectSuggestion = (compIndex: number, optIndex: number, suggestion: IngredientSuggestion) => {
    const updated = [...components];
    const opt = updated[compIndex].options[optIndex];
    const capitalized = capitalizeFirst(suggestion.name);
    opt.ingredientName = capitalized;
    opt.name = capitalized;
    opt.unit = suggestion.unit;
    opt.ingredientId = suggestion.id;
    opt.ingredientVariants = suggestion.variants;
    opt.ingredientConversions = suggestion.conversions;
    onChange(updated);
    
    const inputId = `${compIndex}-${optIndex}`;
    setSuggestions(prev => ({ ...prev, [inputId]: [] }));
    setActiveInput(null);
    
    // Guardar datos del ingrediente en estado local también
    const defaultVariant = suggestion.variants?.find(v => v.isDefault) || suggestion.variants?.[0];
    setIngredientData(prev => ({
      ...prev,
      [inputId]: {
        databaseId: suggestion.id,
        variants: suggestion.variants,
        conversions: suggestion.conversions,
        variantId: defaultVariant?.id,
        variantName: defaultVariant?.name
      }
    }));
  };

  const handleIngredientDataChange = (inputId: string, variants: IngredientVariant[], selectedVariantId?: number) => {
    const selectedVariant = variants.find(v => v.id === selectedVariantId) || variants.find(v => v.isDefault) || variants[0];
    
    setIngredientData(prev => ({
      ...prev,
      [inputId]: {
        ...prev[inputId],
        variants,
        variantId: selectedVariant?.id,
        variantName: selectedVariant?.name
      }
    }));
    
    // También actualizar el estado components para que se reflejen en Nutrición
    const [compIndex, optIndex] = inputId.split('-').map(Number);
    const updated = [...components];
    if (updated[compIndex]?.options[optIndex]) {
      updated[compIndex].options[optIndex].ingredientVariants = variants;
      onChange(updated);
    }
  };

  const handleCreateIngredient = async (inputId: string, name: string, unit: string) => {
    if (!name) return;

    try {
      const createdIng = await api.post<IngredientSuggestion>('/ingredients', { name, unit });
      const defaultVariant = createdIng.variants?.find(v => v.isDefault) || createdIng.variants?.[0];
      
      setIngredientData(prev => ({
        ...prev,
        [inputId]: {
          ...prev[inputId],
          databaseId: createdIng.id,
          variants: createdIng.variants,
          conversions: createdIng.conversions,
          variantId: defaultVariant?.id,
          variantName: defaultVariant?.name
        }
      }));

      // Actualizar el componente con el ingredientId
      const [compIndex, optIndex] = inputId.split('-').map(Number);
      const updated = [...components];
      if (updated[compIndex]?.options[optIndex]) {
        updated[compIndex].options[optIndex].ingredientId = createdIng.id;
        updated[compIndex].options[optIndex].ingredientVariants = createdIng.variants;
        updated[compIndex].options[optIndex].ingredientConversions = createdIng.conversions;
        onChange(updated);
      }
    } catch (error) {
      console.error('Error creating ingredient:', error);
    }
  };

  return (
    <div className="components-editor">
      {components.length === 0 ? (
        <div className="components-empty">
          Sin variantes configuradas
        </div>
      ) : (
        <div className="components-list">
          {components.map((comp, compIndex) => (
            <div key={compIndex} className="variant-card">
              <div className="variant-header">
                <input
                  type="text"
                  className="variant-name-input"
                  value={comp.name}
                  onChange={(e) => updateComponent(compIndex, 'name', e.target.value)}
                  placeholder="Nombre de la variante (ej: Arroz, Caldo...)"
                />
                <div className="variant-flags">
                  <label className="variant-flag">
                    <input
                      type="checkbox"
                      checked={comp.isOptional}
                      onChange={(e) => {
                        updateComponent(compIndex, 'isOptional', e.target.checked);
                        if (e.target.checked && comp.defaultEnabled === undefined) {
                          updateComponent(compIndex, 'defaultEnabled', true);
                        }
                      }}
                    />
                    <span>Opcional</span>
                  </label>
                  {comp.isOptional && (
                    <label className="variant-flag included-flag">
                      <input
                        type="checkbox"
                        checked={comp.defaultEnabled !== false}
                        onChange={(e) => updateComponent(compIndex, 'defaultEnabled', e.target.checked)}
                      />
                      <span>Incluido por defecto</span>
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  className="variant-remove-btn"
                  onClick={() => removeComponent(compIndex)}
                  title="Eliminar variante"
                >
                  ×
                </button>
              </div>

              <div className="variant-options">
                <div className="options-header">
                  <span>OPCIÓN</span>
                  <span>CANTIDAD</span>
                  <span>UNIDAD</span>
                  <span></span>
                </div>
                {comp.options.map((opt, optIndex) => {
                  const optionType = getOptionType(opt);
                  const showAsDefault = opt.isDefault && (!comp.isOptional || comp.defaultEnabled !== false);
                  const inputId = `${compIndex}-${optIndex}`;
                  const hasSuggestions = suggestions[inputId]?.length > 0;
                  
                  return (
                    <div key={optIndex} className="option-container">
                      <div className={`option-row ${showAsDefault ? 'is-default' : ''}`}>
                        <div className="option-main">
                        <input
                          type="radio"
                          name={`default-${compIndex}`}
                          checked={opt.isDefault}
                          onChange={() => setOptionDefault(compIndex, optIndex)}
                          title="Por defecto"
                        />
                        <button
                          type="button"
                          className={`type-toggle ${optionType === 'ingredient' ? 'is-ingredient' : 'is-recipe'}`}
                          onClick={() => changeOptionType(compIndex, optIndex, optionType === 'ingredient' ? 'recipe' : 'ingredient')}
                          title={optionType === 'ingredient' ? 'Cambiar a receta' : 'Cambiar a ingrediente'}
                        >
                          {optionType === 'ingredient' ? '🥬' : '📖'}
                        </button>
                        {optionType === 'recipe' ? (
                          <select
                            className="form-input name-input"
                            value={opt.recipeId || ''}
                            onChange={(e) => updateRecipeOption(compIndex, optIndex, e.target.value ? parseInt(e.target.value) : undefined)}
                          >
                            <option value="">Selecciona receta...</option>
                            {availableRecipes.map(r => (
                              <option key={r.id} value={r.id}>{r.title}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="ingredient-input-wrapper">
                            {opt.ingredientName && !ingredientData[inputId]?.databaseId && (
                              <span className="new-ingredient-badge" title="Ingrediente nuevo">✨</span>
                            )}
                            <input
                              type="text"
                              className="form-input name-input"
                              value={opt.ingredientName || ''}
                              onChange={(e) => updateIngredientOption(compIndex, optIndex, 'ingredientName', e.target.value)}
                              onFocus={() => setActiveInput(inputId)}
                              onBlur={() => setTimeout(() => setActiveInput(null), 200)}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                              placeholder="Nombre del ingrediente"
                              autoComplete="off"
                            />
                            {activeInput === inputId && hasSuggestions && (
                              <ul className="ingredient-suggestions">
                                {suggestions[inputId].map(s => (
                                  <li 
                                    key={s.id}
                                    className="ingredient-suggestion-item"
                                    onMouseDown={() => selectSuggestion(compIndex, optIndex, s)}
                                  >
                                    <span className="suggestion-icon">🥬</span>
                                    <div className="suggestion-info">
                                      <span className="suggestion-name">{capitalizeFirst(s.name)}</span>
                                      {s.variants && s.variants.length > 1 && (
                                        <span className="suggestion-detail">{s.variants.length} estados</span>
                                      )}
                                    </div>
                                    <span className="suggestion-unit">{s.unit}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="option-quantity">
                        {optionType === 'recipe' ? (
                          <input
                            type="number"
                            className="form-input"
                            value={opt.recipeServings || 1}
                            onChange={(e) => updateRecipeServings(compIndex, optIndex, parseFloat(e.target.value) || 1)}
                            min={0.1}
                            step={0.1}
                            title="Raciones"
                          />
                        ) : (
                          <input
                            type="number"
                            className="form-input"
                            value={opt.quantity || ''}
                            onChange={(e) => updateIngredientOption(compIndex, optIndex, 'quantity', e.target.value ? parseFloat(e.target.value) : undefined)}
                            placeholder="100"
                            min={0}
                          />
                        )}
                      </div>
                      <div className="option-unit">
                        {optionType === 'recipe' ? (
                          <span className="unit-label">raciones</span>
                        ) : (
                          <select
                            className="form-input"
                            value={opt.unit || 'g'}
                            onChange={(e) => updateIngredientOption(compIndex, optIndex, 'unit', e.target.value)}
                          >
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="kg">kg</option>
                            <option value="l">l</option>
                            <option value="unidad">ud</option>
                          </select>
                        )}
                      </div>
                      <div className="option-actions">
                        {optionType === 'ingredient' && opt.ingredientName && (
                          <>
                            <button
                              type="button"
                              className="option-icon-btn"
                              onClick={() => setShowConversionsId(showConversionsId === inputId ? null : inputId)}
                              title="Ver conversiones"
                            >
                              ⚖️
                            </button>
                            <button
                              type="button"
                              className="option-icon-btn"
                              onClick={() => setShowMacrosId(showMacrosId === inputId ? null : inputId)}
                              title={ingredientData[inputId]?.databaseId ? "Ver macros" : "Crear ingrediente y añadir macros"}
                            >
                              📊
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="option-remove-btn"
                          onClick={() => removeOption(compIndex, optIndex)}
                          title="Eliminar"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {showConversionsId === inputId && ingredientData[inputId]?.conversions && (
                      <div className="option-info-panel">
                        <div className="info-panel-header">Conversiones de unidad</div>
                        {ingredientData[inputId].conversions!.length > 0 ? (
                          <ul className="conversions-list">
                            {ingredientData[inputId].conversions!.map(c => (
                              <li key={c.id}>1 {c.unitName} = {c.gramsPerUnit}g</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="no-data">No hay conversiones configuradas</p>
                        )}
                      </div>
                    )}
                    {showMacrosId === inputId && (
                      ingredientData[inputId]?.databaseId && ingredientData[inputId]?.variants ? (
                        <IngredientStatesPanel
                          data={{
                            databaseId: ingredientData[inputId].databaseId!,
                            name: opt.ingredientName || '',
                            variants: ingredientData[inputId].variants!,
                            selectedVariantId: ingredientData[inputId].variantId
                          }}
                          onVariantsChange={(variants, selectedVariantId) => handleIngredientDataChange(inputId, variants, selectedVariantId)}
                        />
                      ) : (
                        <div className="option-info-panel new-ingredient-panel">
                          <div className="info-panel-header">Ingrediente nuevo: {capitalizeFirst(opt.ingredientName || '')}</div>
                          <p className="new-ingredient-hint">Este ingrediente no existe. Se creará al añadir estados/macros.</p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleCreateIngredient(inputId, opt.ingredientName || '', opt.unit || 'g')}
                          >
                            Crear ingrediente y configurar macros
                          </button>
                        </div>
                      )
                    )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="add-option-btn"
                  onClick={() => addOption(compIndex)}
                >
                  + Añadir opción
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button
        type="button"
        className="add-variant-btn"
        onClick={addComponent}
      >
        + Añadir variante
      </button>
    </div>
  );
}
