import { userName } from "../constants";

export const UPDATE_LOGGED_IN_USER_NAME = "UPDATE_LOGGED_IN_USER_NAME";


export function loggedInNameStateInit() {
    return {
      "userName": sessionStorage.getItem(userName),
    };
}

function loggedInReducer(state,{payload,type}) {
    switch (type) {
      case UPDATE_LOGGED_IN_USER_NAME:
            const { name } = payload;
            sessionStorage.setItem(userName, name);
        return {
          "userName":name,
        };
      default:
        return state;
    }
}

export default loggedInReducer