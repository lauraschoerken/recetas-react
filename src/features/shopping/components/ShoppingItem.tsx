import { ShoppingItem } from '@/services/shopping';
import './ShoppingItem.css';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  checked: boolean;
  onToggle: () => void;
  onExclude?: () => void;
}

export function ShoppingItemRow({ item, checked, onToggle, onExclude }: ShoppingItemRowProps) {
  const formatQuantity = (qty: number): string => {
    if (Number.isInteger(qty)) return qty.toString();
    return qty.toFixed(1);
  };

  const hasAtHome = item.quantityAtHome > 0;
  const needsToBuy = item.quantityToBuy > 0;
  
  // Usar unidad preferida si está disponible
  const hasPreferred = item.preferredUnit && item.preferredQuantity != null;
  const displayQuantity = hasPreferred ? formatQuantity(item.preferredQuantity!) : formatQuantity(item.quantityToBuy);
  const displayUnit = hasPreferred ? item.preferredUnit : item.unit;

  return (
    <li className={`shopping-item ${checked ? 'shopping-item-checked' : ''} ${!needsToBuy ? 'shopping-item-covered' : ''}`}>
      <label className="shopping-item-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="shopping-item-checkbox"
        />
        <div className="shopping-item-info">
          <span className="shopping-item-name">{item.name}</span>
          <div className="shopping-item-breakdown">
            <span className="shopping-item-total" title="Total necesario">
              {formatQuantity(item.totalQuantity)} {item.unit} necesario
            </span>
            {hasAtHome && (
              <span className="shopping-item-athome" title="En casa">
                -{formatQuantity(item.quantityAtHome)} {item.unit} en casa
              </span>
            )}
          </div>
        </div>
        <span className={`shopping-item-tobuy ${!needsToBuy ? 'shopping-item-tobuy-zero' : ''}`}>
          {needsToBuy ? (
            <>
              <span className="shopping-item-preferred">
                {displayQuantity} {displayUnit}
              </span>
              {hasPreferred && (
                <span className="shopping-item-base-qty" title="En gramos">
                  ({formatQuantity(item.quantityToBuy)} {item.unit})
                </span>
              )}
            </>
          ) : (
            <span className="shopping-item-covered-text">Cubierto</span>
          )}
        </span>
      </label>
      {onExclude && !checked && needsToBuy && (
        <button 
          className="shopping-item-exclude" 
          onClick={onExclude}
          title="Excluir de la lista"
        >
          ×
        </button>
      )}
    </li>
  );
}
