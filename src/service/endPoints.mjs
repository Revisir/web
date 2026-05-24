export const api = {
  todaysList: "/topics/due",
  allTopics: "/topics",
  topic: function (id) {
    return id ? `/topics/${id}` : `/topics`;
  },
  statistics: "/statistics",
};
