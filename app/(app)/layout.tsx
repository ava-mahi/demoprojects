import { AppProvider } from '@/components/providers/AppProvider';
import { Topbar } from '@/components/shell/Topbar';
import { SideNav } from '@/components/shell/SideNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen flex flex-col">
        <Topbar />
        <div className="flex flex-1 min-h-0">
          <SideNav />
          <main className="flex-1 min-w-0 min-h-0">{children}</main>
        </div>
      </div>
    </AppProvider>
  );
}
