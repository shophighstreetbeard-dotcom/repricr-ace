import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Loader2, 
  Lightbulb,
  TrendingUp,
  Target,
  Zap,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const quickPrompts = [
  { icon: TrendingUp, text: "How can I improve my buy box win rate?", category: "Strategy" },
  { icon: Target, text: "What's the optimal profit margin for electronics?", category: "Pricing" },
  { icon: Zap, text: "Explain dynamic repricing strategies", category: "Automation" },
  { icon: Lightbulb, text: "Tips for competing with larger sellers", category: "Competition" },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Welcome to Pricer Pro AI! 👋\n\nI'm your intelligent pricing assistant, ready to help you dominate the Takealot marketplace. I can help with:\n\n• **Pricing strategies** - Win more buy boxes\n• **Competitor analysis** - Understand market dynamics\n• **Margin optimization** - Maximize profits\n• **Repricing rules** - Automate intelligently\n\nWhat would you like to explore today?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('ai-chat', {
        body: { message: messageText, history: messages }
      });

      if (response.error) throw response.error;
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data?.response || "I'm sorry, I couldn't process that request." 
      }]);
    } catch (error) {
      console.error('AI Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm having trouble connecting right now. Please try again in a moment." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="AI Assistant" subtitle="Your intelligent pricing companion">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
        {/* Main Chat */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="font-display">Pricer Pro AI</CardTitle>
                  <p className="text-xs text-muted-foreground">Powered by Lovable AI</p>
                </div>
              </div>
              <Badge className="bg-success/10 text-success border-success/20">Online</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex animate-fade-in',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] p-4 rounded-2xl text-sm whitespace-pre-wrap',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-muted p-4 rounded-2xl rounded-bl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask about pricing strategies, competitors, margins..."
                    className="w-full px-12 py-3 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground outline-none text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  size="lg"
                  className="rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                  onClick={() => sendMessage()}
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Quick Prompts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt.text)}
                  disabled={isLoading}
                  className="w-full p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <prompt.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{prompt.category}</p>
                      <p className="text-sm text-foreground">{prompt.text}</p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Pro Tip</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ask specific questions about your products or categories for more tailored advice. The AI learns from your conversation context!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
