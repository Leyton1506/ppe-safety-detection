'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import BrandLogo from '@/components/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Si ya tiene sesión, redirigir al dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Ingresa tu correo electrónico y contraseña.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await signIn({ email: email.trim(), password });
      addToast({
        type: 'success',
        title: '¡Bienvenido!',
        message: 'Sesión iniciada correctamente.',
      });
      router.push('/');
    } catch (err: any) {
      console.error(err);
      const message =
        err?.message?.includes('Invalid login credentials')
          ? 'Correo o contraseña incorrectos. Verifica tus credenciales.'
          : err?.message || 'No se pudo iniciar sesión. Inténtalo nuevamente.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <BrandLogo size={32} />
          </div>
          <h1 className="auth-title">SafeSite AI</h1>
          <p className="auth-subtitle">
            Seguridad inteligente para el entorno laboral e inspección de EPP
          </p>
        </div>

        {errorMsg && (
          <div className="auth-banner-error" style={{ marginBottom: 18 }}>
            <span>⚠️</span>
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-group">
            <label className="auth-label" htmlFor="login-email">
              Correo Electrónico
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">✉️</span>
              <input
                id="login-email"
                type="email"
                required
                className="auth-input"
                placeholder="correo@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-group">
            <div className="auth-label">
              <label htmlFor="login-password">Contraseña</label>
              <Link href="/forgot-password" className="auth-link" style={{ fontSize: 12 }}>
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                className="auth-input"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-toggle-pass"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label="Alternar visibilidad de contraseña"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? (
              <span>Iniciando sesión...</span>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <span>➔</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <div>
            ¿No tienes una cuenta aún?{' '}
            <Link href="/register" className="auth-link">
              Regístrate aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
