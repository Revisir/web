import { createContext, useReducer } from "react";
import loggedInReducer, { loggedInNameStateInit } from "./reducers/loggedInReducer.mjs";
export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [name, setName] = useReducer(loggedInReducer, null, loggedInNameStateInit);
  const store = {
    name,
    setName,
  };
  return <AppContext.Provider children={children} value={store} />;
};
