import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import LeftSidebar from "../components/layout/LeftSidebar";
import RightSidebar from "../components/layout/RightSidebar";
// import Footer from "../components/common/Footer";
import { useEffect, useState } from "react";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import NavigationRouteGuard from "../components/auth/NavigationRouteGuard";

function controlledRoute(pathname) {
  const path = pathname.split("?")[0];
  if (path === "/" || path === "/search" || path === "/news" || path.startsWith("/news/") || path === "/donation" || path === "/help-center" || path.startsWith("/help-center/") || path === "/settings" || path === "/login" || path === "/register" || path === "/post/new" || path === "/business-directory" || path.startsWith("/business/") || path.startsWith("/profile") || path.startsWith("/pages/")) {
    return path.startsWith("/profile") ? "/profile" : path.startsWith("/pages/") ? "/pages" : path.startsWith("/news/") ? "/news" : path.startsWith("/help-center/") ? "/help-center" : path.startsWith("/business/") ? "/business-directory" : path;
  }
  return null;
}

export default function RootLayout() {
  const [search, setSearch] = useState("");
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const location = useLocation();
  const isCompactPage = ["/login", "/register"].includes(location.pathname);

  useEffect(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, [location.pathname]);

  if (isCompactPage) {
    return (
      <div className="app-shell">
        <Navbar
          onOpenLeft={() => {
            setLeftOpen(true);
          }}
          onOpenRight={() => {
            setRightOpen(true);
          }}
        />
        <main style={{ paddingTop: 100 }}>
          {controlledRoute(location.pathname) ? (
            <NavigationRouteGuard route={controlledRoute(location.pathname)}>
              <Outlet context={{ search, setSearch }} />
            </NavigationRouteGuard>
          ) : <Outlet context={{ search, setSearch }} />}
        </main>
        {/* <Footer /> */}
        <MobileBottomNav
          onOpenLeft={() => {
            setRightOpen(false);
            setLeftOpen(true);
          }}
          onOpenRight={() => {
            setLeftOpen(false);
            setRightOpen(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar
        onOpenLeft={() => {
          setLeftOpen(true);
        }}
        onOpenRight={() => {
          setRightOpen(true);
        }}
      />
      <div className="page-grid">
        <LeftSidebar />
        <main className="main-column">
          {controlledRoute(location.pathname) ? (
            <NavigationRouteGuard route={controlledRoute(location.pathname)}>
              <Outlet context={{ search, setSearch }} />
            </NavigationRouteGuard>
          ) : <Outlet context={{ search, setSearch }} />}
        </main>
        <RightSidebar />
      </div>
      <div className={`mobile-drawer-overlay ${leftOpen ? "open" : ""}`} onClick={() => setLeftOpen(false)} />
      <div className={`mobile-drawer left ${leftOpen ? "open" : ""}`}>
        <div className="mobile-drawer-head">
          <strong>Menu</strong>
          <button className="btn btn-ghost" type="button" onClick={() => setLeftOpen(false)}>
            Close
          </button>
        </div>
        <LeftSidebar mobile onClose={() => setLeftOpen(false)} />
      </div>
      <div className={`mobile-drawer-overlay ${rightOpen ? "open" : ""}`} onClick={() => setRightOpen(false)} />
      <div className={`mobile-drawer right ${rightOpen ? "open" : ""}`}>
        <div className="mobile-drawer-head">
          <strong>Top Posts</strong>
          <button className="btn btn-ghost" type="button" onClick={() => setRightOpen(false)}>
            Close
          </button>
        </div>
        <RightSidebar mobile onClose={() => setRightOpen(false)} />
      </div>
      <MobileBottomNav
        onOpenLeft={() => {
          setRightOpen(false);
          setLeftOpen(true);
        }}
        onOpenRight={() => {
          setLeftOpen(false);
          setRightOpen(true);
        }}
      />
      {/* <Footer /> */}
    </div>
  );
}
