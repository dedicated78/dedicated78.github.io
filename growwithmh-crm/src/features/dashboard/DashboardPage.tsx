import { useAuth } from '@/features/auth/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { BdDashboard } from './BdDashboard';
import { OutreachDashboard } from './OutreachDashboard';

/** One route, three purpose-built landing screens. */
export function DashboardPage() {
  const { role } = useAuth();
  if (role === 'outreach') return <OutreachDashboard />;
  if (role === 'business_development') return <BdDashboard />;
  return <AdminDashboard />;
}
