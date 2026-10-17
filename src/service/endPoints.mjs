export const api = {
  todaysList: "/topics/due",
  allTopics: "/topics",
  topic: function (id) {
    return id ? `/topics/${id}` : `/topics`;
  },
  topicQuestionsRegenerate: function (id) {
    return `/topics/${id}/questions/regenerate`;
  },
  statistics: "/statistics",
  subjects: "/subjects",
  quizStart: "/quiz/start",
  quizSession: function (sessionId) {
    return `/quiz/${sessionId}`;
  },
};
