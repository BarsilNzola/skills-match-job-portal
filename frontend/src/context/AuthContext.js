import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    console.log('Token in localStorage:', token);

    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        console.log('Decoded Token in AuthContext:', decodedToken);

        setUser(decodedToken);  // Store decoded token
      } catch (error) {
        console.error('Invalid token', error);
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
