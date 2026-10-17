export const api = {
  todaysList: "/topics/due",
  allTopics: "/topics",
  topic: function (id) {
    return id ? `/topics/${id}` : `/topics`;
  },
  statistics: "/statistics",
  subjects: "/subjects",
  quizStart: "/quiz/start",
  quizSession: function (sessionId) {
    return `/quiz/${sessionId}`;
  },
};
