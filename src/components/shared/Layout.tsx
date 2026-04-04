import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

export function Layout({ children, onLogout }: LayoutProps) {
  return (
    <div className="layout">
      <Navbar onLogout={onLogout} />
      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
}
