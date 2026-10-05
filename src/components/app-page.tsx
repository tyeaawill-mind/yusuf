import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageSquare, CheckSquare, Target, BarChart3, LogOut, User, Sparkles,
  Menu, X, Plus, Trash2, CheckCircle2, Circle, AlertTriangle,
  ArrowRight, TrendingUp, Lock, ShieldCheck, Mic, MicOff, Volume2,
  Settings as SettingsIcon, AlertCircle, FolderOpen, Newspaper, Mail, UserSearch,
  Copy, Share2, RotateCcw, Check, PencilLine
} from "lucide-react";
import { VaultView } from "@/components/vault-view";
import { SecurityView } from "@/components/security-view";
import { FilesView } from "@/components/files-view";
import { BriefingsView } from "@/components/briefings-view";
import { MailView } from "@/components/mail-view";
import { DossiersView } from "@/components/dossiers-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { getTodos, createTodo, updateTodo, deleteTodo } from "@/lib/todos.functions";
import { getGoals, createGoal, updateGoal, deleteGoal } from "@/lib/goals.functions";
import { getProfile, getMemories } from "@/lib/profile.functions";
import { updateProfile } from "@/lib/profile.functions";
import { normalizeAssistantText } from "@/lib/utils";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputButton, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import avatarAsset from "@/assets/yusuf-avatar.png.asset.json";

const chatTransport = new DefaultChatTransport({
  api: "/api/chat",
  fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }) as typeof fetch,
});

const navItems = [
  { label: "Chat", icon: MessageSquare, id: "chat" },
  { label: "Briefings", icon: Newspaper, id: "briefings" },
  { label: "Mail", icon: Mail, id: "mail" },
  { label: "Todos", icon: CheckSquare, id: "todos" },
  { label: "Goals", icon: Target, id: "goals" },
  { label: "Files", icon: FolderOpen, id: "files" },
  { label: "Vault", icon: Lock, id: "vault" },
  { label: "Security", icon: ShieldCheck, id: "security" },
  { label: "Insights", icon: BarChart3, id: "insights" },
];

export default function AppPage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [mobileOpen, setMobileOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    const resizeWorkspace = () => {
      workspaceRef.current?.style.setProperty("--app-height", `${viewport?.height ?? window.innerHeight}px`);
    };
    resizeWorkspace();
    viewport?.addEventListener("resize", resizeWorkspace);
    window.addEventListener("resize", resizeWorkspace);
    return () => {
      viewport?.removeEventListener("resize", resizeWorkspace);
      window.removeEventListener("resize", resizeWorkspace);
    };
  }, []);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: useServerFn(getProfile) });
  const { data: authUser } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const assistantName = profile?.profile?.assistant_name ?? "Yusuf";
  const fallbackName = authUser?.email?.split("@")[0] ?? authUser?.id.slice(0, 8) ?? "there";
  const userName = profile?.profile?.full_name ?? fallbackName;
  const isOwner = (authUser?.email ?? "").toLowerCase() === "tyeaawill@gmail.com";
  const visibleNavItems = isOwner ? [...navItems, { label: "User Profiles", icon: UserSearch, id: "dossiers" }] : navItems;
  const assistantAvatar = ((profile?.profile as any)?.avatar_url as string | undefined) || avatarAsset.url;
  const updateProfileFn = useServerFn(updateProfile);
  const nicknameMutation = useMutation({
    mutationFn: (full_name: string) => updateProfileFn({ data: { full_name } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.invalidateQueries();
    navigate({ to: "/login" });
  };

  return (
    <div ref={workspaceRef} className="yusuf-workspace flex overflow-hidden bg-background">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-overlay/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[18rem] transform border-r border-sidebar-border bg-sidebar/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 lg:static lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
            {assistantAvatar ? (
              <img src={assistantAvatar} alt={assistantName} className="h-11 w-11 rounded-lg object-cover ring-1 ring-primary/30" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 font-display text-lg font-semibold text-primary">Y</div>
            )}
            <div>
              <h1 className="text-base font-semibold text-sidebar-foreground font-display">{assistantName}</h1>
              <p className="text-xs text-sidebar-foreground/60">Research and decisions</p>
            </div>
            <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"><X className="h-5 w-5" /></button>
          </div>
          <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
            {visibleNavItems.map((item) => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-[0.95rem] font-medium transition-all ${activeTab === item.id ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-background px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="text-foreground"><Menu className="h-5 w-5" /></Button>
          <span className="font-semibold text-sm font-display">{assistantName}</span>
        </div>
        <main className={`min-h-0 flex-1 ${activeTab === "chat" ? "overflow-hidden" : "overflow-auto"}`}>
          {activeTab === "chat" && <ChatView userName={userName} assistantName={assistantName} assistantAvatar={assistantAvatar} />}
          {activeTab === "briefings" && <BriefingsView />}
          {activeTab === "mail" && <MailView />}
          {activeTab === "todos" && <TodosView />}
          {activeTab === "goals" && <GoalsView />}
          {activeTab === "files" && <FilesView />}
          {activeTab === "vault" && <VaultView />}
          {activeTab === "security" && <SecurityView />}
          {activeTab === "insights" && <InsightsView />}
          {activeTab === "dossiers" && isOwner && <DossiersView />}
        </main>
      </div>
      <Dialog open={Boolean(profile && !profile.profile?.full_name)}>
        <DialogContent className="border-border bg-surface-elevated sm:max-w-md" onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-2xl">How should Yusuf address you?</DialogTitle>
            <DialogDescription className="text-base leading-7">Choose your real name or a nickname. You can change it later.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(event) => { event.preventDefault(); if (nickname.trim()) nicknameMutation.mutate(nickname.trim()); }} className="space-y-4">
            <div className="relative"><PencilLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Name or nickname" className="h-12 bg-background/60 pl-10 text-base" maxLength={100} autoFocus /></div>
            <Button type="submit" disabled={!nickname.trim() || nicknameMutation.isPending} className="h-11 w-full">Continue as {nickname.trim() || "your chosen name"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const LANG_OPTIONS = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "bn-BD", label: "বাংলা (Bangladesh)" },
  { code: "bn-IN", label: "বাংলা (India)" },
  { code: "ar-SA", label: "العربية" },
  { code: "ur-PK", label: "اُردُو" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "zh-CN", label: "中文 (普通话)" },
  { code: "he-IL", label: "עברית" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
];

function ChatView({ userName, assistantName, assistantAvatar }: { userName: string; assistantName: string; assistantAvatar?: string }) {
  const [loadedMessages, setLoadedMessages] = useState<UIMessage[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [micLang, setMicLang] = useState<string>(() => (typeof window !== "undefined" && localStorage.getItem("yusuf.micLang")) || "en-US");
  const [ttsLang, setTtsLang] = useState<string>(() => (typeof window !== "undefined" && localStorage.getItem("yusuf.ttsLang")) || "en-US");
  const [ttsVoiceURI, setTtsVoiceURI] = useState<string>(() => (typeof window !== "undefined" && localStorage.getItem("yusuf.ttsVoice")) || "");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { localStorage.setItem("yusuf.micLang", micLang); }, [micLang]);
  useEffect(() => { localStorage.setItem("yusuf.ttsLang", ttsLang); }, [ttsLang]);
  useEffect(() => { localStorage.setItem("yusuf.ttsVoice", ttsVoiceURI); }, [ttsVoiceURI]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      if (!localStorage.getItem("yusuf.ttsVoice") && voices.length) {
        const george =
          voices.find((v) => /george/i.test(v.name)) ||
          voices.find((v) => /uk english male|daniel|google uk english male/i.test(v.name)) ||
          voices.find((v) => /en-GB/i.test(v.lang) && /male/i.test(v.name));
        if (george) setTtsVoiceURI(george.voiceURI);
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

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
    onError: (err) => {
      console.error("[Yusuf chat error]", err);
      setChatError(err?.message || "Yusuf couldn't reach the AI gateway. Please try again.");
    },
  });

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

  const submitPrompt = (text: string) => {
    if (!text.trim() || isLoading) return;
    setChatError(null);
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    sendMessage({ text: text.trim() });
    setChatInput("");
  };

  useEffect(() => () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);

  const toggleMic = () => {
    setVoiceError(null);
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = micLang;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = (ev: any) => { setIsListening(false); setVoiceError(ev?.error === "not-allowed" ? "Microphone permission was denied." : `Voice error: ${ev?.error ?? "unknown"}`); };
    rec.onresult = (ev: any) => {
      let transcript = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) transcript += ev.results[i][0].transcript;
      setChatInput((prev) => (prev ? prev + " " : "") + transcript.trim());
    };
    recognitionRef.current = rec;
    try { rec.start(); } catch { /* already started */ }
  };

  const readText = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(normalizeAssistantText(text));
    utterance.lang = ttsLang;
    const voice = availableVoices.find((item) => item.voiceURI === ttsVoiceURI);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const shareText = async (text: string) => {
    const clean = normalizeAssistantText(text);
    if (navigator.share) await navigator.share({ title: `${assistantName} research`, text: clean });
    else await navigator.clipboard.writeText(clean);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-workspace-glow" />
      <Conversation className="z-10 min-h-0" aria-label="Conversation with Yusuf">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-10 px-5 pb-8 pt-6 sm:px-8 lg:pt-10">
        {messages.length === 0 && (
          <ConversationEmptyState className="min-h-64 py-8" icon={<img src={assistantAvatar} alt={assistantName} className="size-24 rounded-2xl object-cover shadow-2xl ring-1 ring-primary/30" />}>
            <div className="mt-3 max-w-xl text-center">
              <p className="mb-3 text-xs font-semibold uppercase text-primary">Private research workspace</p>
              <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Good to see you, {userName}</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">What’s making you hesitate?</p>
            </div>
          </ConversationEmptyState>
        )}
        {messages.map((msg) => {
          const rawText = msg.parts.map((part) => part.type === "text" ? part.text : "").join("");
          const displayText = rawText;
          return <Message key={msg.id} from={msg.role} className={msg.role === "assistant" ? "max-w-full" : "max-w-[88%] sm:max-w-[72%]"}>
            {msg.role === "assistant" && <div className="mb-1 flex items-center gap-2"><img src={assistantAvatar} alt="" className="size-7 rounded-md object-cover" /><span className="text-sm font-semibold text-foreground">{assistantName}</span><span className="text-xs text-muted-foreground">Research assistant</span></div>}
            <MessageContent className={msg.role === "assistant" ? "w-full text-lg leading-relaxed" : "bg-chat-user px-4 py-3.5 text-lg leading-relaxed text-chat-user-foreground"}>
              {msg.role === "assistant" ? <MessageResponse className="yusuf-report" isAnimating={status === "streaming" && msg.id === messages.at(-1)?.id}>{displayText}</MessageResponse> : displayText}
            </MessageContent>
            {msg.role === "assistant" && displayText && <MessageActions className="mt-1 border-t border-border/60 pt-2">
              <MessageAction tooltip="Copy reply" label="Copy reply" onClick={() => navigator.clipboard.writeText(displayText)}><Copy /></MessageAction>
              <MessageAction tooltip="Share reply" label="Share reply" onClick={() => void shareText(displayText)}><Share2 /></MessageAction>
              <MessageAction tooltip="Read aloud" label="Read aloud" onClick={() => readText(displayText)}><Volume2 /></MessageAction>
              <MessageAction tooltip="Ask Yusuf to reconsider" label="Reconsider" onClick={() => submitPrompt("Please reconsider your previous answer, check the evidence and gaps, then present a corrected conclusion.")}><RotateCcw /></MessageAction>
            </MessageActions>}
          </Message>;
        })}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <Message from="assistant" className="max-w-full"><div className="flex items-center gap-2"><img src={assistantAvatar} alt="" className="size-7 rounded-md object-cover" /><Shimmer className="text-sm">Yusuf is examining the evidence…</Shimmer></div></Message>
        )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-3" aria-label="Jump to latest message" />
      </Conversation>
      <div className="yusuf-composer relative z-20 max-h-[55%] shrink-0 overflow-y-auto border-t border-border bg-background px-3 pt-3 sm:px-6" aria-label="Write to Yusuf">
        <div className="mx-auto max-w-3xl">
          {chatError && (
            <div className="mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="break-words">{chatError}</span>
            </div>
          )}
          {voiceError && <p className="mb-2 text-xs text-destructive">{voiceError}</p>}
          {showVoiceSettings && (
            <div className="mb-2 rounded-xl border border-border bg-card p-3 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Voice settings</span>
                <button type="button" onClick={() => setShowVoiceSettings(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 block">
                  <span className="text-muted-foreground">Mic language</span>
                  <select value={micLang} onChange={(e) => setMicLang(e.target.value)} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                    {LANG_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1 block">
                  <span className="text-muted-foreground">Yusuf's language</span>
                  <select value={ttsLang} onChange={(e) => { setTtsLang(e.target.value); setTtsVoiceURI(""); }} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                    {LANG_OPTIONS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1 block">
                  <span className="text-muted-foreground">Yusuf's voice</span>
                  <select value={ttsVoiceURI} onChange={(e) => setTtsVoiceURI(e.target.value)} className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                    <option value="">System default</option>
                    {availableVoices
                      .filter((v) => v.lang.toLowerCase().startsWith(ttsLang.slice(0, 2).toLowerCase()))
                      .map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                  </select>
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground">Voices come from your browser/OS. Chrome and Edge offer the widest range.</p>
            </div>
          )}
          <PromptInput onSubmit={({ text }) => submitPrompt(text)} className="rounded-lg bg-card">
            <PromptInputTextarea ref={textareaRef} value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={isListening ? "Listening…" : `Ask ${assistantName} to examine…`} aria-label="Message to Yusuf" className="min-h-16 max-h-32 overflow-y-auto px-4 pt-3 text-lg leading-7 md:text-lg" />
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputButton onClick={() => setShowVoiceSettings((value) => !value)} tooltip="Voice settings"><SettingsIcon /></PromptInputButton>
                <PromptInputButton onClick={toggleMic} tooltip={isListening ? "Stop listening" : "Speak your message"} className={isListening ? "bg-destructive/15 text-destructive" : ""}>{isListening ? <MicOff /> : <Mic />}</PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit status={status} disabled={!chatInput.trim() && !isLoading} aria-label="Send message" />
            </PromptInputFooter>
          </PromptInput>
          <p className="mt-2 text-center text-xs text-muted-foreground">AI-assisted research can be wrong. Verify legal, financial, medical, and religious decisions with qualified sources.</p>
        </div>
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
