import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Upload, FileText, Image as ImageIcon, FileType2, Trash2, Sparkles,
  Loader2, Download, AlertCircle,
} from "lucide-react";
import {
  listFiles, createFileRecord, deleteFile, summarizeFile, getFileSignedUrl,
} from "@/lib/files.functions";

const MAX_BYTES = 20 * 1024 * 1024;
const ACCEPT = ".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,.gif,.docx";

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.includes("pdf")) return FileType2;
  return FileText;
}

function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function FilesView() {
  const qc = useQueryClient();
  const fetchFiles = useServerFn(listFiles);
  const createRec = useServerFn(createFileRecord);
  const removeFile = useServerFn(deleteFile);
  const summarize = useServerFn(summarizeFile);
  const getUrl = useServerFn(getFileSignedUrl);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ["files"], queryFn: fetchFiles });
  const files = data?.files ?? [];

  const delMut = useMutation({
    mutationFn: (id: string) => removeFile({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }),
  });

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      for (const file of Array.from(list)) {
        if (file.size > MAX_BYTES) {
          setError(`"${file.name}" is over 20MB.`);
          continue;
        }
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${user.id}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("user-files").upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        await createRec({ data: {
          name: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          storage_path: path,
        }});
      }
      qc.invalidateQueries({ queryKey: ["files"] });
    } catch (e: any) {
      setError(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSummarize = async (id: string) => {
    setSummarizingId(id);
    try {
      await summarize({ data: { id } });
      qc.invalidateQueries({ queryKey: ["files"] });
    } catch (e: any) {
      setError(e?.message ?? "Summarization failed");
    } finally {
      setSummarizingId(null);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const res = await getUrl({ data: { id } });
      const a = document.createElement("a");
      a.href = res.url; a.download = name; a.target = "_blank";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e: any) { setError(e?.message ?? "Download failed"); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-display">Files</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload documents and images. Yusuf can read them and answer questions about them in chat.
          </p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={uploading} className="shrink-0">
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Upload
        </Button>
        <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      </header>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border bg-card/50"}`}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-foreground">Drag and drop files here, or click <button type="button" onClick={() => inputRef.current?.click()} className="text-primary font-medium underline">browse</button></p>
        <p className="text-xs text-muted-foreground mt-1">PDF, TXT, MD, CSV, JSON, DOCX, PNG, JPG, WEBP — up to 20 MB each</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {files.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No files yet. Upload one to get started.</p>
        )}
        {files.map((f: any) => {
          const Icon = iconFor(f.mime_type);
          const isSumming = summarizingId === f.id;
          return (
            <div key={f.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.mime_type} · {formatSize(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="Download" onClick={() => handleDownload(f.id, f.name)} className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title={f.summary ? "Re-summarize" : "Summarize"} onClick={() => handleSummarize(f.id)} disabled={isSumming} className="h-8 w-8">
                    {isSumming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete" onClick={() => delMut.mutate(f.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {f.summary && (
                <div className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {f.summary}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
