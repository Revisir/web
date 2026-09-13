import { createContext, useReducer } from "react";
import loggedInReducer, { loggedInNameStateInit } from "./reducers/loggedInReducer.mjs";
import themeReducer, { themeStateInit } from "./reducers/themeReducer.mjs";
export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [name, setName] = useReducer(loggedInReducer, null, loggedInNameStateInit);
  const [themeState, dispatchTheme] = useReducer(themeReducer, null, themeStateInit);
  const store = {
    name,
    setName,
    theme: themeState.theme,
    dispatchTheme,
  };
  return <AppContext.Provider children={children} value={store} />;
};
