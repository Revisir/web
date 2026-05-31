import editAnimation from "../../lotties/edit.json";
import deleteAnimation from "../../lotties/trashV2.json";
import { DateTime } from "luxon";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "react-bootstrap";
import { extractRevisionBooleans, reviseBtnText } from "../../utils/topics.utils";
import { useNavigate } from "react-router-dom";
import { useState, memo } from "react";

import { useMinTopicDetails, useTopicDelete, useTopicRevise } from "../../hooks/useTopicQuery";
import useHover from "../../hooks/useHover";
import BsButtonWithLotties from "../lotties/BsButtonWithLotties";

const TopicListItem = memo(({ id }) => {
  const navigate = useNavigate();
  const { data: item, isFetching } = useMinTopicDetails(id);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { isPending: isDeleting, mutate: deleteTopic } = useTopicDelete();
  const { isPending: isRevising, mutate: reviseTopic } = useTopicRevise();

  const [reviseBtnRef, reviseBtnHovering] = useHover();
  if (!item) {
    return null;
  }
  const { revised, today, next_revision } = extractRevisionBooleans({ lastRevised: item.lastRevised, revisionDate: item.revisionDate });
  const btnString = reviseBtnText(revised, reviseBtnHovering);

  const handleRevised = (event, id) => {
    reviseTopic({ id, quality: { userQuality: 3 } });
  };

  const handleDelete = async () => {
    try {
      deleteTopic({ id: item._id });
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Failed to delete topic");
    }
  };
  return (
    <>
      <div className="list-group-item list-group-item-action" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        <div className="d-flex justify-content-between align-items-center">
          <div
            className="flex-grow-1"
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              navigate(`/topic/${item._id}`);
            }}
          >
            <span className="pt-1">
              <strong>{item.topicName || item.topic_name}</strong>
              <small className="d-block text-body-secondary">
                {item.subjectName && <span className="me-2 badge bg-secondary">{item.subjectName}</span>}
                <svg className="bi me-1" width="1em" height="1em">
                  <use xlinkHref="#calendar-event"></use>
                </svg>
                {next_revision.toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY)}
              </small>
            </span>
          </div>
          <div className=" d-flex gap-2 ">
            <BsButtonWithLotties
              id="deleteButtonIcon"
              icon={deleteAnimation}
              title="Delete"
              style={{ padding: "4px", paddingBottom: "5px" }}
              variant="danger"
              size="sm"
              className="d-none d-md-block"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              disabled={isDeleting}
            />

            <BsButtonWithLotties
              id="editButtonIcon"
              icon={editAnimation}
              title="Edit"
              className="p-1 d-none d-md-block"
              variant="info"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/topic/${item._id}`);
              }}
            />

            {today && (
              <Button
                variant={revised ? "success" : "outline-success"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRevised(e, item._id);
                }}
                title={revised ? "Revised" : "Mark as Revised"}
                disabled={isFetching || isRevising}
                ref={reviseBtnRef}
              >
                {isRevising ? <span className="spinner-border spinner-border-sm" aria-hidden="true"></span> : btnString}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <ModalHeader closeButton>
          <ModalTitle>Confirm Delete</ModalTitle>
        </ModalHeader>
        <ModalBody>Are you sure you want to delete "{item.topicName || item.topic_name}"?</ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
});

export default TopicListItem;
