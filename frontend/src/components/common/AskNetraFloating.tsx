import React, { useState } from "react";
import { Bot, X, Send, Sparkles, Code2, Table, BarChart3, Copy, Check } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  sender: "user" | "netra";
  text: string;
  sql?: string;
  tableData?: { columns: string[]; rows: (string | number)[][] };
  chartType?: "bar" | "line";
  timestamp: string;
}

const suggestedQuestions = [
  "Which mines have CAPAs open for more than 7 days?",
  "कौन सी खदानों में 7 दिन से ज़्यादा CAPA खुले हैं?",
  "Top 5 contractors with most ghost-worker alerts",
  "Compliance percentage of BCCL mines this month",
];

export const AskNetraFloating: React.FC = () => {
  const { isAskNetraOpen, setAskNetraOpen, language } = useAppStore();
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-1",
      sender: "netra",
      text:
        language === "hi"
          ? "नमस्ते! मैं आपका एआई सहायक 'खनन नेत्र' हूँ। आप खदान अनुपालन, CAPA, ठेकेदार धोखाधड़ी या सुरक्षा पर कोई भी प्रश्न हिंदी या अंग्रेजी में पूछ सकते हैं।"
          : "Hello! I am Netra, your AI Copilot. Ask me any question on mine compliance, CAPA delays, contractor fraud, or safety risk in English or Hindi.",
      timestamp: "Just now",
    },
  ]);

  const handleSend = (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");

    // Simulate AI response
    setTimeout(() => {
      let replyText = "Analysis completed across active coalfield databases.";
      let sqlQuery = "SELECT mine_name, open_capas, risk_pct FROM mines WHERE open_capas > 5 ORDER BY risk_pct DESC LIMIT 5;";
      let tableData = {
        columns: ["Mine Name", "Open CAPAs", "Risk %", "Manager"],
        rows: [
          ["Kusunda Opencast Mine", 11, "78%", "Er. S. Mukherjee"],
          ["Karkali Open Pit", 8, "72%", "Er. N. Prasad"],
          ["Jharia Underground", 5, "34%", "Er. R. Singh"],
        ],
      };

      if (textToSend.includes("contractor") || textToSend.includes("ठेकेदार")) {
        replyText = "Top contractors flagged for biometric device sharing and ghost-worker anomalies:";
        sqlQuery = "SELECT contractor_name, alert_type, affected_workers FROM contractor_alerts WHERE severity = 'HIGH';";
        tableData = {
          columns: ["Contractor", "Fraud Alert Type", "Affected Workers", "Status"],
          rows: [
            ["M/s Eastern Infra Ltd", "Biometric Device Sharing (5 workers/device)", 5, "Flagged"],
            ["Shree Ram Mining Services", "Wage Payment below Minimum ₹310", 12, "Under Review"],
          ],
        };
      } else if (textToSend.includes("BCCL") || textToSend.includes("अनुपालन")) {
        replyText = "Compliance performance summary for BCCL Subsidiary mines (September 2026):";
        sqlQuery = "SELECT area_name, AVG(compliance_pct) as avg_compliance FROM mines WHERE subsidiary = 'BCCL' GROUP BY area_name;";
        tableData = {
          columns: ["BCCL Area", "Mines Count", "Avg Compliance %", "Risk Level"],
          rows: [
            ["Jharia Area IX", 3, "88.4%", "LOW"],
            ["Kusunda Area VI", 2, "74.1%", "HIGH"],
            ["Katras Area IV", 4, "82.0%", "MEDIUM"],
          ],
        };
      }

      const aiMsg: Message = {
        id: `netra-${Date.now()}`,
        sender: "netra",
        text: replyText,
        sql: sqlQuery,
        tableData: tableData,
        chartType: "bar",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    }, 600);
  };

  const copySql = (sql: string, id: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isAskNetraOpen) {
    return (
      <button
        onClick={() => setAskNetraOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold font-display rounded-full shadow-2xl hover:scale-105 transition-transform duration-200 border-2 border-slate-900 group"
      >
        <Bot size={22} className="group-hover:rotate-12 transition-transform" />
        <span className="text-sm">Ask Netra (AI Copilot)</span>
        <span className="size-2 rounded-full bg-slate-950 animate-ping" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 sm:w-[420px] h-[580px] bg-slate-950 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
      {/* Drawer Header */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-slate-100 flex items-center gap-1.5">
              Ask Netra AI Copilot
              <Sparkles size={13} className="text-amber-400" />
            </h3>
            <p className="text-[11px] text-slate-400">Natural Language Mine Intelligence</p>
          </div>
        </div>
        <button
          onClick={() => setAskNetraOpen(false)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[90%] p-3 rounded-xl ${
                m.sender === "user"
                  ? "bg-amber-500 text-slate-950 font-medium rounded-tr-none"
                  : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none space-y-2.5"
              }`}
            >
              <p className="leading-relaxed">{m.text}</p>

              {/* Table Result */}
              {m.tableData && (
                <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950/80 p-2">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-amber-400 font-mono">
                        {m.tableData.columns.map((col) => (
                          <th key={col} className="pb-1 pr-2">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {m.tableData.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((val, idx) => (
                            <td key={idx} className="py-1 pr-2">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* SQL Query Collapsible View */}
              {m.sql && (
                <div className="bg-slate-950 rounded p-2 border border-slate-800 font-mono text-[11px] text-emerald-400 relative">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="flex items-center gap-1"><Code2 size={12} /> Generated SQL</span>
                    <button
                      onClick={() => copySql(m.sql!, m.id)}
                      className="text-slate-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      {copiedId === m.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copiedId === m.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <code>{m.sql}</code>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {suggestedQuestions.map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            className="shrink-0 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-[11px] border border-slate-700 truncate max-w-[240px]"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={language === "hi" ? "प्रश्न पूछें (जैसे: 7 दिन से पुराने CAPA)..." : "Ask Netra a question..."}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
        />
        <Button
          onClick={() => handleSend()}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3"
        >
          <Send size={15} />
        </Button>
      </div>
    </div>
  );
};
