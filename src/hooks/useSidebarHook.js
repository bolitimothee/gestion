import { useContext } from 'react';
import { SidebarContext } from '../context/SidebarContextBase';

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar doit être utilisé dans SidebarProvider');
  }
  return context;
};
