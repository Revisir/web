export const SET_COMPLETE_LIST = "setCompleteList";
export const UPDATE_ITEM_IN_LIST = "updateItemInList";
export const ADD_ITEM_IN_LIST = "AllItemInList";

export default function listReducer(state, { payload, type }) {
  switch (type) {
    case SET_COMPLETE_LIST:
      return [...payload];
    case UPDATE_ITEM_IN_LIST:
      const id = payload.topic_id;
      if (state?.[id] !== undefined) {
        return { ...state, [id]: { ...payload } };
      }
      return state;
    case ADD_ITEM_IN_LIST:
      return { ...state, [payload.topic_id]: { ...payload } };

    default:
      return state;
  }
}
