import { useEffect, useState } from "react";
import Details from "./Details";
import { getAllList, getTodaysList, getTopic, reviseTopic } from "../service/topic_service";
import { DateTime } from "luxon";
import { Button } from "react-bootstrap";

export default function TodaysList({ id, today }) {
  const [modelData, setModelData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputActive, setInputActive] = useState(false);
  async function fetchData() {
    setLoading(true);
    let res = {};
    try {
      if (today) res = await getTodaysList();
      else res = await getAllList();
      setListData(res);
      setLoading(false);
    } catch (error) {
      console.log("Something Went wrong with fetch");
    }
  }
  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    console.log(listData);
  }, [listData]);

  const handleQuickAdd = (event) => {
    event.preventDefault();
    console.log(event.target[0].value);
  };

  const handelModel = (event, id) => {
    getTopic(id)
      .then((res) => {
        setModelData(res);
        setShowModal(true);
      })
      .catch((err) => {
        //TODO ADD SMTH WENT WRONG
        console.log("Can't Fetch topic details");
      });
  };
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
            listData.map((item, index) => {
              return <TopicItem item={item} handelModel={handelModel} />;
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
              <div class="input-group">
                <input id="newTopicName" className="form-control" type="text" placeholder="Quickly Add New Topic" aria-label="quickly add new topic" />
                {inputActive && (
                  <span class="input-group-text" id="basic-addon2">
                    <svg width="20" height="20" viewBox="0 0 20 20">
                      <g stroke="currentColor" fill="none" fill-rule="evenodd" strokeLinecap="round" strokeLinejoin="round">
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
  const [revisedButton, setRevisedButton] = useState(true);
  const handleRevised = (event, id) => {
    setRevisedButton(false);
    reviseTopic(id)
      .then((res) => {
        setRevisedButton(true);
      })
      .catch((err) => {
        //TODO ADD SMTH WENT WRONG
        console.log("Can't Fetch topic details");
        setRevisedButton(true);
      });
  };
  return (
    <div key={item.topic_id} className="list-group-item list-group-item-action" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
      <div
        className="d-flex justify-content-between align-items-center"
        onClick={(e) => {
          handelModel(e, item.topic_id);
        }}
      >
        <div className="">
          <span className="pt-1">
            <strong>{item.topic}</strong>
            <small className="d-block text-body-secondary">
              <svg className="bi me-1" width="1em" height="1em">
                <use xlinkHref="#calendar-event"></use>
              </svg>
              {DateTime.fromISO(item.next_revision).toLocaleString(DateTime.DATE_SHORT)}
            </small>
          </span>
        </div>
        <div className="">
          <Button
            variant="outline-success"
            onClick={(e) => {
              e.stopPropagation();
              handleRevised(e, item.topic_id);
            }}
            disabled={!revisedButton}
          >
            {revisedButton ? (
              "Revise"
            ) : (
              <>
                <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>
                <span role="status">Revise</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
