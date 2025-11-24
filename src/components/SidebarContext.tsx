import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  hideMobileNav: boolean;
  setHideMobileNav: (hide: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [hideMobileNav, setHideMobileNav] = useState(false);

  return (
    <SidebarContext.Provider value={{ hideMobileNav, setHideMobileNav }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

