import { createContext, useReducer } from "react";
import loggedInReducer, { loggedInNameStateInit } from "./reducers/loggedInReducer.mjs";
import listReducer from "./reducers/listReducer.mjs";
export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [name, setName] = useReducer(loggedInReducer, null, loggedInNameStateInit);
  const [todaysList, setTodaysList] = useReducer(listReducer, []);
  const [fullList, setFullList] = useReducer(listReducer, []);
  const store = {
    name,
    setName,
    todaysList,
    setTodaysList,
    fullList,
    setFullList,
  };
  return <AppContext.Provider children={children} value={store} />;
};
