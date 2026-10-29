
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { authService } from '../../../infrastructure/supabase/authService';

interface ForgotPasswordScreenProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordScreen({
  onBackToLogin,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRequestReset = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      Alert.alert(
        'Correo obligatorio',
        'Introduce el correo electrónico de tu cuenta.',
      );
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      Alert.alert(
        'Correo no válido',
        'Introduce una dirección de correo válida.',
      );
      return;
    }

    setLoading(true);

    try {
      await authService.requestPasswordReset(normalizedEmail);
      setSubmitted(true);
    } catch {
      Alert.alert(
        'No se pudo procesar la solicitud',
        'Inténtalo nuevamente más tarde.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={onBackToLogin}
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio de sesión"
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Recuperar contraseña</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconContainer}>
          <Text style={styles.mailIcon}>✉</Text>
        </View>

        {submitted ? (
          <>
            <Text style={styles.title}>Revisa tu correo</Text>

            <Text style={styles.description}>
              Si existe una cuenta asociada a esa dirección, recibirás
              un correo con instrucciones para recuperar tu contraseña.
              Revisa también la carpeta de correo no deseado.
            </Text>

            <View style={styles.emailCard}>
              <Text style={styles.emailLabel}>Correo indicado</Text>
              <Text style={styles.emailValue}>{email.trim()}</Text>
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={onBackToLogin}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>
                Volver al inicio de sesión
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => setSubmitted(false)}
            >
              <Text style={styles.secondaryButtonText}>
                Usar otro correo
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>

            <Text style={styles.description}>
              No te preocupes. Introduce el correo electrónico de tu
              cuenta y te enviaremos instrucciones para recuperar
              el acceso a SafeSite AI.
            </Text>

            <Text style={styles.label}>Correo electrónico</Text>

            <TextInput
              style={styles.input}
              placeholder="nombre@ejemplo.com"
              placeholderTextColor="#98A5AB"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              accessibilityLabel="Correo electrónico"
              returnKeyType="send"
              onSubmitEditing={handleRequestReset}
              editable={!loading}
            />

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Recuperación segura</Text>
              <Text style={styles.infoText}>
                El enlace de recuperación se enviará por correo. No
                compartas ese enlace con otras personas.
              </Text>
            </View>

            <Pressable
              style={[
                styles.primaryButton,
                loading && styles.disabledButton,
              ]}
              onPress={handleRequestReset}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Enviar enlace de recuperación
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={onBackToLogin}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>
                Volver al inicio de sesión
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F2',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#23333D',
    fontSize: 32,
    lineHeight: 36,
    marginTop: -4,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 14,
    color: '#23333D',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 76,
    height: 76,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F9F3',
    borderRadius: 24,
    marginBottom: 24,
  },
  mailIcon: {
    color: '#0BBF9A',
    fontSize: 40,
    fontWeight: '600',
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#23333D',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#74838B',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#23333D',
    marginBottom: 9,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#DDE6E8',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 14,
    color: '#23333D',
    backgroundColor: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#F3F7F8',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#23333D',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#74838B',
    lineHeight: 20,
  },
  emailCard: {
    backgroundColor: '#F3F7F8',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  emailLabel: {
    color: '#74838B',
    fontSize: 12,
    marginBottom: 5,
  },
  emailValue: {
    color: '#23333D',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: '#0BBF9A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#0BBF9A',
    fontSize: 14,
    fontWeight: '700',
  },
});
