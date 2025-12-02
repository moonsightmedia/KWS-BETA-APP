import { createContext, useContext, useState, ReactNode } from 'react';

type ActiveRole = 'user' | 'setter' | 'admin';

interface RoleTabContextType {
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
}

const RoleTabContext = createContext<RoleTabContextType | undefined>(undefined);

export const RoleTabProvider = ({ children }: { children: ReactNode }) => {
  const [activeRole, setActiveRole] = useState<ActiveRole>('user');

  return (
    <RoleTabContext.Provider value={{ activeRole, setActiveRole }}>
      {children}
    </RoleTabContext.Provider>
  );
};

export const useRoleTab = () => {
  const context = useContext(RoleTabContext);
  if (context === undefined) {
    throw new Error('useRoleTab must be used within a RoleTabProvider');
  }
  return context;
};

