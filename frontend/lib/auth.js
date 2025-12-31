'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async (username, password) => {},
  logout: () => {},
  isAuthenticated: false,
  hasPermission: (permission) => false,
  hasRole: (role) => false,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    if (token && username && role) {
      // Verify token with backend
      verifyToken(token, username, role);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (token, username, role) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser({
          username: userData.username,
          role: userData.role,
          permissions: userData.permissions,
          token,
        });
      } else {
        // Token invalid, clear storage
        logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const response = await fetch('http://localhost:8000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }

    const data = await response.json();

    // Fetch user permissions
    const meResponse = await fetch('http://localhost:8000/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${data.access_token}`,
      },
    });

    const userData = await meResponse.json();

    // Store in localStorage
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('username', data.username);
    localStorage.setItem('role', data.role);

    setUser({
      username: data.username,
      role: data.role,
      permissions: userData.permissions,
      token: data.access_token,
    });

    return data;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    setUser(null);
    window.location.href = 'http://localhost:3000/';
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protecting pages
export function withAuth(Component, options = {}) {
  return function ProtectedRoute(props) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { requiredPermission, requiredRole } = options;

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login');
        return;
      }

      if (user) {
        // Check permission if specified
        if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
          router.push('/unauthorized');
          return;
        }

        // Check role if specified
        if (requiredRole && user.role !== requiredRole) {
          router.push('/unauthorized');
          return;
        }
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!user) {
      return null;
    }

    // Check permissions/roles before rendering
    if (requiredPermission && !user.permissions?.includes(requiredPermission)) {
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      return null;
    }

    return <Component {...props} />;
  };
}
