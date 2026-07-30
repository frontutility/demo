import { Navigate, useLocation } from "react-router-dom";
import LoadingScreen from "../common/LoadingScreen";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <LoadingScreen />;
  }

  if (!user?.loggedIn || !user?.id) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
