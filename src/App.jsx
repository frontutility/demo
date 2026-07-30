import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { SiteSettingsProvider, useSiteSettings } from "./context/SiteSettingsContext";
import { LanguageProvider } from "./context/LanguageContext";
import { NavigationProvider } from "./context/NavigationContext";
import AppRouter from "./routes/AppRouter";
import MaintenancePage from "./pages/static/MaintenancePage";

function AppContent() {
  const { maintenanceMode } = useSiteSettings();
  const isAdmin = Boolean(
    localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken")
  );

  if (maintenanceMode && !isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <NavigationProvider>
      <AppRouter />
    </NavigationProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SiteSettingsProvider>
          <LanguageProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </LanguageProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
