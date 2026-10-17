import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { Card, CardContent } from "@/Components/ui/card";
import { getMainStats } from "../service/stats-service.mjs";
import { STATS_KEY } from "../hooks/useTopicQuery";
import CalendarHeatMap from "./charts/CalendarHeatmap";
import SunBurstBook from "./charts/SunBurstBook";
import CalendarCount from "./charts/CalendarCount";

function StatCard({ label, value }) {
  return (
    <Card className="text-center">
      <CardContent>
        <h2 className="m-0 text-headline-md text-foreground">
          {label} : <span className="font-mono font-semibold">{value}</span>
        </h2>
      </CardContent>
    </Card>
  );
}

function Stats() {
  const { isFetched, data } = useQuery({
    queryKey: [STATS_KEY],
    queryFn: getMainStats,
    retry: 3,
  });
  if (!isFetched) {
    return (
      <div className="flex min-h-[400px] items-center justify-center" role="status">
        <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
  return (
    <>
      <div className="my-4 flex flex-col justify-center gap-2 sm:flex-row sm:items-center sm:justify-evenly">
        <StatCard label="Total Topics" value={data?.totalTopics} />
        <StatCard label="Due Today" value={data?.dueToday} />
      </div>
      <div className="flex w-full flex-col items-center justify-center">
        <div className="mb-2 flex w-full flex-col items-center justify-center gap-2 lg:flex-row lg:justify-evenly">
          <CalendarCount data={data.upcomingRevisions} />
          <SunBurstBook data={data.perSubject} />
        </div>
        <CalendarHeatMap data={data.revisionPerDay} />
      </div>
    </>
  );
}

export default Stats;
