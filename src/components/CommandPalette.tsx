import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  RefreshCw, 
  Users, 
  BarChart3, 
  Settings,
  Bot,
  Search,
  Plus,
  Zap,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands: CommandItem[] = [
    { id: 'dashboard', title: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/'), category: 'Navigation' },
    { id: 'products', title: 'Go to Products', icon: Package, action: () => navigate('/products'), category: 'Navigation' },
    { id: 'repricing', title: 'Go to Repricing', icon: RefreshCw, action: () => navigate('/repricing'), category: 'Navigation' },
    { id: 'competitors', title: 'Go to Competitors', icon: Users, action: () => navigate('/competitors'), category: 'Navigation' },
    { id: 'analytics', title: 'Go to Analytics', icon: BarChart3, action: () => navigate('/analytics'), category: 'Navigation' },
    { id: 'ai-assistant', title: 'Open AI Assistant', icon: Bot, action: () => navigate('/ai-assistant'), category: 'Navigation' },
    { id: 'settings', title: 'Go to Settings', icon: Settings, action: () => navigate('/settings'), category: 'Navigation' },
    { id: 'sync', title: 'Sync Products from Takealot', description: 'Fetch latest product data', icon: RefreshCw, action: () => { navigate('/products'); }, category: 'Actions' },
    { id: 'reprice', title: 'Run AI Repricer', description: 'Get AI pricing recommendations', icon: Zap, action: () => navigate('/repricing'), category: 'Actions' },
    { id: 'add-product', title: 'Add New Product', description: 'Manually add a product', icon: Plus, action: () => navigate('/products'), category: 'Actions' },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.description?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(prev => !prev);
      setSearch('');
      setSelectedIndex(0);
    }

    if (!isOpen) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    }

    if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      filteredCommands[selectedIndex].action();
      setIsOpen(false);
    }
  }, [isOpen, filteredCommands, selectedIndex]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="command-palette" onClick={() => setIsOpen(false)}>
      <div 
        className="command-box animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search commands..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
            autoFocus
          />
          <kbd className="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-muted rounded-md">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
          {Object.entries(groupedCommands).map(([category, items]) => (
            <div key={category} className="mb-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                {category}
              </p>
              {items.map((cmd) => {
                const currentIndex = flatIndex++;
                return (
                  <button
                    key={cmd.id}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                      currentIndex === selectedIndex 
                        ? 'bg-primary/10 text-foreground' 
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => {
                      cmd.action();
                      setIsOpen(false);
                    }}
                  >
                    <div className={cn(
                      'p-2 rounded-lg',
                      currentIndex === selectedIndex ? 'bg-primary/20' : 'bg-muted'
                    )}>
                      <cmd.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{cmd.title}</p>
                      {cmd.description && (
                        <p className="text-xs text-muted-foreground">{cmd.description}</p>
                      )}
                    </div>
                    <ArrowRight className={cn(
                      'w-4 h-4 opacity-0 transition-opacity',
                      currentIndex === selectedIndex && 'opacity-100'
                    )} />
                  </button>
                );
              })}
            </div>
          ))}
          
          {filteredCommands.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No commands found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded">↵</kbd> Select
            </span>
          </div>
          <span>Powered by Pricer Pro</span>
        </div>
      </div>
    </div>
  );
}
