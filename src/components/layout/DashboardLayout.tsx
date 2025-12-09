import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from '@/components/CommandPalette';
import FloatingAIButton from '@/components/FloatingAIButton';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Background mesh gradient */}
      <div className="fixed inset-0 bg-mesh-gradient opacity-50 pointer-events-none" />
      
      <Sidebar />
      <div className="flex-1 flex flex-col ml-72 relative">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      
      <CommandPalette />
      <FloatingAIButton />
    </div>
  );
}
