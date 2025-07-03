import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          localStorage.removeItem('authToken');
          setUser(null);
        } else {
          setUser(decoded);
        }
      } catch {
        localStorage.removeItem('authToken');
        setUser(null);
      }
    }
    setLoading(false); // ✅ Set loading to false after checking
  }, []);
  
  // ✅ Add login function
  const login = (token) => {
    localStorage.setItem('authToken', token); // Store token
    const decodedToken = jwtDecode(token);
    setUser(decodedToken); // Update state immediately
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    window.location.href = "/login"; // Force redirect
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
