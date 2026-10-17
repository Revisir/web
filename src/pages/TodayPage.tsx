import TopicList from "../Components/topics/TopicList";
import { DUE_TOPIC_KEY } from "../hooks/useTopicQuery";
import { getTodaysList } from "../service/topic_service.mjs";

// The existing due list until U12 replaces it with the due queue.
export default function TodayPage() {
  return (
    <>
      <h1 className="mb-4 text-headline-md text-foreground">Today's List</h1>
      <TopicList listKey={DUE_TOPIC_KEY} loader={getTodaysList} />
    </>
  );
}
