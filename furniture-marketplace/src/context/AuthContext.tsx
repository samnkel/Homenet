import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { User, UserRole } from '../types';
import * as api from '../services/api';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{
    success: boolean;
    error?: string;
    role?: UserRole;
    mustChangePassword?: boolean;
  }>;
  register: (details: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  changeTemporaryPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (
    currentPassword: string,
    confirmation: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(apiUser: api.ApiUser): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    firstName: apiUser.firstName,
    lastName: apiUser.lastName,
    phone: apiUser.phone ?? undefined,
    avatar: apiUser.avatar ?? undefined,
    role: apiUser.role as UserRole,
    mustChangePassword: apiUser.mustChangePassword ?? false,
    createdAt: apiUser.createdAt,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api.getToken()) {
      setLoading(false);
      return;
    }
    api
      .getCurrentUser()
      .then((currentUser) => setUser(mapUser(currentUser)))
      .catch((error: unknown) => {
        console.error('Unable to restore backend session:', error);
        api.logout();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const authenticatedUser = await api.login(email, password);
      setUser(mapUser(authenticatedUser));
      return {
        success: true,
        role: authenticatedUser.role,
        mustChangePassword: authenticatedUser.mustChangePassword ?? false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const register = async (details: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) => {
    try {
      const registeredUser = await api.register(details);
      setUser(mapUser(registeredUser));
      return { success: true, role: registeredUser.role };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const changeTemporaryPassword = async (password: string) => {
    try {
      const updatedUser = await api.changeTemporaryPassword(password);
      setUser(mapUser(updatedUser));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password update failed',
      };
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    try {
      const updatedUser = await api.changePassword(currentPassword, newPassword);
      setUser(mapUser(updatedUser));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password update failed',
      };
    }
  };

  const deleteAccount = async (currentPassword: string, confirmation: string) => {
    try {
      await api.deleteCustomerAccount(currentPassword, confirmation);
      api.logout();
      setUser(null);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Account deletion failed',
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isSeller: user?.role === 'seller',
        isAdmin: user?.role === 'admin',
        loading,
        login,
        register,
        changeTemporaryPassword,
        changePassword,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
