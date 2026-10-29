
import { supabase } from './supabaseClient';

export interface SignUpInput {
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export const authService = {
  async signUp({ email, password }: SignUpInput) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  async signIn({ email, password }: SignInInput) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return data.session;
  },

  
  async getUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return data.user;
  },

  
  async updatePassword(password: string) {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!sessionData.session) {
      throw new Error(
        'Tu sesión ha caducado. Solicita un nuevo enlace de recuperación.',
      );
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw error;
    }
  },


  async requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim(),
    {
      redirectTo: 'safesite://reset-password',
    },
  );

  if (error) {
    throw error;
  }
},


  async verifyPasswordRecovery(
    accessToken: string,
    refreshToken: string,
  ) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    return data.session;
  },

  
async verifyPasswordRecoveryCode(code: string) {
  const { data, error } =
    await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  return data.session;
},


  
onAuthStateChange(
  callback: (
    event: string,
    session: import('@supabase/supabase-js').Session | null,
  ) => void,
) {
  return supabase.auth.onAuthStateChange(callback);
},

};
