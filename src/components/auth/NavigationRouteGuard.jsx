import { Navigate, useLocation } from "react-router-dom";
import LoadingScreen from "../common/LoadingScreen";
import { useNavigation } from "../../context/NavigationContext";

function routeMatches(route, pathname) {
  const baseRoute = String(route || "").split("?")[0].replace(/\/$/, "") || "/";
  const current = String(pathname || "").replace(/\/$/, "") || "/";
  if (baseRoute === "/") return current === "/";
  return current === baseRoute || current.startsWith(`${baseRoute}/`);
}

export default function NavigationRouteGuard({ route, children }) {
  const location = useLocation();
  const { items, loading, failed } = useNavigation();

  if (loading) return <LoadingScreen />;
  if (failed || (!loading && !items.some((item) => item.enabled && routeMatches(item.route, route || location.pathname)))) {
    return <Navigate to="/__navigation-disabled" replace state={{ from: location.pathname }} />;
  }
  return children;
}

export function NavigationDisabledPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section style={{ textAlign: "center" }}>
        <h1>404</h1>
        <p>This page is not available.</p>
      </section>
    </main>
  );
}
