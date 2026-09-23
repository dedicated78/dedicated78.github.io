import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './state/AppContext';
import { Shell } from './components/Shell';
import { Spinner } from './components/ui';
import { AuthPage } from './pages/AuthPage';
import { Onboarding } from './pages/Onboarding';
import { CommandCenter } from './pages/CommandCenter';
import { CalendarPage } from './pages/CalendarPage';
import { DraftsPage } from './pages/DraftsPage';
import { DraftEditor } from './pages/DraftEditor';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { BrandPage } from './pages/BrandPage';
import { ConnectionsPage } from './pages/ConnectionsPage';

function Gate() {
  const app = useApp();
  if (!app.ready)
    return (
      <div className="center-screen">
        <Spinner />
      </div>
    );
  // Every screen below is gated behind authentication.
  if (!app.session)
    return (
      <Routes>
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="*" element={<AuthPage mode="login" />} />
      </Routes>
    );
  if (!app.workspace) return <Onboarding />;
  return (
    <Routes key={app.workspace.id}>
      <Route element={<Shell />}>
        <Route index element={<CommandCenter />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="drafts" element={<DraftsPage />} />
        <Route path="drafts/:itemId" element={<DraftEditor />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="brand" element={<BrandPage />} />
        <Route path="connections" element={<ConnectionsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
    </AppProvider>
  );
}
