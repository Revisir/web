import { useEffect, useState } from "react";
import Details from "./Details";
import { getTodaysList } from "../service/topic_service";

export default function TodaysList({ today }) {
  const [modelData, setModelData] = useState({ name: null });
  const [listData, setListData] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)
    const res = await getTodaysList()
    setListData(res.data);
    setLoading(false);
  }
  useEffect(() => {fetchData()}, [])
  useEffect(() => {
    console.log(listData);
  }, [listData]);
  
  const handleRevised = (event) => {
    console.log("Button clicked!");
  };
  const handelModel = (event) => {
    setModelData({ name: "Nishant" });
  };
  return (
    <div>
      <Details modelData={modelData} />
      <div className="list-group " style={{ minWidth: "-webkit-fill-available" }}>
        <div className="list-group-item" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          <div className="row">
            <div className="col-8" data-bs-toggle="modal" data-bs-target="#detailsModal" onClick={handelModel}>
              <span className="pt-1">
                <strong>Finish sales report</strong>
                <small className="d-block text-body-secondary">
                  <svg className="bi me-1" width="1em" height="1em">
                    <use xlinkHref="#calendar-event"></use>
                  </svg>
                  1:00–2:00pm
                </small>
              </span>
            </div>
            <div className="col-4 align-self-center text-end">
              <button id="hello" type="button" className="btn btn-outline-primary" onClick={handleRevised}>
                Revised
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
