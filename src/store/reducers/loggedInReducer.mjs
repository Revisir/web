import { userName, userToken } from "../../constants.mjs";

export const UPDATE_LOGGED_IN_USER_NAME = "UPDATE_LOGGED_IN_USER_NAME";
export const REMOVE_LOGGED_IN_USER_NAME = "REMOVE_LOGGED_IN_USER_NAME";

export function loggedInNameStateInit() {
  return {
    userName: sessionStorage.getItem(userName),
  };
}

function loggedInReducer(state, { payload, type }) {
  switch (type) {
    case UPDATE_LOGGED_IN_USER_NAME:
      const { name } = payload;
      sessionStorage.setItem(userName, name);
      return { userName: name };
    case REMOVE_LOGGED_IN_USER_NAME:
      sessionStorage.removeItem(userToken);
      sessionStorage.removeItem(userName);
      return { userName: null };
    default:
      return state;
  }
}

export default loggedInReducer;
