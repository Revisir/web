import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTopic, updateTopic, deleteTopic, getTopicHistory, reviseTopic } from "../service/topic_service.mjs";
import { DateTime } from "luxon";
import { Button, Form, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "react-bootstrap";
import editAnimation from "../lotties/edit.json";
import deleteAnimation from "../lotties/trashV2.json";
import resetAnimation from "../lotties/refresh.json";
import LottieAnimation from "./LottiesAnimation";

export default function TopicDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [playAnimation, setPlayAnimation] = useState({ edit: false, delete: false, reset: false });
  const [revisedButton, setRevisedButton] = useState(true);
  const [canReviseToday, setCanReviseToday] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [isRevisedToday, setIsRevisedToday] = useState(false);

  useEffect(() => {
    fetchTopic();
    fetchHistory();
  }, [id]);

  const fetchTopic = async () => {
    try {
      const data = await getTopic(id);
      setTopic(data);
      setFormData({
        topicName: data.topicName,
        subjectName: data.subjectName,
        description: data.description,
        dateStudied: data.dateStudied ? DateTime.fromISO(data.dateStudied).toISODate() : "",
      });

      const lastRevised = DateTime.fromISO(data.lastRevised);
      const nextRevision = DateTime.fromISO(data.revisionDate);
      const revised = lastRevised.hasSame(DateTime.now(), "day");
      const today = revised || nextRevision <= DateTime.now();
      setCanReviseToday(today);
      setIsRevisedToday(revised);

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch topic");
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await getTopicHistory(id);
      setHistory(data.history || []);
    } catch (error) {
      console.error("Failed to fetch history");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const result = await updateTopic(id, formData);
      setTopic(result.topic);
      setEditing(false);
    } catch (error) {
      console.error("Failed to update topic");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTopic(id);
      navigate("/");
    } catch (error) {
      console.error("Failed to delete topic");
    }
  };

  const handleRevise = async (userQuality) => {
    setRevisedButton(false);
    setShowQualityModal(false);
    try {
      await reviseTopic(id, { userQuality });
      fetchTopic();
      fetchHistory();
      setRevisedButton(true);
    } catch (error) {
      console.error("Failed to mark as revised");
      setRevisedButton(true);
    }
  };

  const handleReviseClick = () => {
    if (isRevisedToday) {
      handleRevise(0);
    } else {
      setShowQualityModal(true);
    }
  };

  if (loading) {
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
    <div className="container mt-4">
      <Button variant="link" onClick={() => navigate(-1)} className="mb-3 p-0 text-decoration-none text-decoration-underline-hover">
        ← Back to List
      </Button>

      {!editing ? (
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h2>{topic.topicName}</h2>
                {topic.subjectName && <span className="badge bg-secondary">{topic.subjectName}</span>}
              </div>
              <div className="d-flex gap-2">
                <Button title="Reset Progress" variant="warning" className="p-1" onMouseEnter={() => setPlayAnimation({ ...playAnimation, reset: true })} onMouseLeave={() => setPlayAnimation({ ...playAnimation, reset: false })}>
                  <LottieAnimation id="resetButtonIcon" icon={resetAnimation} play={playAnimation.reset} />
                </Button>
                <Button
                  title="Delete"
                  style={{ padding: "4px", paddingBottom: "5px" }}
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                  onMouseEnter={() => setPlayAnimation({ ...playAnimation, delete: true })}
                  onMouseLeave={() => setPlayAnimation({ ...playAnimation, delete: false })}
                >
                  <LottieAnimation id="deleteButtonIcon" icon={deleteAnimation} play={playAnimation.delete} />
                </Button>
                <Button title="Edit" className="p-1" variant="info" onClick={() => setEditing(true)} onMouseEnter={() => setPlayAnimation({ ...playAnimation, edit: true })} onMouseLeave={() => setPlayAnimation({ ...playAnimation, edit: false })}>
                  <LottieAnimation id="editButtonIcon" icon={editAnimation} play={playAnimation.edit} />
                </Button>
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
              <Button title={isRevisedToday ? "Mark as Not Revised" : "Revised Topic Today"} variant={!canReviseToday ? "secondary" : "success"} onClick={handleReviseClick} disabled={!revisedButton || !canReviseToday}>
                {!revisedButton ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                    <span role="status">Revise</span>
                  </>
                ) : !canReviseToday ? (
                  "Can't Revise"
                ) : isRevisedToday ? (
                  "Revised"
                ) : (
                  "Revise"
                )}
              </Button>
            </div>

            <div className="mt-4">
              <h5>Revision History</h5>
              {history.length > 0 ? (
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
                <p className="text-muted">Revise to view history</p>
              )}
            </div>

            <div className="mt-4">
              <h5>Files</h5>
              <div className="d-flex flex-wrap gap-3">
                {topic.files?.map((file, idx) => (
                  <FileCard key={idx} file={file} />
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
                  onClick={() => document.getElementById("fileInput").click()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="#6c757d" viewBox="0 0 16 16">
                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
                  </svg>
                </div>
                <input id="fileInput" type="file" style={{ display: "none" }} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <h3>Edit Topic</h3>
            <Form onSubmit={handleUpdate}>
              <Form.Group className="mb-3">
                <Form.Label>Topic Name</Form.Label>
                <Form.Control type="text" value={formData.topicName} onChange={(e) => setFormData({ ...formData, topicName: e.target.value })} maxLength={200} required />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Subject Name</Form.Label>
                <Form.Control type="text" value={formData.subjectName} onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })} maxLength={100} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Date Studied</Form.Label>
                <Form.Control type="date" value={formData.dateStudied} onChange={(e) => setFormData({ ...formData, dateStudied: e.target.value })} />
              </Form.Group>

              <Button variant="primary" type="submit" className="me-2">
                Save
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </Form>
          </div>
        </div>
      )}

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

      <Modal show={showQualityModal} onHide={() => setShowQualityModal(false)} centered>
        <ModalHeader closeButton>
          <ModalTitle>Select Quality</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <p>How well did you recall this topic?</p>
          <div className="d-grid gap-2">
            {[5, 4, 3, 2, 1].map((quality) => (
              <Button key={quality} variant="outline-success" onClick={() => handleRevise(quality)}>
                {quality} - {quality === 5 ? "Perfect" : quality === 4 ? "Good" : quality === 3 ? "Fair" : quality === 2 ? "Poor" : "Very Poor"}
              </Button>
            ))}
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}


function FileCard({ file }) {
  const [showActions, setShowActions] = useState(false);

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
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
        <div
          className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center gap-2"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: "8px" }}
        >
          <Button
            variant="light"
            size="sm"
            onClick={() => window.open(file.url, "_blank")}
            title="Open in new tab"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z" />
              <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
            </svg>
          </Button>
          <Button variant="danger" size="sm" title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
            </svg>
          </Button>
        </div>
      )}
      <div className="text-center">
        {getFileIcon(file.name)}
        <small className="d-block mt-2 text-truncate" style={{ maxWidth: "100px" }}>
          {file.name}
        </small>
      </div>
    </div>
  );
}
