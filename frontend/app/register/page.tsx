'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import BrandLogo from '@/components/BrandLogo';

export default function RegisterPage() {
  const router = useRouter();
  const { user, signUp, loading: authLoading } = useAuth();
  const { addToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password || !confirmPassword) {
      setErrorMsg('Completa todos los campos obligatorios.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await signUp({ email: normalizedEmail, password });

      if (res.session) {
        addToast({
          type: 'success',
          title: '¡Cuenta creada!',
          message: 'Tu cuenta ha sido creada y has iniciado sesión.',
        });
        router.push('/');
      } else {
        setSuccessMsg(
          '¡Cuenta creada con éxito! Si tienes confirmación de correo habilitada en Supabase, revisa tu bandeja de entrada.'
        );
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'No se pudo crear la cuenta. Inténtalo nuevamente.');
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
          <h1 className="auth-title">Crear Cuenta</h1>
          <p className="auth-subtitle">
            Regístrate para comenzar a monitorear la seguridad de tu equipo
          </p>
        </div>

        {errorMsg && (
          <div className="auth-banner-error" style={{ marginBottom: 18 }}>
            <span>⚠️</span>
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="auth-banner-success" style={{ marginBottom: 18 }}>
            <span>✅</span>
            <div>{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-group">
            <label className="auth-label" htmlFor="register-email">
              Correo Electrónico
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">✉️</span>
              <input
                id="register-email"
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
            <label className="auth-label" htmlFor="register-password">
              Contraseña (mínimo 6 caracteres)
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                className="auth-input"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
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

          <div className="auth-group">
            <label className="auth-label" htmlFor="register-confirm">
              Confirmar Contraseña
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="register-confirm"
                type={showPassword ? 'text' : 'password'}
                required
                className="auth-input"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? (
              <span>Creando cuenta...</span>
            ) : (
              <>
                <span>Registrarme</span>
                <span>➔</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <div>
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="auth-link">
              Inicia sesión aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
