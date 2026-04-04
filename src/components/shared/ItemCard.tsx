import { Link } from 'react-router-dom';
import './ItemCard.css';

export interface ItemCardData {
  id: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  isPublic: boolean;
  userId: number;
  authorName?: string;
  caloriesPerServing?: number | null;
  hasVariants?: boolean;
  type: 'recipe' | 'dish';
}

interface ItemCardProps {
  item: ItemCardData;
  currentUserId: number;
  onDelete: (id: number) => void;
  onAddToWeek: () => void;
  editPath: string;
  detailPath?: string;
}

export function ItemCard({ item, currentUserId, onDelete, onAddToWeek, editPath, detailPath }: ItemCardProps) {
  const isOwner = item.userId === currentUserId;
  const linkPath = detailPath || editPath;

  return (
    <div className={`item-card ${item.type === 'dish' ? 'item-card-dish' : ''}`}>
      <div className="item-card-header">
        <h3 className="item-card-title">
          <Link to={linkPath}>{item.title}</Link>
        </h3>
        <div className="item-card-badges">
          {item.hasVariants && <span className="badge badge-variants">Opciones</span>}
          <span className={`badge ${item.isPublic ? 'badge-public' : 'badge-private'}`}>
            {item.isPublic ? 'Pública' : 'Privada'}
          </span>
        </div>
      </div>

      {item.imageUrl ? (
        <div className="item-card-image">
          <img src={item.imageUrl} alt={item.title} />
        </div>
      ) : (
        <>
          {!isOwner && item.authorName && (
            <p className="item-card-author">Por {item.authorName}</p>
          )}
          {item.description && (
            <p className="item-card-description">{item.description}</p>
          )}
        </>
      )}

      <div className="item-card-footer">
        {item.caloriesPerServing != null && (
          <span className="item-card-calories">
            {item.caloriesPerServing} kcal/porción
          </span>
        )}
        
        <div className="item-card-actions">
          <button 
            className="btn-icon btn-icon-primary"
            onClick={onAddToWeek}
            title="Añadir a la semana"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <line x1="12" y1="14" x2="12" y2="18"/>
              <line x1="10" y1="16" x2="14" y2="16"/>
            </svg>
          </button>
          {isOwner && (
            <>
              <Link to={editPath} className="btn-icon btn-icon-outline" title="Editar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </Link>
              <button 
                className="btn-icon btn-icon-danger"
                onClick={() => onDelete(item.id)}
                title="Eliminar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
