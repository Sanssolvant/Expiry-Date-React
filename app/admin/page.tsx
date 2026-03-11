import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/app/lib/admin-access';
import { AdminDashboard } from '@/components/Admin/AdminDashboard';

export default async function AdminPage() {
  const access = await getAdminAccess();
  if (!access.ok) {
    redirect('/dashboard');
  }

  const adminDisplayName = access.user.name?.trim() || access.user.email;
  return <AdminDashboard adminDisplayName={adminDisplayName} />;
}
