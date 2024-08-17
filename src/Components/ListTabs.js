import TodaysList from "./TopicList";
import Stats from "./Stats";

function ListTabs() {
  return (
    <div>
      <ul className="nav nav-tabs" id="myTab" role="tablist">
        <li className="nav-item" role="presentation">
          <button className="nav-link active" id="todayList-tab" data-bs-toggle="tab" data-bs-target="#todayList-tab-pane" type="button" role="tab" aria-controls="todayList-tab-pane" aria-selected="true">
            Today's List
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button className="nav-link" id="fullList-tab" data-bs-toggle="tab" data-bs-target="#fullList-tab-pane" type="button" role="tab" aria-controls="fullList-tab-pane" aria-selected="false">
            Full List
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button className="nav-link" id="stats-tab" data-bs-toggle="tab" data-bs-target="#stats-tab-pane" type="button" role="tab" aria-controls="stats-tab-pane" aria-selected="false">
            Stats
          </button>
        </li>
      </ul>

      <div className="tab-content" id="myTabContent">
        <div className="tab-pane fade show active" id="todayList-tab-pane" role="tabpanel" aria-labelledby="todayList-tab" tabIndex="0">
          {<TodaysList id="todayList" today={true} />}
        </div>
        <div className="tab-pane fade" id="fullList-tab-pane" role="tabpanel" aria-labelledby="fullList-tab" tabIndex="1">
          {<TodaysList id="fullList" />}
        </div>
        <div className="tab-pane fade" id="stats-tab-pane" role="tabpanel" aria-labelledby="stats-tab" tabIndex="20">
          {<Stats />}
        </div>
      </div>
    </div>
  );
}

export default ListTabs;
