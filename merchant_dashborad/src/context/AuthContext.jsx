import { createContext, useContext, useState, useCallback } from "react";
import { authAPI } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [merchant, setMerchant] = useState(() => {
    try {
      const stored = localStorage.getItem("merchant");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token, merchant } = res.data;
    localStorage.setItem("token", token);
    localStorage.setItem("merchant", JSON.stringify(merchant));
    setMerchant(merchant);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("merchant");
    setMerchant(null);
  }, []);

  const updateMerchant = useCallback((updates) => {
    const updated = { ...merchant, ...updates };
    localStorage.setItem("merchant", JSON.stringify(updated));
    setMerchant(updated);
  }, [merchant]);

  return (
    <AuthContext.Provider value={{ merchant, login, logout, updateMerchant, isLoggedIn: !!merchant }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
