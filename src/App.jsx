import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { SiteSettingsProvider } from "./context/SiteSettingsContext";
import { LanguageProvider } from "./context/LanguageContext";
import { NavigationProvider } from "./context/NavigationContext";
import AppRouter from "./routes/AppRouter";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SiteSettingsProvider>
          <LanguageProvider>
            <BrowserRouter>
              <NavigationProvider>
                <AppRouter />
              </NavigationProvider>
            </BrowserRouter>
          </LanguageProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
