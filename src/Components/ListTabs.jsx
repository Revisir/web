import TodaysList from "./TopicList";
import Stats from "./Stats";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function ListTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedTab, setSelectedTab] = useState(location.state?.tab || "/home");

  useEffect(() => {
    if (location.state?.tab) {
      setSelectedTab(location.state.tab);
    }
  }, [location.state]);

  const handleTabSelect = (key) => {
    setSelectedTab(key);
    navigate("/", { state: { tab: key }, replace: true });
  };

  return (
    <>
      <Tabs activeKey={selectedTab} onSelect={handleTabSelect} mountOnEnter>
        <Tab eventKey="/home" title="Today's List">
          <TodaysList today={true} />
        </Tab>
        <Tab eventKey="/fullList" title="Full List">
          <TodaysList today={false} />
        </Tab>
        <Tab eventKey="/stats" title="Stats">
          <Stats />
        </Tab>
      </Tabs>
      {}
    </>
    // <div>
    //   <ul className="nav nav-tabs" id="myTab" role="tablist">
    //     <li className="nav-item" role="presentation">
    //       <button className="nav-link active" id="todayList-tab" data-bs-toggle="tab" data-bs-target="#todayList-tab-pane" type="button" role="tab" aria-controls="todayList-tab-pane" aria-selected="true">
    //         Today's List
    //       </button>
    //     </li>
    //     <li className="nav-item" role="presentation">
    //       <button className="nav-link" id="fullList-tab" data-bs-toggle="tab" data-bs-target="#fullList-tab-pane" type="button" role="tab" aria-controls="fullList-tab-pane" aria-selected="false">
    //         Full List
    //       </button>
    //     </li>
    //     <li className="nav-item" role="presentation">
    //       <button className="nav-link" id="stats-tab" data-bs-toggle="tab" data-bs-target="#stats-tab-pane" type="button" role="tab" aria-controls="stats-tab-pane" aria-selected="false">
    //         Stats
    //       </button>
    //     </li>
    //   </ul>

    //   <div className="tab-content" id="myTabContent">
    //     <div className="tab-pane fade show active" id="todayList-tab-pane" role="tabpanel" aria-labelledby="todayList-tab" tabIndex="0">
    //       {<TodaysList id="todayList" today={true} />}
    //     </div>
    //     <div className="tab-pane fade" id="fullList-tab-pane" role="tabpanel" aria-labelledby="fullList-tab" tabIndex="1">
    //       {<TodaysList id="fullList" />}
    //     </div>
    //     <div className="tab-pane fade" id="stats-tab-pane" role="tabpanel" aria-labelledby="stats-tab" tabIndex="20">
    //       {<Stats />}
    //     </div>
    //   </div>
    // </div>
  );
}

export default ListTabs;
