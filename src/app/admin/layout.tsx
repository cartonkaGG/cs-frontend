import { AdminAreaGuard } from "@/components/AdminAreaGuard";
import { AdminSubNav } from "@/components/AdminSubNav";
import { SiteShell } from "@/components/SiteShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <AdminAreaGuard>
        <div className="border-b border-cb-stroke/80 bg-cb-panel/25 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 text-sm">
            <AdminSubNav />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</div>
      </AdminAreaGuard>
    </SiteShell>
  );
}
