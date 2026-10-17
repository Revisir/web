import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import MindElixir from "mind-elixir";
import "mind-elixir/style.css";
import { ArrowLeft, ExternalLink, File as FileIcon, FileCode, FileImage, FileText, FileType, Info, LoaderCircle, Pencil, Plus, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/Components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/Components/ui/alert-dialog";
import { Button } from "@/Components/ui/button";
import { Card, CardContent } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Separator } from "@/Components/ui/separator";
import IconButton from "@/Components/common/IconButton";
import StatusBadge from "@/Components/common/StatusBadge";
import TopicModal from "./TopicModal";
import RevisionChat from "./RevisionChat";
import TopicActions from "./TopicActions";
import PdfPageSelector from "./PdfPageSelector";
import ForgettingCurve from "../charts/ForgettingCurve";
import { useTopicDetails, useTopicHistory, useTopicForgettingCurve, useTopicDelete, useTopicFileUpload, useTopicFileDelete, useTopicReset, useTopicUpdate, useTopicMindMapGenerate, useRefreshTopicAfterReview, TOPIC_DETAILS_KEY } from "../../hooks/useTopicQuery";
import useThemeColors from "../../hooks/useThemeColors";
import { getApiErrorMessage } from "../../utils/apiErrors";
import { useQueryClient } from "@tanstack/react-query";

// Below lg the sections run to the card's edges, as they did before the restyle.
const ACCORDION_CLASS = "mt-6 overflow-hidden rounded-xl border border-border max-lg:-mx-4 max-lg:-mb-4 max-lg:w-auto max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0";
const TRIGGER_CLASS = "items-center rounded-none px-4 py-3 text-headline-sm text-foreground hover:bg-surface-container hover:no-underline";
// h-auto: a section grows after it opens (selected files, the chart, a generated mind map), and the default fixed height would clip it.
const SECTION_CLASS = "h-auto px-4 pt-1 pb-4 text-body-md [&_p:not(:last-child)]:mb-0";
const ERROR_BOX_CLASS = "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-body-md text-destructive";
const TH_CLASS = "px-2 py-1.5 text-left text-label-md whitespace-nowrap text-muted-foreground";
const TD_CLASS = "px-2 py-1.5 font-mono text-mono-md whitespace-nowrap text-foreground";

// Each file and URL shows its real extraction state (R40).
const ATTACHMENT_STATUS = {
  pending: { tone: "neutral", label: "Pending" },
  processing: { tone: "warning", label: "Processing" },
  completed: { tone: "success", label: "Completed" },
  failed: { tone: "destructive", label: "Failed" },
};

function AttachmentStatus({ status }) {
  const view = ATTACHMENT_STATUS[status];
  return view ? <StatusBadge tone={view.tone}>{view.label}</StatusBadge> : null;
}

export default function TopicDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [showChat, setShowChat] = useState(false);

  const { isFetched, data: topic } = useTopicDetails(id);
  const { data: historyObj } = useTopicHistory(id);
  const history = historyObj?.history;
  const { data: forgettingCurveData } = useTopicForgettingCurve(id);

  const refreshAfterReview = useRefreshTopicAfterReview();
  const { mutate: deleteTopic } = useTopicDelete();
  const { isPending: isUploading, mutate: uploadFiles, error: uploadError, reset: resetUpload } = useTopicFileUpload();
  const { isPending: isUpdating, mutate: updateTopic } = useTopicUpdate();
  const { mutate: resetTopicProgress } = useTopicReset();
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [pdfToProcess, setPdfToProcess] = useState(null); // PDF file awaiting page selection

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Check if any file is a PDF — if so, open the page selector for it
    const pdfFile = files.find((f) => f.type === "application/pdf");
    const nonPdfFiles = files.filter((f) => f.type !== "application/pdf");

    // Add non-PDF files immediately
    if (nonPdfFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...nonPdfFiles].slice(0, 5));
    }

    // If there's a PDF, show the page selector modal
    if (pdfFile) {
      setPdfToProcess(pdfFile);
    }

    e.target.value = "";
  };

  const handlePdfConfirm = (processedFile) => {
    setSelectedFiles((prev) => [...prev, processedFile].slice(0, 5));
    setPdfToProcess(null);
  };

  const handlePdfCancel = () => {
    setPdfToProcess(null);
  };

  const queryClient = useQueryClient();

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;
    resetUpload();
    uploadFiles({ id, files: selectedFiles }, {
      onSuccess: () => {
        setSelectedFiles([]);
        setUploadStatus("Uploading file...");
        setTimeout(() => setUploadStatus("Processing file..."), 2000);
        setTimeout(() => setUploadStatus("Finalizing..."), 4000);
        setTimeout(() => {
          setUploadStatus(null);
          queryClient.invalidateQueries({ queryKey: [TOPIC_DETAILS_KEY, String(id)] });
        }, 5000);
      }
    });
  };

  const removeSelectedFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const [urls, setUrls] = useState([]);
  const [urlsInitialized, setUrlsInitialized] = useState(false);
  if (topic && !urlsInitialized) {
    setUrlsInitialized(true);
    setUrls(topic.urls?.length ? [...topic.urls.map((u) => u.url || u), ""] : [""]);
  }

  const handleUrlChange = (idx, value) => {
    setUrls((prev) => prev.map((u, i) => (i === idx ? value : u)));
  };

  const addUrl = () => {
    if (urls[urls.length - 1]?.trim()) setUrls((prev) => [...prev, ""]);
  };

  const removeUrl = (idx) => setUrls((prev) => prev.filter((_, i) => i !== idx));

  const saveUrls = () => {
    const filtered = urls.filter((u) => u.trim());
    updateTopic({ id, formData: { urls: filtered } });
  };

  const handleDelete = async () => {
    try {
      deleteTopic({ id });
      navigate("/");
    } catch {
      console.error("Failed to delete topic");
    }
  };

  // The chat records its own review (or finds the topic already reviewed today), so the page only refetches.
  const handleChatClose = (userQuality) => {
    setShowChat(false);
    if (userQuality != null) refreshAfterReview(id);
  };

  if (!isFetched) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" role="status">
        <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (!topic) {
    return <div className={ERROR_BOX_CLASS}>Topic not found</div>;
  }

  // Saved URLs carry their status; a row edited away from its saved URL shows none.
  const savedUrls = new Map((topic.urls ?? []).filter((entry) => typeof entry === "object" && entry?.url).map((entry) => [entry.url, entry]));
  const failedFiles = (topic.files ?? []).filter((file) => file.processingStatus === "failed" && file.errorReason);

  return (
    <div className="mt-6 lg:px-4">
      <Button variant="link" onClick={() => navigate(-1)} className="mb-4 h-auto p-0">
        <ArrowLeft aria-hidden="true" />
        Back to List
      </Button>

      {showEditModal && <TopicModal setShowModal={setShowEditModal} topic={topic} />}
      <Card>
        <CardContent>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col items-start gap-2">
              <h2 className="m-0 text-headline-lg break-words text-foreground">{topic.topicName}</h2>
              {topic.subjectName && <span className="max-w-full truncate rounded bg-primary/15 px-2 py-0.5 font-mono text-mono-sm font-semibold uppercase text-primary">{topic.subjectName}</span>}
            </div>
            <div className="flex shrink-0 gap-2">
              <IconButton label="Reset Progress" variant="outline" onClick={() => setShowResetModal(true)}>
                <RotateCcw />
              </IconButton>
              <IconButton label="Delete" variant="destructive" onClick={() => setShowDeleteModal(true)}>
                <Trash2 />
              </IconButton>
              <IconButton label="Edit" variant="outline" onClick={() => setShowEditModal(true)}>
                <Pencil />
              </IconButton>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-1">
            <span className="text-label-md text-muted-foreground">Description</span>
            <p className="m-0 text-body-md break-words text-foreground">{topic.description || "No description"}</p>
          </div>

          <div className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-label-md text-muted-foreground">Date Studied</span>
            <span className="font-mono text-mono-md text-foreground">{topic.dateStudied ? DateTime.fromISO(topic.dateStudied).toLocaleString(DateTime.DATE_MED) : "N/A"}</span>
          </div>

          <TopicActions key={topic._id} topic={topic} onStartAiQuiz={() => setShowChat(true)} />

          <Accordion type="multiple" className={ACCORDION_CLASS}>
            <AccordionItem value="materials">
              <AccordionTrigger className={TRIGGER_CLASS}>Materials</AccordionTrigger>
              <AccordionContent className={SECTION_CLASS}>
                <h4 className="m-0 mb-2 text-headline-sm text-foreground">Files</h4>
                <div className="flex flex-wrap gap-4">
                  {topic.files?.map((file, idx) => (
                    <FileCard key={file._id || idx} file={file} topicId={id} />
                  ))}
                  <button
                    type="button"
                    aria-label="Add files"
                    className="flex size-[120px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-outline bg-transparent text-outline transition-colors outline-none hover:border-primary hover:text-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus aria-hidden="true" className="size-8" />
                  </button>
                  <input ref={fileInputRef} type="file" multiple accept="application/pdf,image/png,image/jpeg,image/jpg,image/gif,image/webp,text/plain" className="hidden" onChange={handleFileSelect} />
                </div>
                {failedFiles.length > 0 && (
                  <ul className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
                    {failedFiles.map((file, idx) => (
                      <li key={file._id || idx} className="text-body-sm break-words text-destructive">
                        {file.fileName}: {file.errorReason}
                      </li>
                    ))}
                  </ul>
                )}
                {uploadStatus && (
                  <div role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-body-md text-foreground">
                    <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin text-primary" />
                    {uploadStatus}
                  </div>
                )}
                {selectedFiles.length > 0 && (
                  <div className="mt-4">
                    <ul className="m-0 mb-2 flex list-none flex-col divide-y divide-border p-0">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-2 px-2 py-1">
                          <span className="min-w-0 text-body-sm break-all">
                            {file.name} <span className="font-mono text-mono-sm text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                          </span>
                          <IconButton label={`Remove ${file.name}`} size="icon-xs" onClick={() => removeSelectedFile(idx)} disabled={isUploading}>
                            <X />
                          </IconButton>
                        </li>
                      ))}
                    </ul>
                    <Button size="sm" onClick={handleUpload} disabled={isUploading || !!uploadStatus}>
                      {isUploading ? (
                        <>
                          <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        `Upload ${selectedFiles.length} file(s)`
                      )}
                    </Button>
                    {uploadError && (
                      <div role="alert" className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1 text-body-sm text-destructive">
                        {uploadError.response?.data?.error?.message || uploadError.message}
                      </div>
                    )}
                  </div>
                )}

                <Separator className="my-4" />
                <h4 className="m-0 mb-2 text-headline-sm text-foreground">URLs</h4>
                {urls.map((url, idx) => {
                  const isLast = idx === urls.length - 1;
                  const saved = savedUrls.get(url.trim());
                  return (
                    <div className="mb-2" key={idx}>
                      <div className="flex items-center gap-2">
                        <Input type="text" className="h-9 min-w-0 flex-1" placeholder="https://..." aria-label="URL" value={url} onChange={(e) => handleUrlChange(idx, e.target.value)} />
                        {saved && <AttachmentStatus status={saved.processingStatus} />}
                        {url.trim() && (
                          <IconButton type="button" label="Open in new tab" variant="outline" className="size-9" onClick={() => window.open(url, "_blank")}>
                            <ExternalLink />
                          </IconButton>
                        )}
                        {!isLast ? (
                          <IconButton type="button" label="Remove URL" variant="outline" className="size-9" onClick={() => removeUrl(idx)}>
                            <X />
                          </IconButton>
                        ) : (
                          <IconButton type="button" label="Add URL" variant="outline" className="size-9" onClick={addUrl}>
                            <Plus />
                          </IconButton>
                        )}
                      </div>
                      {saved?.processingStatus === "failed" && saved.errorReason && <div className="mt-1 text-body-sm break-words text-destructive">{saved.errorReason}</div>}
                    </div>
                  );
                })}
                <Button size="sm" onClick={saveUrls} disabled={isUpdating || (!urls.some((u) => u.trim()) && !topic.urls?.length)}>
                  {isUpdating ? "Saving..." : "Save URLs"}
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="mindmap">
              <AccordionTrigger className={TRIGGER_CLASS}>MindMap</AccordionTrigger>
              <AccordionContent className={SECTION_CLASS}>
                <MindMapView topic={topic} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="forgetting-curve">
              <AccordionTrigger className={TRIGGER_CLASS}>Forgetting Curve</AccordionTrigger>
              <AccordionContent className={SECTION_CLASS}>
                {forgettingCurveData ? (
                  <ForgettingCurve data={forgettingCurveData} />
                ) : (
                  <p className="m-0 text-body-md text-muted-foreground">Loading retention curve...</p>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="history">
              <AccordionTrigger className={TRIGGER_CLASS}>Revision History</AccordionTrigger>
              <AccordionContent className={SECTION_CLASS}>
                {history?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className={TH_CLASS}>Date</th>
                          <th className={TH_CLASS}>Quality</th>
                          <th className={TH_CLASS}>E-Factor</th>
                          <th className={TH_CLASS}>Interval</th>
                          <th className={TH_CLASS}>Next Revision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((entry, idx) => (
                          <tr key={idx} className="border-b border-border">
                            <td className={TD_CLASS}>{DateTime.fromISO(entry.revisionDate).toLocaleString(DateTime.DATETIME_SHORT)}</td>
                            <td className={TD_CLASS}>{entry.finalQuality?.toFixed(1)}</td>
                            <td className={TD_CLASS}>{entry.newEFactor?.toFixed(2)}</td>
                            <td className={TD_CLASS}>{entry.newInterval} days</td>
                            <td className={TD_CLASS}>{DateTime.fromISO(entry.nextRevisionDate).toLocaleString(DateTime.DATE_MED)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="m-0 text-body-md text-muted-foreground">Revise to view history</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="m-0">Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription className="m-0">Are you sure you want to delete "{topic.topicName}"? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetModal} onOpenChange={setShowResetModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="m-0">Confirm Reset</AlertDialogTitle>
            <AlertDialogDescription className="m-0">Are you sure you want to reset progress for "{topic.topicName}"? This will clear all revision history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* A plain Button, not AlertDialogAction: the action's Slot joins classes without merging, so the warning colors would not replace the variant's. */}
            <Button
              className="bg-warning text-warning-foreground hover:bg-warning/80"
              onClick={() => {
                resetTopicProgress({ id });
                setShowResetModal(false);
              }}
            >
              Reset
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showChat && <RevisionChat topicId={id} onClose={handleChatClose} />}

      {pdfToProcess && <PdfPageSelector file={pdfToProcess} onConfirm={handlePdfConfirm} onCancel={handlePdfCancel} />}
    </div>
  );
}

/** A mind-elixir theme from the app's color tokens. mind-elixir does not follow the page theme on its own. */
function toMindMapTheme(colors) {
  return {
    name: `Reviser ${colors.mode}`,
    type: colors.mode,
    palette: colors.chart,
    cssVar: {
      "--main-color": colors.foreground,
      "--main-bgcolor": colors.surfaceContainerHigh,
      "--main-bgcolor-transparent": `color-mix(in srgb, ${colors.surfaceContainerHigh} 80%, transparent)`,
      "--main-border": `1px solid ${colors.border}`,
      "--color": colors.mutedForeground,
      "--bgcolor": colors.surfaceContainerLow,
      "--selected": colors.primary,
      "--accent-color": colors.primary,
      "--root-color": colors.primaryForeground,
      "--root-bgcolor": colors.primary,
      "--root-border-color": "transparent",
      "--panel-color": colors.foreground,
      "--panel-bgcolor": colors.surfaceContainer,
      "--panel-border-color": colors.border,
    },
  };
}

export function MindMapView({ topic }) {
  const containerRef = useRef(null);
  const mindRef = useRef(null);
  const colors = useThemeColors();
  const mindTheme = useMemo(() => toMindMapTheme(colors), [colors]);
  const themeRef = useRef(mindTheme);
  const { isPending, mutate: generateMindMap, error } = useTopicMindMapGenerate();
  const hasContent = topic?.files?.length > 0 || topic?.urls?.some((u) => /^https?:\/\//.test(u.url || u));

  // Declared before the init effect, so on mount there is no map yet and init alone applies the theme.
  useEffect(() => {
    themeRef.current = mindTheme;
    mindRef.current?.changeTheme(mindTheme);
  }, [mindTheme]);

  useEffect(() => {
    if (!containerRef.current || !topic.mindMap) return;
    const mind = new MindElixir({
      el: containerRef.current,
      direction: MindElixir.SIDE,
      editable: false,
      contextMenu: true,
      toolBar: true,
      nodeMenu: false,
      theme: themeRef.current,
    });
    mind.init(JSON.parse(topic.mindMap));
    mindRef.current = mind;
    return () => {
      mind.destroy();
      mindRef.current = null;
    };
  }, [topic.topicName, topic.mindMap]);

  if (!topic.mindMap) {
    if (!hasContent) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-body-md text-foreground">
          <Info aria-hidden="true" className="size-5 shrink-0 text-primary" />
          <span>
            Upload a file or add a URL to generate a <strong className="font-semibold">MindMap</strong>!
          </span>
        </div>
      );
    }
    return (
      <div className="py-6 text-center">
        <Button onClick={() => generateMindMap({ id: topic._id })} disabled={isPending}>
          {isPending ? (
            <>
              <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" />
              Generating...
            </>
          ) : (
            "Generate MindMap"
          )}
        </Button>
        {error && (
          <div role="alert" className={`mt-4 ${ERROR_BOX_CLASS}`}>
            {getApiErrorMessage(error)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button size="sm" variant="outline" onClick={() => generateMindMap({ id: topic._id })} disabled={isPending}>
          {isPending ? <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" /> : <RefreshCw data-icon="inline-start" aria-hidden="true" />}
          Regenerate
        </Button>
      </div>
      <div ref={containerRef} className="h-[500px] w-full" />
    </div>
  );
}

const IMAGE_TYPES = ["jpg", "jpeg", "png", "gif", "svg", "webp"];

function FileTypeIcon({ fileType }) {
  const ext = (fileType ?? "").toLowerCase();
  const iconProps = { "aria-hidden": true, className: "size-11 text-muted-foreground", strokeWidth: 1.5 };
  if (IMAGE_TYPES.includes(ext)) return <FileImage {...iconProps} />;
  if (ext === "pdf") return <FileText {...iconProps} />;
  if (["doc", "docx"].includes(ext)) return <FileType {...iconProps} />;
  if (ext === "md") return <FileCode {...iconProps} />;
  return <FileIcon {...iconProps} />;
}

function FileCard({ file, topicId }) {
  const { fileName, fileType, fileUrl, processingStatus } = file;
  const [showActions, setShowActions] = useState(false);
  const { isPending: isFileDeleting, mutate: deleteFile } = useTopicFileDelete();

  const handleDeleteFile = (e) => {
    e.stopPropagation();
    deleteFile({ topicId, fileId: file._id });
  };

  return (
    <div
      className="relative flex size-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border border-border bg-surface-container-lowest p-2.5 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      role="group"
      aria-label={fileName}
      tabIndex={0}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      // Keyboard users reach Open and Delete by focusing the card.
      onFocus={() => setShowActions(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setShowActions(false);
      }}
    >
      {showActions && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-background/80">
          <IconButton label="Open in new tab" variant="secondary" size="icon-sm" onClick={() => window.open(fileUrl, "_blank")}>
            <ExternalLink />
          </IconButton>
          <IconButton label="Delete file" variant="destructive" size="icon-sm" onClick={handleDeleteFile} disabled={isFileDeleting}>
            <Trash2 />
          </IconButton>
        </div>
      )}
      <div className="flex min-w-0 flex-col items-center gap-1 text-center">
        <FileTypeIcon fileType={fileType} />
        <span className="block max-w-[100px] truncate text-body-sm text-foreground">{fileName}</span>
        <AttachmentStatus status={processingStatus} />
      </div>
    </div>
  );
}
