// auth.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Called after successful login
  const login = (token) => {
    sessionStorage.setItem('authToken', token);
    try {
      const decoded = jwtDecode(token);
      setUser(decoded); // Set user info from token
    } catch (err) {
      console.error('Invalid token:', err);
      sessionStorage.removeItem('authToken');
    }
  };

  // Called when user logs out
  const logout = () => {
    sessionStorage.removeItem('authToken');
    setUser(null);
  };

  // Load user from token on page refresh
  useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (err) {
        console.error('Failed to decode token on load:', err);
        sessionStorage.removeItem('authToken');
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext);