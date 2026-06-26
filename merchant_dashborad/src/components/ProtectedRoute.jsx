// No longer used — route protection is handled directly in App.jsx
// Kept to avoid import errors if referenced anywhere
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const merchant = localStorage.getItem("merchant");
  if (!token || !merchant) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
