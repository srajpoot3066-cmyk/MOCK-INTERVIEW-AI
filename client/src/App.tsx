import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { ResumeProvider } from "@/context/resume-context";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sun, Moon, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Home from "@/pages/home";
import PracticePage from "@/pages/practice";
import ResumeBuilderPage from "@/pages/resume-builder";
import QuestionsPage from "@/pages/questions";
import HistoryPage from "@/pages/history";
import SettingsPage from "@/pages/settings";
import VideoInterviewPage from "@/pages/video-interview";
import QuizPage from "@/pages/quiz";
import UpgradePage from "@/pages/upgrade";
import LandingPage from "@/pages/landing";
import ProfilePage from "@/pages/profile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/practice" component={PracticePage} />
      <Route path="/video-interview" component={VideoInterviewPage} />
      <Route path="/quiz" component={QuizPage} />
      <Route path="/resume-builder" component={ResumeBuilderPage} />
      <Route path="/questions" component={QuestionsPage} />
      <Route path="/history" component={HistoryPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/upgrade" component={UpgradePage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

function UserMenu() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = [user.firstName, user.lastName]
    .filter(Boolean)
    .map(n => n!.charAt(0).toUpperCase())
    .join("") || "U";

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

  return (
    <div className="flex items-center gap-2">
      <Avatar className="w-7 h-7" data-testid="img-user-avatar">
        <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium hidden sm:inline max-w-[120px] truncate" data-testid="text-user-name">
        {displayName}
      </span>
      <a href="/api/logout" data-testid="button-logout">
        <Button size="icon" variant="ghost">
          <LogOut className="w-4 h-4" />
        </Button>
      </a>
    </div>
  );
}

function AppLayout() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 px-4 h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-[999]">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <UserMenu />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <ResumeProvider>
      <AppLayout />
    </ResumeProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthGate />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
