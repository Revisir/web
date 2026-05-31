import { useQuery } from "@tanstack/react-query";
import { getMainStats } from "../service/stats-service.mjs";
import CalendarHeatMap from "./charts/CalendarHeatmap";
import SunBurstBook from "./charts/SunBurstBook";
import CalendarCount from "./charts/CalendarCount";
import { Card, CardBody } from "react-bootstrap";

function Stats() {
  const { isFetched, data } = useQuery({
    queryKey: ["stats"],
    queryFn: getMainStats,
    retry: 3,
  });
  if (!isFetched) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "400px" }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  console.log(data);
  return (
    <>
      <div className="my-3 d-flex flex-sm-row flex-column  justify-content-sm-evenly  justify-content-center align-items-sm-center gap-2 ">
        <Card className="text-center ">
          <CardBody>
            <h3>Total Topics : {data?.totalTopics}</h3>
          </CardBody>
        </Card>
        <Card className="text-center">
          <CardBody>
            <h3>Due Today : {data?.dueToday}</h3>
          </CardBody>
        </Card>
      </div>
      <div className="d-flex  w-100  flex-column justify-content-center align-items-center">
        <div className="d-flex  w-100  flex-lg-row flex-column justify-content-lg-evenly justify-content-center align-items-center gap-2 mb-2">
          <CalendarCount data={data.upcomingRevisions} />
          <SunBurstBook data={data.perSubject} />
        </div>
        <CalendarHeatMap data={data.revisionPerDay} />
      </div>
    </>
  );
}

export default Stats;
