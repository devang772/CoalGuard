import { useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { askNetraApi } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

type Message = { id: string; sender: "user" | "netra"; text: string; sources?: unknown[]; error?: boolean };
export function AskNetraFloating() {
  const { isAskNetraOpen, setAskNetraOpen, language } = useAppStore();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const send = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput(""); setBusy(true); setMessages((items) => [...items, { id: `user-${Date.now()}`, sender: "user", text: question }]);
    try {
      const response = await askNetraApi(question);
      setMessages((items) => [...items, { id: `netra-${Date.now()}`, sender: "netra", text: response.answer, sources: response.sources }]);
    } catch (e) {
      setMessages((items) => [...items, { id: `error-${Date.now()}`, sender: "netra", text: e instanceof Error ? e.message : "AI request failed", error: true }]);
    } finally { setBusy(false); }
  };
  if (!isAskNetraOpen) return <button onClick={() => setAskNetraOpen(true)} className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border-2 border-slate-900 bg-amber-500 px-4 py-3 font-bold text-slate-950 shadow-2xl"><Bot size={22} />Ask Netra</button>;
  return <div className="fixed bottom-6 right-6 z-50 flex h-[580px] w-96 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-3.5 text-slate-100"><div className="flex items-center gap-2"><Bot size={18} className="text-amber-400" /><div><h3 className="text-sm font-bold">Ask Netra</h3><p className="text-[11px] text-slate-400">Responses are sourced from CoalGuard records</p></div><Sparkles size={13} className="text-amber-400" /></div><button onClick={() => setAskNetraOpen(false)}><X size={18} /></button></div>
    <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">{messages.length === 0 && <p className="rounded-lg border border-slate-800 p-3 text-slate-400">{language === "hi" ? "रिकॉर्ड-आधारित प्रश्न पूछें।" : "Ask a question about records available in CoalGuard."}</p>}{messages.map((m) => <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}><div className={`max-w-[90%] rounded-xl p-3 ${m.sender === "user" ? "bg-amber-500 text-slate-950" : m.error ? "border border-rose-500 bg-rose-950/40 text-rose-200" : "border border-slate-800 bg-slate-900 text-slate-200"}`}><p className="leading-relaxed">{m.text}</p>{m.sources && m.sources.length > 0 && <p className="mt-2 text-[10px] text-slate-400">Sources: {m.sources.map((source) => typeof source === "string" ? source : JSON.stringify(source)).join(" · ")}</p>}</div></div>)}{busy && <p className="text-slate-400">Querying the API…</p>}</div>
    <div className="flex gap-2 border-t border-slate-800 bg-slate-900 p-3"><input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void send()} placeholder={language === "hi" ? "प्रश्न पूछें…" : "Ask about CoalGuard data…"} className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200" /><Button onClick={() => void send()} disabled={busy} size="sm" className="bg-amber-500 text-slate-950 hover:bg-amber-600"><Send size={15} /></Button></div>
  </div>;
}
