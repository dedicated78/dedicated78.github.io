import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AuthProvider } from '@/features/auth/AuthContext';
import { LoginPage } from '@/features/auth/LoginPage';
import { FullScreen, FullScreenSpinner, RequireAuth, RequireRole } from '@/features/auth/guards';
import { ConfirmProvider, ToastProvider } from '@/components/overlays';
import { AppLayout } from '@/layouts/AppLayout';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { LeadsPage } from '@/features/leads/LeadsPage';
import { LeadDetailPage } from '@/features/leads/LeadDetailPage';
import { DealsPage } from '@/features/deals/DealsPage';
import { DealDetailPage } from '@/features/deals/DealDetailPage';
import { ClientsPage } from '@/features/clients/ClientsPage';
import { ClientDetailPage } from '@/features/clients/ClientDetailPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { EmptyState, LinkButton } from '@/components/ui';

// Heavier, admin-only screen loaded on demand.
const UploadResearchPage = lazy(() => import('@/features/leads/UploadResearchPage').then((m) => ({ default: m.UploadResearchPage })));

function NotFound() {
  return (
    <EmptyState title="Page not found" action={<LinkButton to="/dashboard">Go to dashboard</LinkButton>}>
      That page doesn’t exist.
    </EmptyState>
  );
}

function ConfigMissing() {
  return (
    <FullScreen>
      <div className="max-w-md rounded-card border border-line bg-surface p-6 text-left shadow-card">
        <h1 className="text-base font-semibold text-ink">Supabase isn’t configured</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Copy <code className="rounded bg-sunken px-1">.env.example</code> to <code className="rounded bg-sunken px-1">.env</code>, set <code className="rounded bg-sunken px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-sunken px-1">VITE_SUPABASE_ANON_KEY</code>, then rebuild. See the README for the full setup.
        </p>
      </div>
    </FullScreen>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <ConfigMissing />;

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <HashRouter>
              <Suspense fallback={<FullScreenSpinner />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route element={<RequireAuth />}>
                    <Route element={<AppLayout />}>
                      <Route index element={<Navigate to="/dashboard" replace />} />
                      <Route path="dashboard" element={<DashboardPage />} />
                      <Route path="leads" element={<LeadsPage />} />
                      <Route
                        path="leads/upload"
                        element={
                          <RequireRole roles={['admin']}>
                            <UploadResearchPage />
                          </RequireRole>
                        }
                      />
                      <Route path="leads/:id" element={<LeadDetailPage />} />
                      <Route
                        path="deals"
                        element={
                          <RequireRole roles={['admin', 'business_development']}>
                            <DealsPage />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="deals/:id"
                        element={
                          <RequireRole roles={['admin', 'business_development']}>
                            <DealDetailPage />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="clients"
                        element={
                          <RequireRole roles={['admin', 'business_development']}>
                            <ClientsPage />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="clients/:id"
                        element={
                          <RequireRole roles={['admin', 'business_development']}>
                            <ClientDetailPage />
                          </RequireRole>
                        }
                      />
                      <Route
                        path="settings"
                        element={
                          <RequireRole roles={['admin']}>
                            <SettingsPage />
                          </RequireRole>
                        }
                      />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </HashRouter>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
