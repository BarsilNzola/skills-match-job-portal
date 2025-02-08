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
  
        // Check if the token is expired
        const currentTime = Date.now() / 1000; // Convert to seconds
        if (decodedToken.exp < currentTime) {
          console.log('Token expired, removing from localStorage.');
          localStorage.removeItem('authToken');
          setUser(null);
        } else {
          setUser(decodedToken); // Store decoded token if valid
        }
      } catch (error) {
        console.error('Invalid token', error);
        localStorage.removeItem('authToken');
        setUser(null);
      }
    } else {
      setUser(null);
    }
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
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
