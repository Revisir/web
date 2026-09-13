import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "react-bootstrap";
import Accordion from "react-bootstrap/Accordion";
import MindElixir from "mind-elixir";
import "mind-elixir/style.css";
import TopicModal from "./TopicModal";
import RevisionChat from "./RevisionChat";
import PdfPageSelector from "./PdfPageSelector";
import ForgettingCurve from "../charts/ForgettingCurve";
import editAnimation from "../../lotties/edit.json";
import deleteAnimation from "../../lotties/trashV2.json";
import resetAnimation from "../../lotties/refresh.json";
import LottieAnimation from "../lotties/LottiesAnimation";
import BsButtonWithLotties from "../lotties/BsButtonWithLotties";
import { useTopicDetails, useTopicHistory, useTopicForgettingCurve, useTopicRevise, useTopicDelete, useTopicFileUpload, useTopicFileDelete, useTopicReset, useTopicUpdate, useTopicMindMapGenerate, TOPIC_DETAILS_KEY } from "../../hooks/useTopicQuery";
import { extractRevisionBooleans, reviseBtnText } from "../../utils/topics.utils";
import useHover from "../../hooks/useHover";
import { useQueryClient } from "@tanstack/react-query";

export default function TopicDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [playAnimation, setPlayAnimation] = useState({ edit: false, delete: false, reset: false });

  const [showChat, setShowChat] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);

  let revised = false,
    today = false;
  const { isFetched, data: topic } = useTopicDetails(id);
  const { data: historyObj } = useTopicHistory(id);
  const history = historyObj?.history;
  const { data: forgettingCurveData } = useTopicForgettingCurve(id);

  const { isPending: isRevising, mutate: reviseTopic } = useTopicRevise();
  const { isPending: isDeleting, mutate: deleteTopic } = useTopicDelete();
  const { isPending: isUploading, mutate: uploadFiles, error: uploadError, reset: resetUpload } = useTopicFileUpload();
  const { isPending: isUpdating, mutate: updateTopic } = useTopicUpdate();
  const { mutate: resetTopicProgress } = useTopicReset();
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [pdfToProcess, setPdfToProcess] = useState(null); // PDF file awaiting page selection

  const [reviseBtnRef, reviseBtnHovering] = useHover();
  ({ revised, today } = useMemo(() => extractRevisionBooleans({ lastRevised: topic?.lastRevised, revisionDate: topic?.revisionDate }), [topic]));
  const btnString = reviseBtnText(revised, reviseBtnHovering);

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
  const urlsInitialized = useRef(false);
  if (topic && !urlsInitialized.current) {
    urlsInitialized.current = true;
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
    } catch (error) {
      console.error("Failed to delete topic");
    }
  };

  const hasContent = topic?.files?.length > 0 || topic?.urls?.some((u) => /^https?:\/\//.test(u.url || u));

  const handleReviseClick = () => {
    if (revised) {
      reviseTopic({ id, quality: { userQuality: 1 } });
    } else if (hasContent) {
      setShowChat(true);
    } else {
      setShowQualityModal(true);
    }
  };

  const handleChatClose = (quality) => {
    setShowChat(false);
    if (quality) reviseTopic({ id, quality: { userQuality: quality } });
  };

  if (!isFetched) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!topic) {
    return <div className="alert alert-danger">Topic not found</div>;
  }

  return (
    <div className="container px-0 px-lg-3 mt-4">
      <Button variant="link" onClick={() => navigate(-1)} className="mb-3 p-0 text-decoration-none text-decoration-underline-hover">
        ← Back to List
      </Button>

      {showEditModal && <TopicModal setShowModal={setShowEditModal} topic={topic} />}
      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h2>{topic.topicName}</h2>
              {topic.subjectName && <span className="badge bg-secondary">{topic.subjectName}</span>}
            </div>
            <div className="d-flex gap-2">
              <BsButtonWithLotties id="resetButtonIcon" icon={resetAnimation} title="Reset Progress" variant="warning" className="p-1" onClick={() => setShowResetModal(true)} />
              <BsButtonWithLotties id="deleteButtonIcon" icon={deleteAnimation} title="Delete" style={{ padding: "4px", paddingBottom: "5px" }} variant="danger" onClick={() => setShowDeleteModal(true)} />
              <BsButtonWithLotties id="editButtonIcon" icon={editAnimation} title="Edit" className="p-1" variant="info" onClick={() => setShowEditModal(true)} />
            </div>
          </div>

          <div className="mb-3">
            <strong>Description:</strong>
            <p>{topic.description || "No description"}</p>
          </div>

          <div className="mb-3">
            <strong>Date Studied:</strong> {topic.dateStudied ? DateTime.fromISO(topic.dateStudied).toLocaleString(DateTime.DATE_MED) : "N/A"}
          </div>

          <div className="mb-3">
            <strong>Next Revision:</strong> {DateTime.fromISO(topic.revisionDate).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
          </div>

          <div className="mt-4 text-end">
            <Button ref={reviseBtnRef} title={revised ? "Mark as Not Revised" : "Revised Topic Today"} variant={!today ? "secondary" : "success"} onClick={handleReviseClick} disabled={isRevising || !today}>
              {!today ? "Can't Revise Today" : btnString}
            </Button>
          </div>

          <Accordion alwaysOpen className="mt-4 mx-sm-neg mb-sm-neg">
            <Accordion.Item eventKey="materials">
              <Accordion.Header>Materials</Accordion.Header>
              <Accordion.Body>
                <h6>Files</h6>
                <div className="d-flex flex-wrap gap-3">
                  {topic.files?.map((file, idx) => (
                    <FileCard key={file._id || idx} file={file} topicId={id} />
                  ))}
                  <div
                    className="file-card file-card-add"
                    style={{
                      width: "120px",
                      height: "120px",
                      border: "2px dashed #6c757d",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#6c757d" viewBox="0 0 16 16">
                      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                    </svg>
                  </div>
                  <input ref={fileInputRef} type="file" multiple accept="application/pdf,image/png,image/jpeg,image/jpg,image/gif,image/webp,text/plain" style={{ display: "none" }} onChange={handleFileSelect} />
                </div>
                {uploadStatus && (
                  <div className="alert alert-info d-flex align-items-center py-2 mt-3 mb-0">
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                    {uploadStatus}
                  </div>
                )}
                {selectedFiles.length > 0 && (
                  <div className="mt-3">
                    <ul className="list-group list-group-flush mb-2">
                      {selectedFiles.map((file, idx) => (
                        <li key={idx} className="list-group-item d-flex justify-content-between align-items-center py-1 px-2">
                          <small>
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </small>
                          <button type="button" className="btn-close btn-close-sm" onClick={() => removeSelectedFile(idx)} disabled={isUploading}></button>
                        </li>
                      ))}
                    </ul>
                    <Button size="sm" variant="primary" onClick={handleUpload} disabled={isUploading || !!uploadStatus}>
                      {isUploading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Uploading...
                        </>
                      ) : (
                        `Upload ${selectedFiles.length} file(s)`
                      )}
                    </Button>
                    {uploadError && <div className="alert alert-danger py-1 px-2 mt-2 mb-0 small">{uploadError.response?.data?.error?.message || uploadError.message}</div>}
                  </div>
                )}

                <hr />
                <h6>URLs</h6>
                {urls.map((url, idx) => {
                  const isLast = idx === urls.length - 1;
                  return (
                    <div className="input-group mb-2" key={idx}>
                      <input type="text" className="form-control" placeholder="https://..." value={url} onChange={(e) => handleUrlChange(idx, e.target.value)} />
                      {url.trim() && (
                        <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center" type="button" onClick={() => window.open(url, "_blank")} title="Open in new tab">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path
                              fillRule="evenodd"
                              d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"
                            />
                            <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
                          </svg>
                        </button>
                      )}
                      {!isLast ? (
                        <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center" type="button" onClick={() => removeUrl(idx)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
                          </svg>
                        </button>
                      ) : (
                        <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center" type="button" onClick={addUrl}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
                <Button size="sm" variant="primary" onClick={saveUrls} disabled={isUpdating || (!urls.some((u) => u.trim()) && !topic.urls?.length)}>
                  {isUpdating ? "Saving..." : "Save URLs"}
                </Button>
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="mindmap">
              <Accordion.Header>MindMap</Accordion.Header>
              <Accordion.Body>
                <MindMapView topic={topic} />
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="forgetting-curve">
              <Accordion.Header>Forgetting Curve</Accordion.Header>
              <Accordion.Body>
                {forgettingCurveData ? (
                  <ForgettingCurve data={forgettingCurveData} />
                ) : (
                  <p className="text-muted mb-0">Loading retention curve...</p>
                )}
              </Accordion.Body>
            </Accordion.Item>

            <Accordion.Item eventKey="history">
              <Accordion.Header>Revision History</Accordion.Header>
              <Accordion.Body>
                {history?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Quality</th>
                          <th>E-Factor</th>
                          <th>Interval</th>
                          <th>Next Revision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((entry, idx) => (
                          <tr key={idx}>
                            <td>{DateTime.fromISO(entry.revisionDate).toLocaleString(DateTime.DATETIME_SHORT)}</td>
                            <td>{entry.finalQuality?.toFixed(1)}</td>
                            <td>{entry.newEFactor?.toFixed(2)}</td>
                            <td>{entry.newInterval} days</td>
                            <td>{DateTime.fromISO(entry.nextRevisionDate).toLocaleString(DateTime.DATE_MED)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted mb-0">Revise to view history</p>
                )}
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        </div>
      </div>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <ModalHeader closeButton>
          <ModalTitle>Confirm Delete</ModalTitle>
        </ModalHeader>
        <ModalBody>Are you sure you want to delete "{topic.topicName}"? This action cannot be undone.</ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      <Modal show={showResetModal} onHide={() => setShowResetModal(false)} centered>
        <ModalHeader closeButton>
          <ModalTitle>Confirm Reset</ModalTitle>
        </ModalHeader>
        <ModalBody>Are you sure you want to reset progress for "{topic.topicName}"? This will clear all revision history.</ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={() => {
              resetTopicProgress({ id });
              setShowResetModal(false);
            }}
          >
            Reset
          </Button>
        </ModalFooter>
      </Modal>

      {showChat && <RevisionChat topicId={id} onClose={handleChatClose} />}

      {pdfToProcess && <PdfPageSelector file={pdfToProcess} onConfirm={handlePdfConfirm} onCancel={handlePdfCancel} />}

      <Modal show={showQualityModal} onHide={() => setShowQualityModal(false)} centered>
        <ModalHeader closeButton>
          <ModalTitle>Select Quality</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p>How well did you recall this topic?</p>
          <div className="d-grid gap-2">
            {[5, 4, 3, 2, 1].map((q) => (
              <Button
                key={q}
                variant="outline-success"
                onClick={() => {
                  setShowQualityModal(false);
                  reviseTopic({ id, quality: { userQuality: q } });
                }}
              >
                {q} - {q === 5 ? "Perfect" : q === 4 ? "Good" : q === 3 ? "Fair" : q === 2 ? "Poor" : "Very Poor"}
              </Button>
            ))}
          </div>
          <div className="alert alert-info d-flex align-items-center mt-3 mb-0 py-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="me-2 flex-shrink-0" viewBox="0 0 16 16">
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
            <span>
              Upload a file or add a URL to revise with <strong>Reviser</strong> tutor!
            </span>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}

function MindMapView({ topic }) {
  const containerRef = useRef(null);
  const { isPending, mutate: generateMindMap, error } = useTopicMindMapGenerate();
  const hasContent = topic?.files?.length > 0 || topic?.urls?.some((u) => /^https?:\/\//.test(u.url || u));

  useEffect(() => {
    if (!containerRef.current || !topic.mindMap) return;
    const mind = new MindElixir({
      el: containerRef.current,
      direction: MindElixir.SIDE,
      editable: false,
      contextMenu: true,
      toolBar: true,
      nodeMenu: false,
    });
    mind.init(JSON.parse(topic.mindMap));
  }, [topic.topicName, topic.mindMap]);

  if (!topic.mindMap) {
    if (!hasContent) {
      return (
        <div className="alert alert-info d-flex align-items-center mb-0 py-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="me-2 flex-shrink-0" viewBox="0 0 16 16">
            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
          <span>
            Upload a file or add a URL to generate a <strong>MindMap</strong>!
          </span>
        </div>
      );
    }
    return (
      <div className="text-center py-4">
        <Button variant="primary" onClick={() => generateMindMap({ id: topic._id })} disabled={isPending}>
          {isPending ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Generating...
            </>
          ) : (
            "Generate MindMap"
          )}
        </Button>
        {error && (
          <div className="alert alert-danger mt-3 mb-0">
            {error.response?.data?.error?.code === "AI_NOT_CONFIGURED"
              ? "AI is not set up. Please contact the administrator to configure AI services."
              : error.response?.data?.error?.message || error.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-end mb-2">
        <Button size="sm" variant="outline-secondary" onClick={() => generateMindMap({ id: topic._id })} disabled={isPending}>
          {isPending ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span> : "↻ Regenerate"}
        </Button>
      </div>
      <div ref={containerRef} style={{ height: "500px", width: "100%" }} />
    </div>
  );
}

function FileCard({ file, topicId }) {
  const { fileName, fileType, fileUrl } = file;
  const [showActions, setShowActions] = useState(false);
  const { isPending: isFileDeleting, mutate: deleteFile } = useTopicFileDelete();

  const handleDeleteFile = (e) => {
    e.stopPropagation();
    deleteFile({ topicId, fileId: file._id });
  };

  const getFileIcon = () => {
    const ext = fileType.toLowerCase();
    const iconProps = { width: "48", height: "48", fill: "currentColor", viewBox: "0 0 16 16" };

    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
          <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
          <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z" />
        </svg>
      );
    } else if (ext === "pdf") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
          <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z" />
          <path d="M4.603 14.087a.81.81 0 0 1-.438-.42c-.195-.388-.13-.776.08-1.102.198-.307.526-.568.897-.787a7.68 7.68 0 0 1 1.482-.645 19.697 19.697 0 0 0 1.062-2.227 7.269 7.269 0 0 1-.43-1.295c-.086-.4-.119-.796-.046-1.136.075-.354.274-.672.65-.823.192-.077.4-.12.602-.077a.7.7 0 0 1 .477.365c.088.164.12.356.127.538.007.188-.012.396-.047.614-.084.51-.27 1.134-.52 1.794a10.954 10.954 0 0 0 .98 1.686 5.753 5.753 0 0 1 1.334.05c.364.066.734.195.96.465.12.144.193.32.2.518.007.192-.047.382-.138.563a1.04 1.04 0 0 1-.354.416.856.856 0 0 1-.51.138c-.331-.014-.654-.196-.933-.417a5.712 5.712 0 0 1-.911-.95 11.651 11.651 0 0 0-1.997.406 11.307 11.307 0 0 1-1.02 1.51c-.292.35-.609.656-.927.787a.793.793 0 0 1-.58.029zm1.379-1.901c-.166.076-.32.156-.459.238-.328.194-.541.383-.647.547-.094.145-.096.25-.04.361.01.022.02.036.026.044a.266.266 0 0 0 .035-.012c.137-.056.355-.235.635-.572a8.18 8.18 0 0 0 .45-.606zm1.64-1.33a12.71 12.71 0 0 1 1.01-.193 11.744 11.744 0 0 1-.51-.858 20.801 20.801 0 0 1-.5 1.05zm2.446.45c.15.163.296.3.435.41.24.19.407.253.498.256a.107.107 0 0 0 .07-.015.307.307 0 0 0 .094-.125.436.436 0 0 0 .059-.2.095.095 0 0 0-.026-.063c-.052-.062-.2-.152-.518-.209a3.876 3.876 0 0 0-.612-.053zM8.078 7.8a6.7 6.7 0 0 0 .2-.828c.031-.188.043-.343.038-.465a.613.613 0 0 0-.032-.198.517.517 0 0 0-.145.04c-.087.035-.158.106-.196.283-.04.192-.03.469.046.822.024.111.054.227.09.346z" />
        </svg>
      );
    } else if (["doc", "docx"].includes(ext)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
          <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z" />
          <path d="M4.5 11h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1zm0-2h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1zm0-2h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1zm0-2h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1z" />
        </svg>
      );
    } else if (ext === "md") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
          <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z" />
          <path d="M4.5 8.5v3h1v-2l1 1.5 1-1.5v2h1v-3h-1l-1 1.5-1-1.5h-1zm7 0v3h1v-2.5l.5.5.5-.5V11.5h1v-3h-1l-1 1-1-1h-1z" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" {...iconProps}>
          <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
        </svg>
      );
    }
  };

  return (
    <div
      className="file-card position-relative"
      style={{
        width: "120px",
        height: "120px",
        border: "1px solid #dee2e6",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: "10px",
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showActions && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center gap-2" style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: "8px" }}>
          <Button variant="light" size="sm" onClick={() => window.open(fileUrl, "_blank")} title="Open in new tab">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path
                fillRule="evenodd"
                d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"
              />
              <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
            </svg>
          </Button>
          <BsButtonWithLotties id={`deleteFileBtn-${file._id}`} icon={deleteAnimation} title="Delete" variant="danger" size="sm" onClick={handleDeleteFile} disabled={isFileDeleting} style={{ padding: "4px", paddingBottom: "5px" }} />
        </div>
      )}
      <div className="text-center">
        {getFileIcon(fileName)}
        <small className="d-block mt-2 text-truncate" style={{ maxWidth: "100px" }}>
          {fileName}
        </small>
      </div>
    </div>
  );
}
