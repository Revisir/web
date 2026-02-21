export const api = {
  todaysList: "/topics/due",
  allTopics: "/topics",
  topic: function (id) {
    return `/topics/${id}`;
  },
};
