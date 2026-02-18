import { useLocation, Link } from "wouter";
import {
  BrainCircuit,
  History,
  Settings,
  Sparkles,
  LayoutDashboard,
  Target,
  FileText,
  Building2,
  Video,
  ClipboardList,
  LogOut,
  UserCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Video Interview", url: "/video-interview", icon: Video },
  { title: "Skill Quiz", url: "/quiz", icon: ClipboardList },
  { title: "Practice", url: "/practice", icon: Target },
  { title: "Resume Builder", url: "/resume-builder", icon: FileText },
  { title: "Company Questions", url: "/questions", icon: Building2 },
  { title: "History", url: "/history", icon: History },
  { title: "My Profile", url: "/profile", icon: UserCircle },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const initials = user
    ? [user.firstName, user.lastName]
        .filter(Boolean)
        .map(n => n!.charAt(0).toUpperCase())
        .join("") || "U"
    : "U";

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "User"
    : "User";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2.5 flex-wrap" data-testid="link-brand">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
            <BrainCircuit className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold tracking-tight block" data-testid="text-brand-name">
              Mock InterviewDesk
            </span>
            <span className="text-[10px] text-muted-foreground">Interview Prep</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`link-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-2">
        <Link href="/upgrade" data-testid="link-nav-upgrade">
          <div className="rounded-md bg-primary/10 p-3 space-y-2 hover-elevate">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold">Upgrade to Pro</span>
              <Badge variant="secondary" className="text-[10px]">New</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Plans starting at just $2/month. Unlock all features.
            </p>
          </div>
        </Link>
        {user && (
          <div className="flex items-center gap-2 p-2 rounded-md" data-testid="sidebar-user-profile">
            <Link href="/profile" className="flex items-center gap-2 min-w-0 flex-1 hover-elevate rounded-md p-1 -m-1" data-testid="link-sidebar-profile">
              <Avatar className="w-8 h-8 shrink-0" data-testid="img-sidebar-avatar">
                <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
                <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate" data-testid="text-sidebar-name">{displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate" data-testid="text-sidebar-email">{user.email}</p>
              </div>
            </Link>
            <a href="/api/logout" data-testid="button-sidebar-logout">
              <Button size="icon" variant="ghost" className="shrink-0">
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </a>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
