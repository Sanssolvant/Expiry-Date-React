import { Suspense } from 'react';
import { Dashboard } from '@/components/Dashboard';

export default async function DashboardPage() {
  return (
    <>
      <Suspense>
        <Dashboard />
      </Suspense>
    </>
  );
}
