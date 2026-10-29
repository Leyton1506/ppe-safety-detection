import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { authService } from '../../../infrastructure/supabase/authService';
import ForgotPasswordScreen from './ForgotPasswordScreen';

interface LoginScreenProps {
  onOpenRegister: () => void;
  onForgotPassword: () => void;
}

export default function LoginScreen({
  onOpenRegister,
  onForgotPassword,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Ingresa tu correo electrónico y contraseña.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      await authService.signIn({
        email: email.trim(),
        password,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo iniciar sesión. Inténtalo nuevamente.';

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>S</Text>
        </View>

        <Text style={styles.title}>SafeSite AI</Text>
        <Text style={styles.subtitle}>
          Seguridad inteligente para el entorno laboral
        </Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Bienvenido de nuevo</Text>
          <Text style={styles.description}>
            Inicia sesión para continuar.
          </Text>

          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            placeholder="nombre@empresa.com"
            placeholderTextColor="#94A3A8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Ingresa tu contraseña"
            placeholderTextColor="#94A3A8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            onSubmitEditing={() => void handleLogin()}
            returnKeyType="go"
          />

          <Pressable
            style={styles.forgotPasswordLink}
            onPress={onForgotPassword}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.forgotPasswordText}>
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>

          {errorMessage ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && !loading ? styles.buttonPressed : null,
              loading ? styles.buttonDisabled : null,
            ]}
            onPress={() => void handleLogin()}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Iniciar sesión</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.registerLink}
            onPress={onOpenRegister}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.registerLinkText}>
              ¿No tienes cuenta? Regístrate
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          SafeSite AI · Protección personal en el trabajo
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoContainer: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#0BBF9A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
  },
  title: {
    color: '#23333D',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#74838B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },
  card: {
    backgroundColor: '#F3F7F8',
    borderRadius: 22,
    padding: 22,
  },
  heading: {
    color: '#23333D',
    fontSize: 22,
    fontWeight: '700',
  },
  description: {
    color: '#74838B',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 24,
  },
  label: {
    color: '#23333D',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE7E9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#23333D',
    fontSize: 15,
    marginBottom: 18,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: '#0A9F81',
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: '#C0392B',
    fontSize: 13,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#0BBF9A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    color: '#94A3A8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 26,
  },
  registerLink: {
    alignItems: 'center',
    paddingTop: 18,
  },
  registerLinkText: {
    color: '#0A9F81',
    fontSize: 14,
    fontWeight: '600',
  },
});