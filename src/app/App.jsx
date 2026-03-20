import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SettingsProvider } from '@/app/contexts/SettingsContext.jsx';
import { UserProvider, useUser } from '@/app/contexts/UserContext.jsx';
import { useKeyboardShortcuts } from '@/app/hooks/useKeyboardShortcuts';
import { Toaster } from '@/app/components/ui/sonner';
import { APP_BASE_PATH } from '@/app/config/runtime';

const lazyNamed = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })));

const WelcomePage = lazyNamed(() => import('@/app/components/WelcomePage'), 'WelcomePage');
const RegisterPage = lazyNamed(() => import('@/app/components/RegisterPage.jsx'), 'RegisterPage');
const LoginPage = lazyNamed(() => import('@/app/components/LoginPage'), 'LoginPage');
const ForgotPassword = lazyNamed(() => import('@/app/components/ForgotPassword'), 'ForgotPassword');
const ResetPassword = lazyNamed(() => import('@/app/components/ResetPassword'), 'ResetPassword');
const Layout = lazyNamed(() => import('@/app/components/Layout'), 'Layout');
const Dashboard = lazyNamed(() => import('@/app/components/Dashboard'), 'Dashboard');
const CoursesPage = lazyNamed(() => import('@/app/components/CoursesPage'), 'CoursesPage');
const CourseDetailsPage = lazyNamed(() => import('@/app/components/CourseDetailsPage.jsx'), 'CourseDetailsPage');
const JobsPage = lazyNamed(() => import('@/app/components/JobsPage'), 'JobsPage');
const AlertsPage = lazyNamed(() => import('@/app/components/AlertsPage'), 'AlertsPage');
const TimelinePage = lazyNamed(() => import('@/app/components/TimelinePage'), 'TimelinePage');
const CompaniesPage = lazyNamed(() => import('@/app/components/CompaniesPage'), 'CompaniesPage');
const ProfilePage = lazyNamed(() => import('@/app/components/ProfilePage'), 'ProfilePage');
const MetricsPage = lazyNamed(() => import('@/app/components/MetricsPage'), 'MetricsPage');
const GamificationPage = lazyNamed(() => import('@/app/components/GamificationPage'), 'GamificationPage');
const MentorshipPage = lazyNamed(() => import('@/app/components/MentorshipPage'), 'MentorshipPage');
const SupportPage = lazyNamed(() => import('@/app/components/SupportPage'), 'SupportPage');
const SettingsPage = lazyNamed(() => import('@/app/components/SettingsPage.jsx'), 'SettingsPage');
const FinancePage = lazyNamed(() => import('@/app/components/FinancePage.jsx'), 'FinancePage');
const StudentIndicationsPage = lazyNamed(() => import('@/app/components/StudentIndicationsPage.jsx'), 'StudentIndicationsPage');
const DonationsPage = lazyNamed(() => import('@/app/components/DonationsPage.jsx'), 'DonationsPage');
const CandidatesPage = lazyNamed(() => import('@/app/components/CandidatesPage'), 'CandidatesPage');
const AdminPage = lazyNamed(() => import('@/app/components/AdminPage'), 'AdminPage');

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-2 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useUser();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RoleProtectedRoute({ children, path }) {
  const { canAccessRoute, getHomeRoute } = useUser();

  if (!canAccessRoute(path)) {
    return <Navigate to={getHomeRoute()} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  useKeyboardShortcuts();

  return (
    <BrowserRouter basename={APP_BASE_PATH === '/' ? undefined : APP_BASE_PATH}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<RoleProtectedRoute path="/dashboard"><Dashboard /></RoleProtectedRoute>} />
            <Route path="cursos" element={<RoleProtectedRoute path="/cursos"><CoursesPage /></RoleProtectedRoute>} />
            <Route path="cursos/:courseId" element={<RoleProtectedRoute path="/cursos"><CourseDetailsPage /></RoleProtectedRoute>} />
            <Route path="vagas" element={<RoleProtectedRoute path="/vagas"><JobsPage /></RoleProtectedRoute>} />
            <Route path="candidatos" element={<RoleProtectedRoute path="/candidatos"><CandidatesPage /></RoleProtectedRoute>} />
            <Route path="alertas" element={<RoleProtectedRoute path="/alertas"><AlertsPage /></RoleProtectedRoute>} />
            <Route path="linha-do-tempo" element={<RoleProtectedRoute path="/linha-do-tempo"><TimelinePage /></RoleProtectedRoute>} />
            <Route path="empresas" element={<RoleProtectedRoute path="/empresas"><CompaniesPage /></RoleProtectedRoute>} />
            <Route path="perfil" element={<RoleProtectedRoute path="/perfil"><ProfilePage /></RoleProtectedRoute>} />
            <Route path="metricas" element={<RoleProtectedRoute path="/metricas"><MetricsPage /></RoleProtectedRoute>} />
            <Route path="gamificacao" element={<RoleProtectedRoute path="/gamificacao"><GamificationPage /></RoleProtectedRoute>} />
            <Route path="admin" element={<RoleProtectedRoute path="/admin"><AdminPage /></RoleProtectedRoute>} />
            <Route path="mentoria" element={<RoleProtectedRoute path="/mentoria"><MentorshipPage /></RoleProtectedRoute>} />
            <Route path="suporte" element={<RoleProtectedRoute path="/suporte"><SupportPage /></RoleProtectedRoute>} />
            <Route path="financeiro" element={<RoleProtectedRoute path="/financeiro"><FinancePage /></RoleProtectedRoute>} />
            <Route path="indicacoes" element={<RoleProtectedRoute path="/indicacoes"><StudentIndicationsPage /></RoleProtectedRoute>} />
            <Route path="doacoes" element={<RoleProtectedRoute path="/doacoes"><DonationsPage /></RoleProtectedRoute>} />
            <Route path="configuracoes" element={<RoleProtectedRoute path="/configuracoes"><SettingsPage /></RoleProtectedRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <UserProvider>
        <AppRoutes />
      </UserProvider>
    </SettingsProvider>
  );
}
