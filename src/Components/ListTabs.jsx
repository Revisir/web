import TopicList from "./topics/TopicList";
import Stats from "./Stats";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { ALL_TOPIC_KEY, DUE_TOPIC_KEY } from "../hooks/useTopicQuery.js";
import { getAllList, getTodaysList } from "../service/topic_service.mjs";

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
          <TopicList listKey={DUE_TOPIC_KEY} loader={getTodaysList} />
        </Tab>
        <Tab eventKey="/fullList" title="Full List">
          <TopicList listKey={ALL_TOPIC_KEY} loader={getAllList} />
        </Tab>
        <Tab eventKey="/stats" title="Stats">
          <Stats />
        </Tab>
      </Tabs>
    </>
  );
}

export default ListTabs;
