import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageSquare, CheckSquare, Target, BarChart3, LogOut, User, Sparkles,
  Menu, X, Send, Plus, Trash2, CheckCircle2, Circle, AlertTriangle,
  ArrowRight, TrendingUp, Lock
} from "lucide-react";
import { VaultView } from "@/components/vault-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { getTodos, createTodo, updateTodo, deleteTodo } from "@/lib/todos.functions";
import { getGoals, createGoal, updateGoal, deleteGoal } from "@/lib/goals.functions";
import { getProfile, getMemories } from "@/lib/profile.functions";

const chatTransport = new DefaultChatTransport({ api: "/api/chat" });

const navItems = [
  { label: "Chat", icon: MessageSquare, id: "chat" },
  { label: "Todos", icon: CheckSquare, id: "todos" },
  { label: "Goals", icon: Target, id: "goals" },
  { label: "Vault", icon: Lock, id: "vault" },
  { label: "Insights", icon: BarChart3, id: "insights" },
];

export default function AppPage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: useServerFn(getProfile) });
  const assistantName = profile?.profile?.assistant_name ?? "Yusuf";
  const userName = profile?.profile?.full_name ?? "Tye";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.invalidateQueries();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-sidebar-foreground font-display">{assistantName}</h1>
              <p className="text-xs text-sidebar-foreground/60">Your assistant</p>
            </div>
            <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"><X className="h-5 w-5" /></button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${activeTab === item.id ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                <item.icon className="h-4 w-4" />{item.label}
              </button>
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-3 space-y-1">
            <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut className="h-4 w-4" />Sign out
            </button>
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="text-foreground"><Menu className="h-5 w-5" /></Button>
          <span className="font-semibold text-sm font-display">{assistantName}</span>
        </div>
        <main className="flex-1 overflow-auto">
          {activeTab === "chat" && <ChatView userName={userName} assistantName={assistantName} />}
          {activeTab === "todos" && <TodosView />}
          {activeTab === "goals" && <GoalsView />}
          {activeTab === "vault" && <VaultView />}
          {activeTab === "insights" && <InsightsView />}
        </main>
      </div>
    </div>
  );
}

function ChatView({ userName, assistantName }: { userName: string; assistantName: string }) {
  const [loadedMessages, setLoadedMessages] = useState<UIMessage[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).then(({ data }) => {
      if (data) {
        const msgs: UIMessage[] = data.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          parts: (m.parts as any[]) ?? [{ type: "text", text: m.content }],
        }));
        setLoadedMessages(msgs);
      }
      setHasLoaded(true);
    });
  }, []);

  const { messages, sendMessage, status } = useChat({
    id: "default",
    messages: loadedMessages,
    transport: chatTransport,
  });

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  useEffect(() => {
    if (!hasLoaded || status === "submitted" || status === "streaming") return;
    const saveMessages = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      for (const msg of messages) {
        await supabase.from("chat_messages").upsert({
          id: msg.id,
          user_id: user.id,
          role: msg.role,
          content: msg.parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
          parts: msg.parts as any,
          created_at: new Date().toISOString(),
        }, { onConflict: "id" });
      }
    };
    saveMessages();
  }, [messages, status, hasLoaded]);

  useEffect(() => { if (status !== "submitted" && status !== "streaming") textareaRef.current?.focus(); }, [status]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;
    sendMessage({ text: chatInput.trim() });
    setChatInput("");
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:h-screen">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 animate-pulse-glow">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground font-display">Good to see you, {userName}</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              I'm {assistantName}, your devoted assistant. Tell me what's on your mind, what you need to get done, or what you'd like to explore together.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={msg.id} className={`animate-fade-in-up flex ${msg.role === "user" ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${i * 0.05}s` }}>
            {msg.role === "assistant" ? (
              <div className="max-w-[85%] lg:max-w-[70%]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10"><Sparkles className="h-3 w-3 text-primary" /></div>
                  <span className="text-xs font-medium text-muted-foreground">{assistantName}</span>
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3 text-sm text-card-foreground leading-relaxed">
                  {msg.parts.map((part, j) => part.type === "text" ? <span key={j} className="whitespace-pre-wrap">{part.text}</span> : null)}
                </div>
              </div>
            ) : (
              <div className="max-w-[85%] lg:max-w-[70%]">
                <div className="flex items-center gap-2 mb-1.5 justify-end">
                  <span className="text-xs font-medium text-muted-foreground">{userName}</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-chat-user/20"><User className="h-3 w-3 text-chat-user" /></div>
                </div>
                <div className="rounded-2xl rounded-tr-sm bg-chat-user px-4 py-3 text-sm text-chat-user-foreground leading-relaxed">
                  {msg.parts.map((p) => p.type === "text" ? p.text : "").join("")}
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="max-w-[70%]">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10"><Sparkles className="h-3 w-3 text-primary animate-pulse" /></div>
                <span className="text-xs font-medium text-muted-foreground">{assistantName}</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-border bg-background/80 backdrop-blur-sm px-4 py-4">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 shadow-sm">
            <Textarea ref={textareaRef} value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder={`Message ${assistantName}...`}
              className="min-h-[44px] max-h-[160px] resize-none border-0 bg-transparent px-3 py-2.5 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={1} />
            <Button type="submit" disabled={isLoading || !chatInput.trim()} size="icon" className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TodosView() {
  const queryClient = useQueryClient();
  const fetchTodos = useServerFn(getTodos);
  const createTodoFn = useServerFn(createTodo);
  const updateTodoFn = useServerFn(updateTodo);
  const deleteTodoFn = useServerFn(deleteTodo);

  const { data: todosData, isLoading } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
  const todos = todosData?.todos ?? [];
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");

  const createMutation = useMutation({
    mutationFn: (data: { title: string; priority: string }) => createTodoFn({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; status: string; completed_at: string | null }) => updateTodoFn({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (data: { id: string }) => deleteTodoFn({ data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["todos"] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate({ title: newTitle, priority: newPriority });
    setNewTitle(""); setNewPriority("medium");
  };
  const toggleTodo = (todo: any) => {
    const isComplete = todo.status === "completed";
    updateMutation.mutate({ id: todo.id, status: isComplete ? "pending" : "completed", completed_at: isComplete ? null : new Date().toISOString() });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">{todos.filter((t) => t.status !== "completed").length} pending · {todos.filter((t) => t.status === "completed").length} completed</p>
        </div>
      </div>
      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="What needs to be done?" className="flex-1 bg-card" />
        <Select value={newPriority} onValueChange={setNewPriority}>
          <SelectTrigger className="w-32 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={createMutation.isPending} className="bg-primary"><Plus className="h-4 w-4" /></Button>
      </form>
      <div className="space-y-2">
        {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
          : todos.length === 0 ? <div className="text-center py-12"><CheckSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No tasks yet. Add one above.</p></div>
            : todos.map((todo) => (
              <div key={todo.id} className={`flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all ${todo.status === "completed" ? "opacity-60" : ""}`}>
                <button onClick={() => toggleTodo(todo)} className="shrink-0">
                  {todo.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${todo.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{todo.title}</p>
                  {todo.description && <p className="text-xs text-muted-foreground mt-0.5">{todo.description}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${todo.priority === "high" ? "bg-destructive/10 text-destructive" : todo.priority === "medium" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{todo.priority}</span>
                <button onClick={() => deleteMutation.mutate({ id: todo.id })} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
      </div>
    </div>
  );
}

function GoalsView() {
  const queryClient = useQueryClient();
  const fetchGoals = useServerFn(getGoals);
  const createGoalFn = useServerFn(createGoal);
  const updateGoalFn = useServerFn(updateGoal);
  const deleteGoalFn = useServerFn(deleteGoal);

  const { data: goalsData, isLoading } = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });
  const goals = goalsData?.goals ?? [];
  const [newTitle, setNewTitle] = useState("");

  const createMutation = useMutation({ mutationFn: (data: { title: string }) => createGoalFn({ data }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }) });
  const updateMutation = useMutation({ mutationFn: (data: { id: string; progress: number }) => updateGoalFn({ data }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }) });
  const deleteMutation = useMutation({ mutationFn: (data: { id: string }) => deleteGoalFn({ data }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }) });

  const handleCreate = (e: React.FormEvent) => { e.preventDefault(); if (!newTitle.trim()) return; createMutation.mutate({ title: newTitle }); setNewTitle(""); };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground font-display mb-6">Goals</h1>
      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="What are you working toward?" className="flex-1 bg-card" />
        <Button type="submit" disabled={createMutation.isPending} className="bg-primary"><Plus className="h-4 w-4" /></Button>
      </form>
      <div className="space-y-3">
        {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading goals...</div>
          : goals.length === 0 ? <div className="text-center py-12"><Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No goals yet. Set your first one.</p></div>
            : goals.map((goal) => (
              <div key={goal.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">{goal.title}</h3>
                  <button onClick={() => deleteMutation.mutate({ id: goal.id })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
                {goal.description && <p className="text-xs text-muted-foreground mb-3">{goal.description}</p>}
                <div className="flex items-center gap-3">
                  <Progress value={goal.progress} className="flex-1 h-2" />
                  <span className="text-xs font-medium text-muted-foreground w-8 text-right">{goal.progress}%</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {[0, 25, 50, 75, 100].map((p) => (
                    <button key={p} onClick={() => updateMutation.mutate({ id: goal.id, progress: p })} className={`text-xs px-2 py-1 rounded-md transition-colors ${goal.progress === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{p}%</button>
                  ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

function InsightsView() {
  const fetchTodos = useServerFn(getTodos);
  const fetchGoals = useServerFn(getGoals);
  const fetchMemories = useServerFn(getMemories);

  const { data: todosData } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });
  const { data: goalsData } = useQuery({ queryKey: ["goals"], queryFn: fetchGoals });
  const { data: memoriesData } = useQuery({ queryKey: ["memories"], queryFn: fetchMemories });

  const todos = todosData?.todos ?? [];
  const goals = goalsData?.goals ?? [];
  const memories = memoriesData?.memories ?? [];

  const total = todos.length;
  const completed = todos.filter((t) => t.status === "completed").length;
  const pending = total - completed;
  const overdue = todos.filter((t) => t.status !== "completed" && t.target_date && new Date(t.target_date) < new Date()).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const cards = [
    { label: "Completion Rate", value: `${completionRate}%`, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Pending Tasks", value: String(pending), icon: Circle, color: "text-primary", bg: "bg-primary/10" },
    { label: "Overdue", value: String(overdue), icon: AlertTriangle, color: overdue > 0 ? "text-destructive" : "text-muted-foreground", bg: overdue > 0 ? "bg-destructive/10" : "bg-muted" },
    { label: "Active Goals", value: String(goals.length), icon: Target, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground font-display mb-6">Insights</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-4">
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${card.bg} mb-3`}><card.icon className={`h-4 w-4 ${card.color}`} /></div>
            <p className="text-2xl font-bold text-foreground font-display">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3"><TrendingUp className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold text-foreground">Observations</h2></div>
        <div className="space-y-2">
          {overdue > 0 && <p className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" />You have {overdue} overdue task{overdue > 1 ? "s" : ""}. Consider reprioritizing.</p>}
          {pending === 0 && total > 0 && <p className="text-sm text-emerald-400 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" />All tasks completed! Excellent work.</p>}
          {goals.length === 0 && <p className="text-sm text-muted-foreground flex items-center gap-2"><Target className="h-3.5 w-3.5" />No goals set yet. Defining clear goals helps Yusuf guide you better.</p>}
          {memories.length === 0 && <p className="text-sm text-muted-foreground flex items-center gap-2"><Sparkles className="h-3.5 w-3.5" />Yusuf hasn't learned much about you yet. Share your preferences in chat.</p>}
          {pending > 0 && overdue === 0 && <p className="text-sm text-muted-foreground flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5" />{pending} task{pending > 1 ? "s" : ""} pending. You're on track.</p>}
        </div>
      </div>
      {memories.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Things Yusuf Remembers</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {memories.slice(0, 10).map((m) => (
              <div key={m.id} className="flex items-start gap-2 text-sm"><Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /><span className="text-muted-foreground">{m.content}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
