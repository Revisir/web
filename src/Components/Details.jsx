import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import editAnimation from "../lotties/edit.json";
import deleteAnimation from "../lotties/trashV2.json";
import resetAnimation from "../lotties/refresh.json";
import LottieAnimation from "./LottiesAnimation";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle, Spinner } from "react-bootstrap";
import { reviseTopic } from "../service/topic_service.mjs";
function Details({ modelData, setShowModal }) {
  const [loading, setloading] = useState(true);
  const [editForm, setEditForm] = useState(false);
  const [formValue, setFormValue] = useState({});
  const [playAnimation, setPlayAnimation] = useState({ edit: false, delete: false, reset: false });
  const [revisedButton, setRevisedButton] = useState(true);

  useEffect(() => {
    setFormValue(modelData);
    //TODO if no value was found
    if (!modelData) {
      setloading(true);
    } else {
      setloading(false);
    }
  }, [modelData]);

  const handleClose = () => setShowModal(false);
  const handleRevised = () => {
    setRevisedButton(false);
    reviseTopic(modelData._id)
      .then((res) => {
        setRevisedButton(true);
      })
      //TODO SMTH WENT WRONG
      .catch((err) => {
        console.log("Smth went wrong");
        setRevisedButton(true);
      });
  };

  return (
    <Modal show onHide={handleClose} centered>
      <ModalHeader closeButton>
        <ModalTitle>Topic Details</ModalTitle>
      </ModalHeader>
      {loading ? (
        <ModalBody style={{ minHeight: "200px" }}>
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px", height: "100%" }}>
            <Spinner animation="border" />
          </div>
        </ModalBody>
      ) : (
        <>
          <ModalBody>
            <form>
              <div className="row mb-3 align-items-center">
                <div className="col-sm-4">
                  <label className="col-form-label">Name</label>
                </div>
                <div className="col-auto">
                  <input type="text" className="form-control" value={formValue.topicName} readOnly={!editForm} onChange={(e) => setFormValue({ ...formValue, topic: e.target.value })} />
                </div>
              </div>
              <div className="row mb-3 align-items-center">
                <div className="col-sm-4">
                  <label className="col-form-label">Subject</label>
                </div>
                <div className="col-auto">
                  <input
                    type="text"
                    className="form-control"
                    value={formValue.subjectName}
                    readOnly={!editForm}
                    onChange={(e) => {
                      setFormValue({ ...formValue, subject: e.target.value });
                    }}
                  />
                </div>
              </div>
              <div className="row mb-3 align-items-center">
                <div className="col-sm-4">
                  <label className="col-form-label">Created On</label>
                </div>
                <div className="col-auto">
                  <input type="text" className="form-control" value={DateTime.fromISO(modelData.dateStudied).toLocaleString(DateTime.DATE_HUGE)} readOnly disabled={editForm} />
                </div>
              </div>
              <div>
                <label className="fs-5">Revision Pattern</label>
                <div className="m-3" style={{ minHeight: "200px" }}>
                  dfjkbdf
                </div>
              </div>
            </form>
          </ModalBody>
          <ModalFooter>
            <Button
              title={"Reset Progress"}
              variant="warning"
              className="p-1"
              onMouseEnter={() => {
                setPlayAnimation({ ...playAnimation, reset: true });
              }}
              onMouseLeave={() => {
                setPlayAnimation({ ...playAnimation, reset: false });
              }}
            >
              <LottieAnimation id={"deleteButtonIcon"} icon={resetAnimation} play={playAnimation.reset} />
            </Button>
            <Button
              title={"Delete"}
              style={{ padding: "4px", paddingBottom: "5px" }}
              variant="danger"
              onMouseEnter={() => {
                setPlayAnimation({ ...playAnimation, delete: true });
              }}
              onMouseLeave={() => {
                setPlayAnimation({ ...playAnimation, delete: false });
              }}
            >
              <LottieAnimation id={"deleteButtonIcon"} icon={deleteAnimation} play={playAnimation.delete} />
            </Button>
            <Button
              title={"Edit"}
              className="p-1"
              variant="info"
              onClick={() => {
                setEditForm(true);
              }}
              onMouseEnter={() => {
                setPlayAnimation({ ...playAnimation, edit: true });
              }}
              onMouseLeave={() => {
                setPlayAnimation({ ...playAnimation, edit: false });
              }}
            >
              <LottieAnimation id={"editButtonIcon"} icon={editAnimation} play={playAnimation.edit} />
            </Button>
            <Button title={"Revised Topic Today"} variant="success" onClick={handleRevised} disabled={!revisedButton}>
              {revisedButton ? (
                "Revise"
              ) : (
                <>
                  <span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                  <span role="status">Revise</span>
                </>
              )}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

export default Details;
