import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Details from "./Details";
import { addTopic, getAllList, getTodaysList, getTopic, reviseTopic, deleteTopic } from "../service/topic_service.mjs";
import { DateTime } from "luxon";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "react-bootstrap";
import { AppContext } from "../store/AppProvider";
import { ADD_ITEM_IN_LIST, SET_COMPLETE_LIST, UPDATE_ITEM_IN_LIST } from "../store/reducers/listReducer.mjs";
import editAnimation from "../lotties/edit.json";
import deleteAnimation from "../lotties/trashV2.json";
import LottieAnimation from "./LottiesAnimation";

export default function TodaysList({ id, today }) {
  const navigate = useNavigate();
  const { todaysList, setTodaysList, fullList, setFullList } = useContext(AppContext);
  const [modelData, setModelData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingTopic, setAddingTopic] = useState(false);
  const [inputActive, setInputActive] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (today) {
          const res = await getTodaysList();
          setTodaysList({ payload: res.topics, type: SET_COMPLETE_LIST });
        } else {
          const res = await getAllList();

          setFullList({ payload: res.topics, type: SET_COMPLETE_LIST });
        }
      } catch (error) {
        console.log("Something Went wrong with fetch");
      }
    }
    fetchData();
  }, [setTodaysList, setFullList, today]);
  useEffect(() => {
    setListData(today ? todaysList : fullList);
    setLoading(false);
  }, [todaysList, fullList, today]);

  const handleQuickAdd = async (event) => {
    event.preventDefault();
    setAddingTopic(true);
    addTopic({ topicName: event.target[0].value }).then((data) => {
      setTodaysList({ payload: data, type: ADD_ITEM_IN_LIST });
    });
    event.target[0].value = "";
    setAddingTopic(false);
  };

  const handelModel = (event, id) => {
    navigate(`/topic/${id}`);
  };
  // console.count("TopicList");
  return (
    <>
      {showModal && <Details modelData={modelData} setShowModal={setShowModal} />}
      {loading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px", height: "100%" }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="list-group ">
          {listData &&
            listData?.map((item, index) => {
              return <TopicItem key={item._id} item={item} handelModel={handelModel} />;
            })}
          <div className="list-group-item list-group-item-action">
            <form
              autoComplete="off"
              onSubmit={handleQuickAdd}
              onFocus={() => {
                setInputActive(true);
              }}
              onBlur={() => {
                setInputActive(false);
              }}
            >
              <div className="input-group">
                {addingTopic && (
                  <span className="input-group-text" id="basic-addon2" style={{ width: "45px" }}>
                    <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                    <span className="visually-hidden" role="status">
                      Loading...
                    </span>
                  </span>
                )}
                <input id="newTopicName" className="form-control" type="text" placeholder="Quickly Add New Topic" aria-label="quickly add new topic" disabled={addingTopic} />
                {inputActive && (
                  <span className="input-group-text" id="basic-addon2">
                    <svg width="20" height="20" viewBox="0 0 20 20">
                      <g stroke="currentColor" fill="none" fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 3v4c0 2-2 4-4 4H2"></path>
                        <path d="M8 17l-6-6 6-6"></path>
                      </g>
                    </svg>
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function TopicItem({ item, handelModel }) {
  const navigate = useNavigate();
  const { setTodaysList, setFullList } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [playAnimation, setPlayAnimation] = useState({ edit: false, delete: false });
  const last_revised = DateTime.fromISO(item.lastRevised) || null;
  const next_revision = DateTime.fromISO(item.revisionDate);
  const revised = last_revised.hasSame(DateTime.now(), "day");
  const today = revised || next_revision <= DateTime.now();

  const handleRevised = (event, id) => {
    setLoading(true);
    reviseTopic(id, { userQuality: 3 })
      .then((res) => {
        setLoading(false);
        setTodaysList({ payload: res, type: UPDATE_ITEM_IN_LIST });
        setFullList({ payload: res, type: UPDATE_ITEM_IN_LIST });
      })
      .catch((err) => {
        console.log("Can't Fetch topic details");
        setLoading(false);
      });
  };

  const handleDelete = async () => {
    try {
      await deleteTopic(item._id);
      setShowDeleteModal(false);
      window.location.reload();
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
            onClick={(e) => {
              handelModel(e, item._id);
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
          <div className="d-flex gap-2">
            <Button
              title="Delete"
              style={{ padding: "4px", paddingBottom: "5px" }}
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              onMouseEnter={() => setPlayAnimation({ ...playAnimation, delete: true })}
              onMouseLeave={() => setPlayAnimation({ ...playAnimation, delete: false })}
            >
              <LottieAnimation id="deleteButtonIcon" icon={deleteAnimation} play={playAnimation.delete} />
            </Button>
            <Button
              title="Edit"
              className="p-1"
              variant="info"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/topic/${item._id}`);
              }}
              onMouseEnter={() => setPlayAnimation({ ...playAnimation, edit: true })}
              onMouseLeave={() => setPlayAnimation({ ...playAnimation, edit: false })}
            >
              <LottieAnimation id="editButtonIcon" icon={editAnimation} play={playAnimation.edit} />
            </Button>
            {today && (
              <Button
                variant={revised ? "success" : "outline-success"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRevised(e, item._id);
                }}
                title={revised ? "Revised" : "Mark as Revised"}
                disabled={loading}
              >
                {!loading ? (
                  revised ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-check" viewBox="0 0 16 16">
                      <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z" />
                    </svg>
                  ) : (
                    "Revise"
                  )
                ) : (
                  <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                )}
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
}
