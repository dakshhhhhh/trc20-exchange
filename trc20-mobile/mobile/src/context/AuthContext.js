import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('@trc20_token');
      if (storedToken) {
        const data = await authAPI.verify(storedToken);
        if (data.success) {
          setToken(storedToken);
          setUser(data.user);
        } else {
          await AsyncStorage.removeItem('@trc20_token');
        }
      }
    } catch (error) {
      await AsyncStorage.removeItem('@trc20_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    if (data.success) {
      await AsyncStorage.setItem('@trc20_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (name, email, phone, password, referralCode) => {
    const data = await authAPI.register({ name, email, phone, password, referralCode });
    if (data.success) {
      await AsyncStorage.setItem('@trc20_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('@trc20_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const data = await authAPI.verify(token);
      if (data.success) setUser(data.user);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
