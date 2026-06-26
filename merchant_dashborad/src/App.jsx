import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import TransactionDetail from "./pages/TransactionDetail";
import Webhooks from "./pages/Webhooks";
import Settings from "./pages/Settings";

// Reads token directly from localStorage — no state dependency
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const merchant = localStorage.getItem("merchant");
  if (!token || !merchant) return <Navigate to="/login" replace />;
  return children;
};

// Redirect logged-in users away from login/register
const GuestRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const merchant = localStorage.getItem("merchant");
  if (token && merchant) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={
        <GuestRoute><Login /></GuestRoute>
      } />
      <Route path="/register" element={
        <GuestRoute><Register /></GuestRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/transactions" element={
        <ProtectedRoute><Layout><Transactions /></Layout></ProtectedRoute>
      } />
      <Route path="/intent/:id" element={
        <ProtectedRoute><Layout><TransactionDetail /></Layout></ProtectedRoute>
      } />
      <Route path="/webhooks" element={
        <ProtectedRoute><Layout><Webhooks /></Layout></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
