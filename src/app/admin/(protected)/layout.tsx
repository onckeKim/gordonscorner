import { AdminNav } from '@/components/AdminNav';

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-corner-bg">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
