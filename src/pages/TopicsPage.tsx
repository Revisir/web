import TopicList from "../Components/topics/TopicList";
import { ALL_TOPIC_KEY } from "../hooks/useTopicQuery";
import { getAllList } from "../service/topic_service.mjs";

export default function TopicsPage() {
  return (
    <>
      <h1 className="mb-4 text-headline-md text-foreground">Topics</h1>
      <TopicList listKey={ALL_TOPIC_KEY} loader={getAllList} />
    </>
  );
}
