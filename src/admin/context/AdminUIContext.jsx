import { createContext, useContext } from "react";

const AdminUIContext = createContext(null);

export function AdminUIProvider({ value, children }) {
  return <AdminUIContext.Provider value={value}>{children}</AdminUIContext.Provider>;
}

export function useAdminUI() {
  const context = useContext(AdminUIContext);
  if (!context) throw new Error("useAdminUI must be used within AdminUIProvider");
  return context;
}

