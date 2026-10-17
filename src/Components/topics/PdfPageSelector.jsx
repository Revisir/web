import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
import { Check, File as FileIcon, FileText, LoaderCircle } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { cn } from "@/lib/utils";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * PdfPageSelector - A modal that lets users choose to upload a full PDF
 * or select specific pages with a visual preview.
 *
 * Props:
 * - file: the original PDF File object
 * - onConfirm: (file: File) => void — called with the final file (original or trimmed)
 * - onCancel: () => void — called when user cancels
 */
export default function PdfPageSelector({ file, onConfirm, onCancel }) {
  const [step, setStep] = useState("choose"); // "choose" | "select"
  const [numPages, setNumPages] = useState(null);
  const [selectedPages, setSelectedPages] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const onDocumentLoadSuccess = useCallback(({ numPages: total }) => {
    setNumPages(total);
    setLoadError(null);
  }, []);

  const onDocumentLoadError = useCallback((error) => {
    setLoadError("Failed to load PDF preview.");
    console.error("PDF load error:", error);
  }, []);

  const togglePage = (pageNum) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (numPages) {
      const all = new Set(Array.from({ length: numPages }, (_, i) => i + 1));
      setSelectedPages(all);
    }
  };

  const deselectAll = () => {
    setSelectedPages(new Set());
  };

  const handleUploadWhole = () => {
    onConfirm(file);
  };

  const handleSelectPages = () => {
    setStep("select");
  };

  const handleConfirmSelection = async () => {
    if (selectedPages.size === 0) return;

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const newDoc = await PDFDocument.create();

      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
      const copiedPages = await newDoc.copyPages(
        srcDoc,
        sortedPages.map((p) => p - 1)
      );
      copiedPages.forEach((page) => newDoc.addPage(page));

      const pdfBytes = await newDoc.save();
      const newFile = new File([pdfBytes], file.name, { type: "application/pdf" });
      onConfirm(newFile);
    } catch (err) {
      console.error("Error creating PDF subset:", err);
      setLoadError("Failed to process PDF pages. Uploading whole file instead.");
      onConfirm(file);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open) onCancel();
  };

  if (step === "choose") {
    return (
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="m-0 text-headline-md">Upload PDF</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 text-body-md">
            <p className="m-0 break-words">
              <strong>{file.name}</strong> <span className="font-mono text-mono-md text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
            </p>
            <p className="m-0">How would you like to upload this PDF?</p>
            <div className="grid gap-2">
              <Button size="lg" onClick={handleUploadWhole}>
                <FileIcon data-icon="inline-start" />
                Upload Whole PDF
              </Button>
              <Button size="lg" variant="outline" onClick={handleSelectPages}>
                <FileText data-icon="inline-start" />
                Select Specific Pages
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // step === "select"
  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="m-0 pr-8 text-headline-md break-words">
            Select Pages — {file.name}
            {numPages && (
              <span className="ml-2 font-mono text-mono-md text-muted-foreground">
                ({numPages} pages)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {loadError && (
            <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-body-md text-destructive">
              {loadError}
            </div>
          )}

          {numPages && (
            <div className="sticky top-0 z-[1] mb-4 flex flex-wrap gap-2 bg-popover py-2">
              <Button size="sm" variant="outline" onClick={selectAll}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={deselectAll}>
                Deselect All
              </Button>
              <span className="ml-auto self-center text-body-sm text-muted-foreground">
                <span className="font-mono text-mono-sm">{selectedPages.size}</span> of <span className="font-mono text-mono-sm">{numPages}</span> selected
              </span>
            </div>
          )}

          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex justify-center py-6" role="status">
                <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
                <span className="sr-only">Loading PDF...</span>
              </div>
            }
          >
            <div className="flex flex-wrap justify-center gap-4">
              {numPages &&
                Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
                  const selected = selectedPages.has(pageNum);
                  return (
                    <div
                      key={pageNum}
                      className={cn(
                        "relative cursor-pointer rounded-lg p-1 transition-[border-color,box-shadow] duration-200",
                        selected ? "border-[3px] border-primary bg-surface-container-high ring-[3px] ring-primary/25" : "border-2 border-border bg-surface-container-low",
                      )}
                      onClick={() => togglePage(pageNum)}
                    >
                      <Page pageNumber={pageNum} width={140} renderTextLayer={false} renderAnnotationLayer={false} />
                      <div className="mt-1 text-center">
                        <span className="font-mono text-mono-sm font-semibold">Page {pageNum}</span>
                      </div>
                      {selected && (
                        <div className="absolute top-0 right-0 m-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check aria-hidden="true" className="size-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </Document>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSelection} disabled={selectedPages.size === 0 || isProcessing}>
            {isProcessing ? (
              <>
                <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" />
                Processing...
              </>
            ) : (
              `Upload ${selectedPages.size} Page${selectedPages.size !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
