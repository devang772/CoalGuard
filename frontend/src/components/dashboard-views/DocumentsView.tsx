import { useState } from "react";
import {
  Files,
  Upload,
  Search,
  Filter,
  FileText,
  Download,
  Bot,
  Sparkles,
  Eye,
  CheckCircle,
  X,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const documentsData = [
  {
    id: "DOC-2026-904",
    title: "DGMS Safety Inspection Circular #14 (Monsoon Safety Guidelines)",
    category: "DGMS Statutory",
    mine: "Jharia Underground Coal Mine",
    ocrStatus: "OCR Processed (100%)",
    date: "21 Sep 2026",
    size: "4.2 MB",
    format: "PDF",
    status: "Verified",
    tone: "low",
  },
  {
    id: "DOC-2026-882",
    title: "Jharia Mine Environmental Impact Clearance Certificate (MoEFCC)",
    category: "Environmental",
    mine: "Jharia Underground Coal Mine",
    ocrStatus: "OCR Processed (99.4%)",
    date: "19 Sep 2026",
    size: "12.8 MB",
    format: "PDF",
    status: "Valid",
    tone: "low",
  },
  {
    id: "DOC-2026-761",
    title: "Highwall Slope Stability Sensor Calibration Log Q3 2026",
    category: "Engineering Log",
    mine: "Kusunda Opencast Mine",
    ocrStatus: "OCR Processed (98.2%)",
    date: "15 Sep 2026",
    size: "2.1 MB",
    format: "PDF",
    status: "Archived",
    tone: "medium",
  },
  {
    id: "DOC-2026-650",
    title: "Kusunda Open Pit Explosives & Blasting SOP Manual",
    category: "Safety Manual",
    mine: "Kusunda Opencast Mine",
    ocrStatus: "RAG Indexed",
    date: "10 Sep 2026",
    size: "8.5 MB",
    format: "PDF",
    status: "Active",
    tone: "low",
  },
  {
    id: "DOC-2026-541",
    title: "Hydrogeological Water Seepage & Inundation Assessment",
    category: "Audit Report",
    mine: "Moonidih Shaft & Washery",
    ocrStatus: "OCR Processed (100%)",
    date: "02 Sep 2026",
    size: "6.4 MB",
    format: "PDF",
    status: "Valid",
    tone: "low",
  },
  {
    id: "DOC-2026-410",
    title: "Karkali Pit Dust Suppression NOC & Water Discharge Audit",
    category: "Environmental",
    mine: "Karkali Open Pit",
    ocrStatus: "Pending RAG Index",
    date: "28 Aug 2026",
    size: "3.7 MB",
    format: "PDF",
    status: "Review Needed",
    tone: "high",
  },
];

export function DocumentsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [ragQuery, setRagQuery] = useState("");
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);

  const filteredDocs = documentsData.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.mine.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All" || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleRagSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    setRagAnswer(
      `According to DGMS Circular #14 (DOC-2026-904) and Jharia SOP, the maximum permitted inflammable gas (CH4) concentration at any working face is 0.75% for continuous operation and 1.25% for emergency power shutoff.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Document AI & Repository</h2>
          <p className="text-sm text-muted-foreground">
            Central RAG-indexed repository for statutory certificates, DGMS circulars, safety manuals, and OCR audit logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
            <Upload className="size-4" /> Upload Statutory Document
          </Button>
        </div>
      </div>

      {/* RAG Engine Search Box */}
      <div className="dashboard-card p-5 border-2 border-primary/20 bg-gradient-to-r from-card to-primary/5">
        <div className="flex items-center gap-2 text-primary font-display font-semibold text-sm mb-2">
          <Sparkles className="size-4" /> RAG Knowledge Engine — Ask AI Document Assistant
        </div>
        <form onSubmit={handleRagSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Bot className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ask anything (e.g. 'What is the required dust misting pressure under DGMS guidelines?')..."
              value={ragQuery}
              onChange={(e) => setRagQuery(e.target.value)}
              className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
          <Button type="submit">Ask RAG AI</Button>
        </form>

        {ragAnswer && (
          <div className="mt-4 rounded-lg border bg-background p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-primary flex items-center gap-1">
                <Sparkles className="size-3" /> AI Contextual Response:
              </span>
              <button onClick={() => setRagAnswer(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </div>
            <p className="text-foreground leading-relaxed">{ragAnswer}</p>
            <span className="text-[10px] text-muted-foreground block">
              Source: DGMS Circular #14 (DOC-2026-904) · Confidence 99.1%
            </span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documents by title, mine or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium outline-none focus:border-primary"
          >
            <option value="All">All Categories</option>
            <option value="DGMS Statutory">DGMS Statutory</option>
            <option value="Environmental">Environmental</option>
            <option value="Engineering Log">Engineering Log</option>
            <option value="Safety Manual">Safety Manual</option>
            <option value="Audit Report">Audit Report</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="dashboard-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="dashboard-table min-w-full">
            <thead>
              <tr>
                <th>Doc ID</th>
                <th>Document Title</th>
                <th>Category</th>
                <th>Associated Mine</th>
                <th>OCR Status</th>
                <th>Upload Date</th>
                <th>Size</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-muted/30">
                  <td className="font-mono text-xs font-bold text-primary">{doc.id}</td>
                  <td className="font-semibold text-foreground max-w-xs truncate">{doc.title}</td>
                  <td>
                    <span className="text-xs font-medium text-muted-foreground">{doc.category}</span>
                  </td>
                  <td className="text-xs text-muted-foreground">{doc.mine}</td>
                  <td>
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="size-3" /> {doc.ocrStatus}
                    </span>
                  </td>
                  <td className="text-xs text-muted-foreground">{doc.date}</td>
                  <td className="text-xs font-mono">{doc.size}</td>
                  <td>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      <Download className="size-3" /> PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="dashboard-card w-full max-w-lg bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-display text-lg font-bold">Upload Statutory Document</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsUploadOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Document uploaded and sent to OCR / RAG indexing pipeline!");
                setIsUploadOpen(false);
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DGMS Annual Methane Protocol 2026"
                  className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Statutory Category</label>
                  <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                    <option>DGMS Statutory</option>
                    <option>Environmental Clearance</option>
                    <option>Safety SOP Manual</option>
                    <option>Engineering Audit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Select Mine Site</label>
                  <select className="w-full rounded-md border bg-background p-2 text-sm outline-none focus:border-primary">
                    <option>Jharia Underground Coal Mine</option>
                    <option>Kusunda Opencast Mine</option>
                    <option>Moonidih Shaft & Washery</option>
                    <option>Karkali Open Pit</option>
                  </select>
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center hover:border-primary cursor-pointer bg-muted/20">
                <Upload className="size-8 text-muted-foreground mb-2" />
                <p className="text-xs font-semibold">Click to upload or drag & drop</p>
                <p className="text-[10px] text-muted-foreground mt-1">PDF, DOCX, XLSX up to 50MB (Automated OCR enabled)</p>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Start Upload & OCR</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
