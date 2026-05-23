import { AppProvider } from '@/components/providers/AppProvider';
import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { AdminNav } from '@/components/admin/AdminNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen flex flex-col">
        <AdminTopbar />
        <div className="flex flex-1 min-h-0">
          <AdminNav />
          <main className="flex-1 min-w-0 min-h-0 p-4 md:p-6 pb-24 md:pb-6">{children}</main>
        </div>
      </div>
    </AppProvider>
  );
}
