'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import BrandLogo from '@/components/BrandLogo';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Redirigir a login si no hay usuario autenticado
  useEffect(() => {
    if (!loading && !user && !isAuthRoute) {
      router.replace('/login');
    }
  }, [loading, user, isAuthRoute, router]);

  // Si es una ruta de autenticación, renderizar sin la cáscara del dashboard
  if (isAuthRoute) {
    return <main>{children}</main>;
  }

  // Mientras valida sesión inicial
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: 'var(--bg-primary)',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrandLogo size={48} />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-cyan)' }}>
          Cargando entorno seguro SafetyVision...
        </div>
      </div>
    );
  }

  // Si no hay usuario y no es ruta auth (mientras se ejecuta redirección)
  if (!user) {
    return null;
  }

  const userInitial = user.email ? user.email[0].toUpperCase() : 'U';

  return (
    <div className="app-wrapper">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="hamburger-btn"
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label="Abrir menú de navegación"
            >
              <span className="hamburger-icon" />
            </button>

            <div className="topbar-title">
              <div className="topbar-title-row">
                <h2>
                  SafetyVision
                  <span className="brand-ai">AI</span>
                </h2>
                <span className="status-pill">
                  <span className="status-pill-dot" />
                  EN LÍNEA
                </span>
              </div>
              <p className="topbar-subtitle">
                Plataforma Inteligente de Monitoreo y Cumplimiento de EPP en Tiempo Real
              </p>
            </div>
          </div>

          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/detect" className="btn btn-primary btn-sm detect-btn-topbar">
              <span>🔍</span>
              <span className="detect-btn-text">Nueva Detección</span>
            </Link>

            {/* User Pill conectado a Supabase */}
            <div className="user-pill" title={user.email ?? ''}>
              <div className="user-pill-avatar">{userInitial}</div>
              <span className="user-pill-email">{user.email}</span>
              <button
                type="button"
                className="user-pill-logout"
                onClick={async () => {
                  await signOut();
                  router.push('/login');
                }}
                title="Cerrar Sesión"
                aria-label="Cerrar Sesión"
              >
                🚪
              </button>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

