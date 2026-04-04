import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingList } from '../components/ShoppingList';
import { ShoppingItem, shoppingService } from '@/services/shopping';

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(startDate: Date): Date {
  const d = new Date(startDate);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getStorageKey(weekStart: Date): string {
  return `shopping_${weekStart.toISOString().split('T')[0]}`;
}

export function ShoppingListContainer() {
  const [allItems, setAllItems] = useState<ShoppingItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShoppingItem[]>([]);
  const [excludedItems, setExcludedItems] = useState<Set<number>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));

  useEffect(() => {
    loadShoppingList();
  }, [currentWeekStart]);

  useEffect(() => {
    const key = getStorageKey(currentWeekStart);
    const savedExcluded = localStorage.getItem(`${key}_excluded`);
    const savedChecked = localStorage.getItem(`${key}_checked`);
    
    if (savedExcluded) {
      setExcludedItems(new Set(JSON.parse(savedExcluded)));
    } else {
      setExcludedItems(new Set());
    }
    
    if (savedChecked) {
      setCheckedItems(new Set(JSON.parse(savedChecked)));
    } else {
      setCheckedItems(new Set());
    }
  }, [currentWeekStart]);

  useEffect(() => {
    setFilteredItems(allItems.filter(item => !excludedItems.has(item.ingredientId)));
  }, [allItems, excludedItems]);

  const loadShoppingList = async () => {
    setLoading(true);
    try {
      const endDate = getWeekEnd(currentWeekStart);
      const data = await shoppingService.getShoppingList(
        currentWeekStart.toISOString(),
        endDate.toISOString()
      );
      setAllItems(data);
    } catch {
      console.error('Error al cargar la lista de la compra');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: number) => {
    const key = getStorageKey(currentWeekStart);
    const newChecked = new Set(checkedItems);
    if (newChecked.has(id)) {
      newChecked.delete(id);
    } else {
      newChecked.add(id);
    }
    setCheckedItems(newChecked);
    localStorage.setItem(`${key}_checked`, JSON.stringify([...newChecked]));
  };

  const handleExclude = (id: number) => {
    const key = getStorageKey(currentWeekStart);
    const newExcluded = new Set(excludedItems);
    newExcluded.add(id);
    setExcludedItems(newExcluded);
    localStorage.setItem(`${key}_excluded`, JSON.stringify([...newExcluded]));
  };

  const handleRestoreItem = (id: number) => {
    const key = getStorageKey(currentWeekStart);
    const newExcluded = new Set(excludedItems);
    newExcluded.delete(id);
    setExcludedItems(newExcluded);
    localStorage.setItem(`${key}_excluded`, JSON.stringify([...newExcluded]));
  };

  const clearChecked = () => {
    const key = getStorageKey(currentWeekStart);
    setCheckedItems(new Set());
    localStorage.removeItem(`${key}_checked`);
  };

  const resetAll = () => {
    const key = getStorageKey(currentWeekStart);
    setCheckedItems(new Set());
    setExcludedItems(new Set());
    localStorage.removeItem(`${key}_checked`);
    localStorage.removeItem(`${key}_excluded`);
  };

  const goToPreviousWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const weekEndDate = getWeekEnd(currentWeekStart);
  const weekLabel = `${currentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${weekEndDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const excludedItemsList = allItems.filter(item => excludedItems.has(item.ingredientId));

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Lista de la Compra</h1>
        <div className="page-header-actions">
          {excludedItems.size > 0 && (
            <button className="btn btn-outline btn-sm" onClick={() => setShowReview(!showReview)}>
              {showReview ? 'Ocultar excluidos' : `Ver excluidos (${excludedItems.size})`}
            </button>
          )}
          <Link to="/week-plan" className="btn btn-outline">
            Ver Plan Semanal
          </Link>
        </div>
      </div>

      <div className="card mb-2">
        <div className="flex flex-between flex-center">
          <button className="btn btn-outline btn-sm" onClick={goToPreviousWeek}>
            &larr; Anterior
          </button>
          <div className="text-center">
            <strong>{weekLabel}</strong>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={goToCurrentWeek}
              style={{ marginLeft: '1rem' }}
            >
              Hoy
            </button>
          </div>
          <button className="btn btn-outline btn-sm" onClick={goToNextWeek}>
            Siguiente &rarr;
          </button>
        </div>
      </div>

      {showReview && excludedItemsList.length > 0 && (
        <div className="card mb-2 excluded-items-card">
          <h3 className="text-secondary mb-1">Ingredientes excluidos</h3>
          <p className="text-sm text-secondary mb-1">Haz clic para restaurar a la lista</p>
          <div className="excluded-items-list">
            {excludedItemsList.map(item => (
              <button
                key={item.ingredientId}
                className="excluded-item-tag"
                onClick={() => handleRestoreItem(item.ingredientId)}
              >
                {item.name} ({item.totalQuantity} {item.unit})
                <span className="restore-icon">+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Cargando lista...</div>
      ) : (
        <>
          <ShoppingList
            items={filteredItems}
            checkedItems={checkedItems}
            onToggle={handleToggle}
            onExclude={handleExclude}
          />

          {(checkedItems.size > 0 || excludedItems.size > 0) && (
            <div className="shopping-actions mt-2">
              {checkedItems.size > 0 && (
                <button className="btn btn-outline btn-sm" onClick={clearChecked}>
                  Desmarcar comprados
                </button>
              )}
              {(checkedItems.size > 0 || excludedItems.size > 0) && (
                <button className="btn btn-outline btn-sm" onClick={resetAll}>
                  Reiniciar todo
                </button>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
