import { useState, useEffect, useCallback } from "react";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Button } from "react-bootstrap";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";
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
  const [fileUrl, setFileUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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

  if (step === "choose") {
    return (
      <Modal show onHide={onCancel} centered>
        <ModalHeader closeButton>
          <ModalTitle>Upload PDF</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p className="mb-3">
            <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
          </p>
          <p>How would you like to upload this PDF?</p>
          <div className="d-grid gap-2">
            <Button variant="primary" onClick={handleUploadWhole}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z" />
              </svg>
              Upload Whole PDF
            </Button>
            <Button variant="outline-primary" onClick={handleSelectPages}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="me-2" viewBox="0 0 16 16">
                <path d="M5 4a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm-.5 2.5A.5.5 0 0 1 5 6h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5zM5 8a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5zm0 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5z" />
                <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2zm10-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" />
              </svg>
              Select Specific Pages
            </Button>
          </div>
        </ModalBody>
      </Modal>
    );
  }

  // step === "select"
  return (
    <Modal show onHide={onCancel} centered size="lg" dialogClassName="pdf-selector-modal">
      <ModalHeader closeButton>
        <ModalTitle>
          Select Pages — {file.name}
          {numPages && <small className="text-muted ms-2">({numPages} pages)</small>}
        </ModalTitle>
      </ModalHeader>
      <ModalBody style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {loadError && (
          <div className="alert alert-danger">{loadError}</div>
        )}

        {numPages && (
          <div className="d-flex gap-2 mb-3 sticky-top bg-white py-2" style={{ zIndex: 1 }}>
            <Button size="sm" variant="outline-secondary" onClick={selectAll}>
              Select All
            </Button>
            <Button size="sm" variant="outline-secondary" onClick={deselectAll}>
              Deselect All
            </Button>
            <span className="ms-auto align-self-center text-muted small">
              {selectedPages.size} of {numPages} selected
            </span>
          </div>
        )}

        {fileUrl && (
          <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} loading={<div className="text-center py-4"><span className="spinner-border" role="status"><span className="visually-hidden">Loading PDF...</span></span></div>}>
            <div className="d-flex flex-wrap gap-3 justify-content-center">
              {numPages &&
                Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                  <div
                    key={pageNum}
                    className={`pdf-page-card position-relative ${selectedPages.has(pageNum) ? "selected" : ""}`}
                    onClick={() => togglePage(pageNum)}
                    style={{
                      cursor: "pointer",
                      border: selectedPages.has(pageNum) ? "3px solid #0d6efd" : "2px solid #dee2e6",
                      borderRadius: "8px",
                      padding: "4px",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                      boxShadow: selectedPages.has(pageNum) ? "0 0 0 3px rgba(13,110,253,0.25)" : "none",
                    }}
                  >
                    <Page pageNumber={pageNum} width={140} renderTextLayer={false} renderAnnotationLayer={false} />
                    <div className="text-center mt-1">
                      <small className="fw-bold">Page {pageNum}</small>
                    </div>
                    {selectedPages.has(pageNum) && (
                      <div
                        className="position-absolute top-0 end-0 bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                        style={{ width: "24px", height: "24px", margin: "4px" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </Document>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirmSelection} disabled={selectedPages.size === 0 || isProcessing}>
          {isProcessing ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
              Processing...
            </>
          ) : (
            `Upload ${selectedPages.size} Page${selectedPages.size !== 1 ? "s" : ""}`
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
