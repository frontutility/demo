import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { resolveMediaUrl } from "../utils/profile";

const defaultSettings = {
  websiteName: "ConnectNKT",
  websiteTagline: "Connect Your Town",
  websiteDescription: "A community network for villages, updates, and trusted local conversations.",
  defaultTheme: "light",
  logoUrl: "",
  faviconUrl: "",
  contactEmail: "connectnkt@gmail.com",
  contactPhone: "",
  facebookUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  enableSuggestions: true,
  suggestionsInterval: 10,
  suggestionsCount: 6,
};

const SiteSettingsContext = createContext(null);

function normalizeSettings(payload = {}) {
  return {
    ...defaultSettings,
    ...payload,
    websiteName: payload.websiteName || payload.website_name || defaultSettings.websiteName,
    websiteTagline: payload.websiteTagline || payload.website_tagline || defaultSettings.websiteTagline,
    websiteDescription: payload.websiteDescription || payload.website_description || defaultSettings.websiteDescription,
    defaultTheme: payload.defaultTheme || payload.default_theme || defaultSettings.defaultTheme,
    logoUrl: payload.logoUrl || payload.logo_url || payload.logo || "",
    faviconUrl: payload.faviconUrl || payload.favicon_url || payload.favicon || "",
    contactEmail: payload.contactEmail || payload.contact_email || "",
    contactPhone: payload.contactPhone || payload.contact_phone || "",
    facebookUrl: payload.facebookUrl || payload.facebook_url || "",
    instagramUrl: payload.instagramUrl || payload.instagram_url || "",
    youtubeUrl: payload.youtubeUrl || payload.youtube_url || "",
    enableSuggestions: payload.enableSuggestions ?? payload.enable_suggestions ?? defaultSettings.enableSuggestions,
    suggestionsInterval: payload.suggestionsInterval ?? payload.suggestions_interval ?? defaultSettings.suggestionsInterval,
    suggestionsCount: payload.suggestionsCount ?? payload.suggestions_count ?? defaultSettings.suggestionsCount,
  };
}

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    api
      .get("/api/settings")
      .then((response) => {
        const payload = response.data?.data ?? response.data ?? {};
        if (isActive) {
          setSettings(normalizeSettings(payload));
        }
      })
      .catch(() => {
        if (isActive) {
          setSettings(defaultSettings);
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const siteName = settings.websiteName || defaultSettings.websiteName;
    document.title = siteName;

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute("content", settings.websiteDescription || defaultSettings.websiteDescription);
    }

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", settings.defaultTheme === "dark" ? "#020617" : "#0f172a");
    }

    const faviconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    if (faviconLink) {
      const faviconUrl = settings.faviconUrl ? resolveMediaUrl(settings.faviconUrl) : "/favicon-96x96.png";
      faviconLink.setAttribute("href", faviconUrl);
    }
  }, [settings]);

  const value = useMemo(() => ({
    settings,
    loading,
    siteName: settings.websiteName || defaultSettings.websiteName,
    siteTagline: settings.websiteTagline || defaultSettings.websiteTagline,
    siteDescription: settings.websiteDescription || defaultSettings.websiteDescription,
    logoUrl: settings.logoUrl ? resolveMediaUrl(settings.logoUrl) : "/logo.png",
    faviconUrl: settings.faviconUrl ? resolveMediaUrl(settings.faviconUrl) : "/favicon-96x96.png",
  }), [loading, settings]);

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  }
  return context;
}
