import { useEffect, useId, useState, type CSSProperties } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router';
import { Activity, UserRound, ShieldCheck, LogOut, Building2, Tags, Users, ScrollText, Ticket, LayoutDashboard, Columns3, Bell, ChevronRight, Plus, FlaskConical, X, type LucideIcon } from 'lucide-react';
import { NotificationsProvider } from '@/features/notifications/notifications';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { useSession, useLogout } from '@/features/auth/auth';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useWorkspaceUi } from '@/stores/workspace-ui';
import { BrandWordmark, BrandMark } from '@/components/brand/BrandLogo';

type Area = 'app' | 'staff' | 'admin';
type NavigationLink = { to: string; label: string; icon: LucideIcon; children?: NavigationLink[] };
const roleLabels = { USER: 'Comunidad universitaria', TECHNICIAN: 'Equipo técnico', ADMIN: 'Administración', SUPER_ADMIN: 'Superadministración' };

export function Shell(props: { area: Area; title: string }) {
  const sidebarOpen = useWorkspaceUi(state => state.sidebarOpen);
  const setSidebarOpen = useWorkspaceUi(state => state.setSidebarOpen);
  return <NotificationsProvider><SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} style={{ '--sidebar-width': '16rem', '--sidebar-width-icon': '3.5rem' } as CSSProperties}><ShellContent {...props}/></SidebarProvider></NotificationsProvider>;
}

function NavigationItem({ link }: { link: NavigationLink }) {
  const { setOpenMobile, setOpen, state, isMobile } = useSidebar();
  const location = useLocation();
  const submenuId = useId();
  const active = location.pathname === link.to || (['tickets', 'boards'].some(part => link.to.endsWith(`/${part}`)) && location.pathname.startsWith(`${link.to}/`));
  const [expanded, setExpanded] = useState(active);
  useEffect(() => { if (active) setExpanded(true); }, [location.pathname, active]);
  const submenuVisible = expanded && (state !== 'collapsed' || isMobile);
  const itemClass = 'h-10 gap-3 rounded-lg px-3 text-[13px] data-[active=true]:font-medium';
  if (!link.children) return <SidebarMenuItem><SidebarMenuButton asChild isActive={active} tooltip={link.label} className={itemClass}><NavLink to={link.to} onClick={() => setOpenMobile(false)}><link.icon aria-hidden="true"/><span>{link.label}</span></NavLink></SidebarMenuButton></SidebarMenuItem>;
  return <SidebarMenuItem>
    <SidebarMenuButton type="button" isActive={active} tooltip={link.label} aria-label={link.label} aria-expanded={submenuVisible} aria-controls={submenuId} className={itemClass} onClick={() => {
      if (state === 'collapsed' && !isMobile) { setOpen(true); setExpanded(true); }
      else setExpanded(open => !open);
    }}><link.icon aria-hidden="true"/><span className="min-w-0 flex-1 truncate">{link.label}</span><ChevronRight aria-hidden="true" className={`ml-auto transition-transform group-data-[collapsible=icon]:hidden ${submenuVisible ? 'rotate-90' : ''}`}/></SidebarMenuButton>
    <div id={submenuId} hidden={!submenuVisible}>
      <SidebarMenuSub>{link.children.map(child => <SidebarMenuSubItem key={child.to}><SidebarMenuSubButton asChild isActive={location.pathname === child.to} className="min-h-9 gap-2 text-[13px] max-md:min-h-11"><NavLink to={child.to} end onClick={() => setOpenMobile(false)}><child.icon aria-hidden="true"/><span>{child.label}</span></NavLink></SidebarMenuSubButton></SidebarMenuSubItem>)}</SidebarMenuSub>
    </div>
  </SidebarMenuItem>;
}

function NavigationGroup({ label, links }: { label: string; links: NavigationLink[] }) {
  return <SidebarGroup><SidebarGroupLabel>{label}</SidebarGroupLabel><SidebarGroupContent role="navigation" aria-label={label}><SidebarMenu>{links.map(link => <NavigationItem key={link.to} link={link}/>)}</SidebarMenu></SidebarGroupContent></SidebarGroup>;
}

function ShellContent({ area, title }: { area: Area; title: string }) {
  const { data: user } = useSession();
  const logout = useLogout();
  const location = useLocation();
  const boardWorkspace = useMatch('/:area/boards/:id') !== null && area !== 'app';
  const { setOpenMobile } = useSidebar();
  useEffect(() => { setOpenMobile(false); }, [location.pathname, setOpenMobile]);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const workspace: NavigationLink[] = area === 'app' ? [{ to: '/app/tickets', label: 'Mis solicitudes', icon: Ticket }] : area === 'admin' && !isSuperAdmin ? [
    { to: '/admin/services', label: 'Estado de servicios', icon: Activity },
  ] : [
    { to: `/${area}/dashboard`, label: 'Resumen', icon: LayoutDashboard },
    { to: `/${area}/tickets`, label: 'Bandeja de tickets', icon: Ticket, children: [
      { to: `/${area}/tickets`, label: 'Todos los tickets', icon: Ticket },
      { to: `/${area}/tickets/mine`, label: 'Mis tickets', icon: UserRound },
    ] },
    { to: `/${area}/boards`, label: 'Tableros de trabajo', icon: Columns3 },
  ];
  if (!(area === 'admin' && !isSuperAdmin)) workspace.push({ to: `/${area}/services`, label: 'Estado de servicios', icon: Activity });
  const administration: NavigationLink[] = area === 'admin' ? [
    { to: '/admin/departments', label: 'Departamentos', icon: Building2 },
    { to: '/admin/categories', label: 'Categorías', icon: Tags },
    ...(isSuperAdmin ? [{ to: '/admin/users', label: 'Usuarios', icon: Users }, { to: '/admin/audit', label: 'Auditoría', icon: ScrollText }] : []),
  ] : [];
  const personal: NavigationLink[] = [
    ...(area !== 'app' ? [{ to: '/app/tickets', label: 'Mis solicitudes', icon: Ticket }] : []),
    { to: `/${area}/notifications`, label: 'Notificaciones', icon: Bell },
    { to: `/${area}/profile`, label: 'Mi perfil', icon: UserRound },
    ...(area !== 'app' && (area !== 'staff' || user?.role === 'SUPER_ADMIN') ? [{ to: `/${area}/access`, label: 'Permisos de acceso', icon: ShieldCheck }] : []),
    ...(area === 'app' && (user?.role === 'ADMIN' || isSuperAdmin) ? [{ to: isSuperAdmin ? '/admin/dashboard' : '/admin/services', label: 'Administración', icon: Building2 }] : []),
    ...(area === 'app' && user?.role === 'TECHNICIAN' ? [{ to: '/staff/dashboard', label: 'Panel de atención', icon: ShieldCheck }] : []),
  ];
  const currentLink = [...workspace.flatMap(link => link.children ?? [link]), ...administration, ...personal].find(link => location.pathname === link.to);
  const currentTitle = currentLink?.label ?? (location.pathname.endsWith('/new') ? 'Nueva solicitud' : location.pathname.includes('/boards/') ? 'Tablero' : 'Detalle de solicitud');
  const initials = user?.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <>
    <a href="#main-content" className="skip-link">Saltar al contenido</a>
    <Sidebar collapsible="icon" aria-label="Navegación principal" className="border-sidebar-border">
      <SidebarHeader className="gap-5 px-3 pb-3 pt-5 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3 px-1 group-data-[collapsible=icon]:px-0">
          <Link to="/" aria-label="La Pizzara, inicio" className="flex size-9 shrink-0 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:ring-ring"><BrandMark size={36}/></Link>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden"><BrandWordmark/><p className="text-xs text-muted-foreground">Espacio universitario</p></div>
          <Button type="button" variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Cerrar menú" onClick={() => setOpenMobile(false)}><X aria-hidden="true"/></Button>
        </div>
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild tooltip="Nueva solicitud" className="h-10 justify-center rounded-lg border border-sidebar-border bg-card font-medium text-foreground hover:bg-accent group-data-[collapsible=icon]:p-2!"><Link to="/app/tickets/new" onClick={() => setOpenMobile(false)}><Plus aria-hidden="true"/><span>Nueva solicitud</span></Link></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavigationGroup label="Espacio de trabajo" links={workspace}/>
        {administration.length > 0 && <NavigationGroup label="Organización" links={administration}/>}
        <NavigationGroup label="Personal" links={personal}/>
      </SidebarContent>
      <SidebarSeparator/>
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton asChild size="lg" tooltip="Mi perfil" className="gap-3 rounded-lg"><Link to={`/${area}/profile`} onClick={() => setOpenMobile(false)}><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-semibold text-foreground">{initials}</span><span className="min-w-0"><span className="block truncate text-sm font-medium text-foreground">{user?.displayName}</span><span className="block truncate text-xs text-muted-foreground">{user && roleLabels[user.role]}</span></span></Link></SidebarMenuButton></SidebarMenuItem><SidebarMenuItem><SidebarMenuButton tooltip="Cerrar sesión" disabled={logout.isPending} onClick={() => logout.mutate()} className="h-9 gap-3 px-3 text-muted-foreground"><LogOut aria-hidden="true"/><span>{logout.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarFooter>
      <SidebarRail/>
    </Sidebar>
    <SidebarInset className={`min-w-0 bg-background ${boardWorkspace ? 'h-dvh overflow-hidden' : ''}`}>
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-7 lg:px-10">
        <div className="flex min-w-0 items-center gap-3"><SidebarTrigger aria-label="Alternar menú lateral"/><Separator orientation="vertical" className="mr-1 h-5"/><nav aria-label="Ruta actual" className="flex min-w-0 items-center gap-2 text-[13px]"><span className="hidden shrink-0 text-muted-foreground sm:inline">{title}</span><ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" aria-hidden="true"/><span className="truncate font-medium">{currentTitle}</span></nav></div>
        <div className="flex shrink-0 items-center gap-3"><span className="hidden rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground lg:inline">{user && roleLabels[user.role]}</span><NotificationBell/></div>
      </header>
      {user?.authProvider === 'local' && <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground sm:px-7 lg:px-10"><FlaskConical size={14} aria-hidden="true"/><p>Entorno de desarrollo<span className="hidden sm:inline"> · Cuenta local, no institucional</span></p></div>}
      {logout.error && <p className="px-6 py-3 text-sm text-destructive" role="alert">{logout.error.message}</p>}
      <main id="main-content" tabIndex={-1} className={boardWorkspace ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden outline-none' : 'workspace-content flex-1 outline-none'}><Outlet/></main>
      {!boardWorkspace && <footer className="flex flex-wrap justify-between gap-2 px-4 pb-5 text-xs text-muted-foreground sm:px-7 lg:px-10"><span>La Pizzara · Gestión universitaria</span><span>Espacio interno de la universidad</span></footer>}
    </SidebarInset>
  </>;
}
