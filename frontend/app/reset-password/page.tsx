'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import BrandLogo from '@/components/BrandLogo';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const { addToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      setErrorMsg('Completa ambos campos de contraseña.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      await updatePassword(password);
      addToast({
        type: 'success',
        title: '¡Contraseña actualizada!',
        message: 'Tu contraseña ha sido restablecida exitosamente.',
      });
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err?.message || 'No se pudo actualizar la contraseña. El enlace puede haber caducado.'
      );
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
          <h1 className="auth-title">Nueva Contraseña</h1>
          <p className="auth-subtitle">
            Ingresa y confirma tu nueva contraseña para acceder a la plataforma
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
            <label className="auth-label" htmlFor="reset-pass">
              Nueva Contraseña
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="reset-pass"
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
                aria-label="Alternar visibilidad"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="auth-group">
            <label className="auth-label" htmlFor="reset-confirm">
              Confirmar Nueva Contraseña
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="reset-confirm"
                type={showPassword ? 'text' : 'password'}
                required
                className="auth-input"
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? <span>Guardando cambios...</span> : <span>Actualizar Contraseña</span>}
          </button>
        </form>

        <div className="auth-footer">
          <div>
            <Link href="/login" className="auth-link">
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
