import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  RefreshCw, 
  Users, 
  BarChart3, 
  Settings,
  Sparkles,
  TrendingUp,
  Bot,
  Zap,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', badge: null },
  { to: '/products', icon: Package, label: 'Products', badge: null },
  { to: '/repricing', icon: RefreshCw, label: 'AI Repricing', badge: 'AI' },
  { to: '/competitors', icon: Users, label: 'Competitors', badge: null },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', badge: null },
  { to: '/ai-assistant', icon: Bot, label: 'AI Assistant', badge: 'New' },
  { to: '/settings', icon: Settings, label: 'Settings', badge: null },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 animate-glow">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="text-xl font-display font-bold text-sidebar-foreground">Pricer Pro</span>
            <p className="text-xs text-sidebar-foreground/50">Takealot Repricing</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Mini */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-sidebar-accent/50">
            <p className="text-xs text-sidebar-foreground/60">Products</p>
            <p className="text-lg font-bold text-sidebar-foreground">10</p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-success/20 to-success/5">
            <p className="text-xs text-sidebar-foreground/60">Buy Box</p>
            <p className="text-lg font-bold text-success">72%</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-3 px-2">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'sidebar-item group',
                isActive && 'sidebar-item-active'
              )}
            >
              <div className={cn(
                'p-2 rounded-lg transition-colors duration-200',
                isActive ? 'bg-primary/20' : 'bg-sidebar-accent/30 group-hover:bg-sidebar-accent'
              )}>
                <item.icon className={cn(
                  'w-4 h-4',
                  isActive ? 'text-primary' : 'text-sidebar-foreground/70'
                )} />
              </div>
              <span className="font-medium flex-1">{item.label}</span>
              {item.badge && (
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  item.badge === 'AI' ? 'bg-primary/20 text-primary' :
                  item.badge === 'New' ? 'bg-accent/20 text-accent' :
                  'bg-muted text-muted-foreground'
                )}>
                  {item.badge}
                </span>
              )}
              <ChevronRight className={cn(
                'w-4 h-4 opacity-0 -translate-x-2 transition-all duration-200',
                'group-hover:opacity-100 group-hover:translate-x-0',
                isActive && 'opacity-100 translate-x-0'
              )} />
            </NavLink>
          );
        })}
      </nav>

      {/* Pro Feature Promo */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-sidebar-foreground">AI Insights</span>
          </div>
          <p className="text-xs text-sidebar-foreground/60 mb-3">
            Get AI-powered pricing recommendations for optimal profit.
          </p>
          <NavLink 
            to="/repricing"
            className="block w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold text-center hover:bg-primary/90 transition-colors"
          >
            Run AI Repricer
          </NavLink>
        </div>
      </div>

      {/* Version */}
      <div className="p-4 text-center">
        <p className="text-[10px] text-sidebar-foreground/30">v2.0.0 • Pro Edition</p>
      </div>
    </aside>
  );
}
