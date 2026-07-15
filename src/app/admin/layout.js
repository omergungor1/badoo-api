import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/shell";

export const metadata = {
  title: {
    default: "Admin",
    template: "%s | Badoo Admin",
  },
};

export default async function AdminLayout({ children }) {
  const user = await requireAdmin();
  return <AdminShell email={user.email}>{children}</AdminShell>;
}
