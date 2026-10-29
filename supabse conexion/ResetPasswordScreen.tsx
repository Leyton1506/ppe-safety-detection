
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

interface ResetPasswordScreenProps {
  onBackToLogin: () => void;
}

export default function ResetPasswordScreen({
  onBackToLogin,
}: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert(
        'Campos obligatorios',
        'Ingresa y confirma tu nueva contraseña.',
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        'Contraseña no válida',
        'La contraseña debe tener al menos 8 caracteres.',
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Las contraseñas no coinciden',
        'Verifica que ambas contraseñas sean iguales.',
      );
      return;
    }

    try {
      setLoading(true);

      await authService.updatePassword(password);

      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña se ha cambiado correctamente.',
        [
          {
            text: 'Volver al inicio de sesión',
            onPress: onBackToLogin,
          },
        ],
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la contraseña.';

      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
          </View>

          <Text style={styles.title}>Nueva contraseña</Text>

          <Text style={styles.subtitle}>
            Crea una contraseña segura para volver a acceder a SafeSite AI.
          </Text>

          <Text style={styles.label}>Nueva contraseña</Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#8A989F"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
            />

            <Pressable
              onPress={() => setShowPassword((previous) => !previous)}
              style={styles.visibilityButton}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
              }
            >
              <Text style={styles.visibilityText}>
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Confirmar contraseña</Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Repite la nueva contraseña"
              placeholderTextColor="#8A989F"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              onSubmitEditing={handleResetPassword}
              returnKeyType="done"
            />

            <Pressable
              onPress={() =>
                setShowConfirmPassword((previous) => !previous)
              }
              style={styles.visibilityButton}
              accessibilityRole="button"
              accessibilityLabel={
                showConfirmPassword
                  ? 'Ocultar confirmación'
                  : 'Mostrar confirmación'
              }
            >
              <Text style={styles.visibilityText}>
                {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.helperText}>
            Utiliza al menos 8 caracteres y evita compartir tu contraseña.
          </Text>

          <Pressable
            style={[
              styles.submitButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleResetPassword}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                Actualizar contraseña
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.backButton}
            onPress={onBackToLogin}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>
              Volver al inicio de sesión
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F7F8',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  container: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DDF8F1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#23333D',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#74838B',
    textAlign: 'center',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#23333D',
    marginBottom: 8,
  },
  passwordContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D9E2E5',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#23333D',
  },
  visibilityButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0A9F81',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#74838B',
    marginTop: -8,
    marginBottom: 24,
  },
  submitButton: {
    minHeight: 54,
    backgroundColor: '#0BBF9A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A9F81',
  },
});
