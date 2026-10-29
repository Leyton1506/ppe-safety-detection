import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { authService } from "../../../infrastructure/supabase/authService";

interface RegisterScreenProps {
  onBackToLogin: () => void;
}

export default function RegisterScreen({ onBackToLogin }: RegisterScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleRegister = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password || !confirmPassword) {
      setIsError(true);
      setMessage("Completa todos los campos.");
      return;
    }

    if (password.length < 6) {
      setIsError(true);
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setIsError(false);

      const { session } = await authService.signUp({
        email: normalizedEmail,
        password,
      });

      if (session) {
        setMessage("Cuenta creada correctamente. Ya puedes continuar.");
      } else {
        setMessage(
          "Cuenta creada, pero no se inició sesión automáticamente. Intenta iniciar sesión.",
        );
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo crear la cuenta. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>S</Text>
        </View>

        <Text style={styles.title}>SafeSite AI</Text>
        <Text style={styles.subtitle}>
          Crea tu cuenta para proteger tu entorno laboral
        </Text>

        <View style={styles.card}>
          <Text style={styles.heading}>Crear cuenta</Text>
          <Text style={styles.description}>
            Regístrate para comenzar a utilizar el análisis de seguridad.
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
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#94A3A8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>Confirmar contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Escribe nuevamente la contraseña"
            placeholderTextColor="#94A3A8"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            onSubmitEditing={() => void handleRegister()}
            returnKeyType="go"
          />

          {message ? (
            <Text
              accessibilityRole="alert"
              style={isError ? styles.error : styles.success}
            >
              {message}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && !loading ? styles.buttonPressed : null,
              loading ? styles.buttonDisabled : null,
            ]}
            onPress={() => void handleRegister()}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.linkButton}
            onPress={onBackToLogin}
            disabled={loading}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>
              ¿Ya tienes cuenta? Inicia sesión
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
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  logoContainer: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#0BBF9A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
  },
  title: {
    color: "#23333D",
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#74838B",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#F3F7F8",
    borderRadius: 22,
    padding: 22,
  },
  heading: {
    color: "#23333D",
    fontSize: 22,
    fontWeight: "700",
  },
  description: {
    color: "#74838B",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 20,
  },
  label: {
    color: "#23333D",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFE7E9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#23333D",
    fontSize: 15,
    marginBottom: 16,
  },
  error: {
    color: "#C0392B",
    fontSize: 13,
    marginBottom: 14,
  },
  success: {
    color: "#16805D",
    fontSize: 13,
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#0BBF9A",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
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
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  linkButton: {
    alignItems: "center",
    paddingTop: 18,
  },
  linkText: {
    color: "#0A9F81",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    color: "#94A3A8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 22,
  },
});
