import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

// Defining what our User data looks like based on our JWT payload
interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

// Define the functions our context will provide to the rest of the app
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // When the app loads, check if they already have a token saved in localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      try {
        const decodedUser = jwtDecode<User>(savedToken);
        setToken(savedToken);
        setUser(decodedUser);
      } catch (error) {
        console.error("Invalid token found, logging out.");
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // The function to call when the login API returns success
  const login = (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(jwtDecode<User>(newToken));
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};


// Custom hook so components can just do: const { user, login } = useAuth();
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};