import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';

interface NavbarProps {
  onLogout: () => void;
}

export function Navbar({ onLogout }: NavbarProps) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSettingsClick = () => {
    setDropdownOpen(false);
    navigate('/settings');
  };

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    onLogout();
  };

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <div className="navbar-brand">
          <NavLink to="/recipes" className="navbar-logo">
            Recetas
          </NavLink>
        </div>

        <div className="navbar-menu">
          <NavLink 
            to="/recipes" 
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
          >
            Recetas
          </NavLink>
          <NavLink 
            to="/home" 
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
          >
            Casa
          </NavLink>
          <NavLink 
            to="/ingredients" 
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
          >
            Ingredientes
          </NavLink>
          <NavLink 
            to="/week-plan" 
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
          >
            Plan Semanal
          </NavLink>
          <NavLink 
            to="/shopping-list" 
            className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
          >
            Compra
          </NavLink>
        </div>

        <div className="navbar-user" ref={dropdownRef}>
          <button 
            className="navbar-username-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <span className="navbar-username">{user.name}</span>
            <span className="navbar-dropdown-arrow">{dropdownOpen ? '▲' : '▼'}</span>
          </button>
          
          {dropdownOpen && (
            <div className="navbar-dropdown">
              <button className="navbar-dropdown-item" onClick={handleSettingsClick}>
                <span className="navbar-dropdown-icon">⚙️</span>
                Ajustes
              </button>
              <div className="navbar-dropdown-divider"></div>
              <button className="navbar-dropdown-item navbar-dropdown-logout" onClick={handleLogoutClick}>
                <span className="navbar-dropdown-icon">🚪</span>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
