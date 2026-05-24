import { useState } from "react";
import TopicListItem from "./TopicListItem";
import { useTopicsList } from "../../hooks/useTopicQuery";

export default function TopicList({ listKey, loader }) {
  const [addingTopic, setAddingTopic] = useState(false);
  const [inputActive, setInputActive] = useState(false);
  console.log("Rendering ", listKey);
  const { data, isFetched } = useTopicsList(listKey, loader);
  const handleQuickAdd = async (event) => {
    event.preventDefault();
    setAddingTopic(true);
    // addTopic({ topicName: event.target[0].value }).then((data) => {
    //   setTodaysList({ payload: data, type: ADD_ITEM_IN_LIST });
    // });
    // event.target[0].value = "";
    setAddingTopic(false);
  };

  return (
    <>
      {!isFetched ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "200px", height: "100%" }}>
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="list-group ">
          {data &&
            data?.map((item) => {
              return <TopicListItem key={item._id} id={item._id} />;
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
