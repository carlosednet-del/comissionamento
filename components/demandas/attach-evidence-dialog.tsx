"use client";

import { useRef, useState } from "react";
import { useForm }           from "react-hook-form";
import { zodResolver }       from "@hookform/resolvers/zod";
import { useRouter }         from "next/navigation";
import { z }                 from "zod";
import { attachEvidenceAction, uploadEvidenceImageAction } from "@/server/actions/demandActions";
import { Button }      from "@/components/ui/button";
import { Input }       from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Loader2, Paperclip, Link2, ImageIcon, UploadCloud, X } from "lucide-react";

// ── Schemas ──────────────────────────────────────────────────────

const urlSchema = z.object({
  title:       z.string().min(3, "Título deve ter ao menos 3 caracteres").max(200),
  url:         z.string().url("URL inválida"),
  description: z.string().optional(),
});

const imageSchema = z.object({
  title:       z.string().min(3, "Título deve ter ao menos 3 caracteres").max(200),
  description: z.string().optional(),
});

type UrlValues   = z.infer<typeof urlSchema>;
type ImageValues = z.infer<typeof imageSchema>;

// ── Props ─────────────────────────────────────────────────────────

type Props = {
  demandId: string;
  trigger?: React.ReactNode;
};

// ── Helpers ───────────────────────────────────────────────────────

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_MB       = 5;

function humanSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Component ─────────────────────────────────────────────────────

export function AttachEvidenceDialog({ demandId, trigger }: Props) {
  const router = useRouter();

  const [open,    setOpen]    = useState(false);
  const [tab,     setTab]     = useState<"link" | "image">("link");
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Image-mode state
  const [file,       setFile]       = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL-mode form
  const urlForm = useForm<UrlValues>({
    resolver:      zodResolver(urlSchema),
    defaultValues: { title: "", url: "", description: "" },
  });

  // Image-mode form (title + description only)
  const imageForm = useForm<ImageValues>({
    resolver:      zodResolver(imageSchema),
    defaultValues: { title: "", description: "" },
  });

  // ── Helpers ────────────────────────────────────────────────────

  function resetAll() {
    urlForm.reset();
    imageForm.reset();
    setError(null);
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setTab("link");
    setLoading(false);
  }

  function handleFileSelect(selected: File | null) {
    if (!selected) return;
    if (!ALLOWED_MIME.includes(selected.type)) {
      setError("Formato inválido. Use JPG, PNG, GIF, WebP ou SVG.");
      return;
    }
    if (selected.size > MAX_MB * 1024 * 1024) {
      setError(`Imagem deve ter no máximo ${MAX_MB} MB.`);
      return;
    }
    setError(null);
    setFile(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  // ── Submit: URL mode ──────────────────────────────────────────

  async function onSubmitUrl(values: UrlValues) {
    setError(null);
    const result = await attachEvidenceAction({ demandId, ...values });
    if (!result.success) { setError(result.error); return; }
    setOpen(false);
    resetAll();
    router.refresh();
  }

  // ── Submit: Image mode ────────────────────────────────────────

  async function onSubmitImage(values: ImageValues) {
    if (!file) { setError("Selecione uma imagem antes de enviar."); return; }
    setError(null);
    setLoading(true);
    try {
      // 1. Upload image → get URL
      const fd = new FormData();
      fd.append("file", file);
      const uploadResult = await uploadEvidenceImageAction(fd);
      if (!uploadResult.success) { setError(uploadResult.error); return; }

      // 2. Save evidence
      const saveResult = await attachEvidenceAction({
        demandId,
        title:       values.title,
        url:         uploadResult.data.url,
        description: values.description,
      });
      if (!saveResult.success) { setError(saveResult.error); return; }

      setOpen(false);
      resetAll();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // ── Drag & drop ───────────────────────────────────────────────

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0] ?? null;
    handleFileSelect(dropped);
  }

  // ── Render ────────────────────────────────────────────────────

  const isSubmitting = urlForm.formState.isSubmitting || imageForm.formState.isSubmitting || loading;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetAll();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Paperclip className="mr-2 h-4 w-4" />
            Anexar evidência
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anexar evidência</DialogTitle>
          <DialogDescription>
            Adicione um link ou imagem como evidência desta demanda.
          </DialogDescription>
        </DialogHeader>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="flex rounded-md border overflow-hidden text-sm font-medium">
          <button
            type="button"
            onClick={() => { setTab("link"); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 transition-colors
              ${tab === "link"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <Link2 className="h-4 w-4" />
            Link / URL
          </button>
          <button
            type="button"
            onClick={() => { setTab("image"); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 transition-colors
              ${tab === "image"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <ImageIcon className="h-4 w-4" />
            Imagem
          </button>
        </div>

        {/* ── URL mode ─────────────────────────────────────────── */}
        {tab === "link" && (
          <Form {...urlForm}>
            <form onSubmit={urlForm.handleSubmit(onSubmitUrl)} className="space-y-4">
              <FormField
                control={urlForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: PR #123 — Correção do bug" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={urlForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://github.com/…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={urlForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição opcional" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Paperclip className="mr-2 h-4 w-4" />}
                  Anexar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {/* ── Image mode ───────────────────────────────────────── */}
        {tab === "image" && (
          <Form {...imageForm}>
            <form onSubmit={imageForm.handleSubmit(onSubmitImage)} className="space-y-4">
              <FormField
                control={imageForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Ex.: Print da tela de sucesso" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Drop zone / preview */}
              {!previewUrl ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
                    cursor-pointer py-8 text-sm transition-colors select-none
                    ${dragOver
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/40"}`}
                >
                  <UploadCloud className="h-8 w-8 opacity-60" />
                  <span className="font-medium">Arraste ou clique para selecionar</span>
                  <span className="text-xs opacity-70">JPG, PNG, GIF, WebP, SVG — máx. {MAX_MB} MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ALLOWED_MIME.join(",")}
                    className="sr-only"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  />
                </div>
              ) : (
                <div className="relative rounded-lg border overflow-hidden bg-muted/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="preview"
                    className="max-h-40 w-full object-contain"
                  />
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-t">
                    <span className="truncate max-w-[80%]">{file?.name}</span>
                    <span>{humanSize(file?.size ?? 0)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFile(null); URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setError(null); }}
                    className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    aria-label="Remover imagem"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <FormField
                control={imageForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição opcional" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !file}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Enviar imagem
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
