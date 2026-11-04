import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { BoardsPage } from '@/features/boards/BoardsPage';
import { BoardPage } from '@/features/boards/BoardPage';
import { StaffTicketsPage } from '@/features/staff/StaffTicketsPage';
import { StaffTicketDetailPage } from '@/features/staff/StaffTicketDetailPage';
import { TicketDashboardPage } from '@/features/staff/TicketDashboardPage';
import { MyTicketsPage } from '@/features/tickets/MyTicketsPage';
import { NewTicketPage } from '@/features/tickets/NewTicketPage';
import { TicketDetailPage } from '@/features/tickets/TicketDetailPage';
import { DepartmentsPage } from '@/features/departments/DepartmentsPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { UsersPage } from '@/features/users/UsersPage';
import { AuditPage } from '@/features/admin/AuditPage';
import { createBrowserRouter, RouterProvider, Navigate, Link, useRouteError, isRouteErrorResponse, useParams } from 'react-router';
import { UserRole } from '@uni/shared';
import { ProtectedRoute, homeFor, useSession } from '@/features/auth/auth';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProfilePage } from '@/features/auth/ProfilePage';
import { AccessPage } from '@/features/auth/AccessPage';
import { AppLayout } from './layouts/AppLayout';
import { StaffLayout } from './layouts/StaffLayout';
import { AdminLayout } from './layouts/AdminLayout';

function BoardRoute() { const { id } = useParams(); return <BoardPage key={id}/>; }
function StaffTicketDetailRoute() { const { id } = useParams(); return <StaffTicketDetailPage key={id}/>; }
function TicketDetailRoute() { const { id } = useParams(); return <TicketDetailPage key={id}/>; }
function Home() { const session = useSession(); return <Navigate to={session.data ? homeFor(session.data.role) : '/login'} replace/>; }
function RouteError() {
  const error = useRouteError();
  return <main className="p-12"><h1 className="text-2xl font-semibold">{isRouteErrorResponse(error) && error.status === 404 ? 'Página no encontrada' : 'No se pudo abrir la página'}</h1><Link to="/" className="mt-4 inline-block text-primary">Volver al inicio</Link></main>;
}
const router = createBrowserRouter([
  { errorElement: <RouteError/>, children: [
    { path: '/login', element: <LoginPage/> },
    { path: '/unauthorized', element: <main className="p-12"><h1 className="text-2xl font-semibold">No tienes permiso para acceder a esta sección</h1><p className="mt-4 text-muted-foreground">El rol de tu cuenta no permite abrir este panel.</p><Link to="/" className="mt-6 inline-block text-primary">Volver a mi perfil</Link></main> },
    { element: <ProtectedRoute/>, children: [
      { path: '/', element: <Home/> },
      { path: '/app', element: <AppLayout/>, children: [{ index: true, element: <Navigate to="/app/tickets" replace/> }, { path: 'notifications', element: <NotificationsPage/> }, { path: 'profile', element: <ProfilePage/> }, { path: 'tickets', element: <MyTicketsPage/> }, { path: 'tickets/new', element: <NewTicketPage/> }, { path: 'tickets/:id', element: <TicketDetailRoute/> }] },
    ] },
    { element: <ProtectedRoute roles={[UserRole.TECHNICIAN, UserRole.ADMIN]}/>, children: [
      { path: '/staff', element: <StaffLayout/>, children: [{ path: 'boards', element: <BoardsPage/> }, { path: 'boards/:id', element: <BoardRoute/> }, { path: 'tickets', element: <StaffTicketsPage/> }, { path: 'tickets/:id', element: <StaffTicketDetailRoute/> }, { path: 'dashboard', element: <TicketDashboardPage/> }, { index: true, element: <Navigate to="/staff/dashboard" replace/> }, { path: 'notifications', element: <NotificationsPage/> }, { path: 'profile', element: <ProfilePage/> }, { path: 'access', element: <AccessPage area="staff"/> }] },
    ] },
    { element: <ProtectedRoute roles={[UserRole.ADMIN]}/>, children: [
      { path: '/admin', element: <AdminLayout/>, children: [{ path: 'boards', element: <BoardsPage/> }, { path: 'boards/:id', element: <BoardRoute/> }, { path: 'tickets', element: <StaffTicketsPage/> }, { path: 'tickets/:id', element: <StaffTicketDetailRoute/> }, { path: 'dashboard', element: <TicketDashboardPage/> }, { index: true, element: <Navigate to="/admin/dashboard" replace/> }, { path: 'notifications', element: <NotificationsPage/> }, { path: 'profile', element: <ProfilePage/> }, { path: 'access', element: <AccessPage area="admin"/> }, { path: 'departments', element: <DepartmentsPage/> }, { path: 'categories', element: <CategoriesPage/> }, { path: 'users', element: <UsersPage/> }, { path: 'audit', element: <AuditPage/> }] },
    ] },
  ] },
]);
export function Router() { return <RouterProvider router={router}/>; }
