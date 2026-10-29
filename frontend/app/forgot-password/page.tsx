'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import BrandLogo from '@/components/BrandLogo';

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setErrorMsg('Ingresa tu correo electrónico.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      await requestPasswordReset(normalizedEmail);
      setSuccessMsg(
        'Te hemos enviado un correo con las instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada o spam.'
      );
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'No se pudo procesar la solicitud. Inténtalo de nuevo.');
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
          <h1 className="auth-title">Recuperar Contraseña</h1>
          <p className="auth-subtitle">
            Ingresa tu correo asociado y te enviaremos un enlace de recuperación seguro
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
            <label className="auth-label" htmlFor="forgot-email">
              Correo Electrónico
            </label>
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">✉️</span>
              <input
                id="forgot-email"
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

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? <span>Enviando enlace...</span> : <span>Enviar Enlace de Recuperación</span>}
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
