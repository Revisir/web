import { useContext, useEffect } from "react";
import { AppContext } from "../store/AppProvider";
import { UPDATE_LOGGED_IN_USER_NAME } from "../store/reducers/loggedInReducer.mjs";
import { userToken } from "../constants.mjs";
import { useAuth } from "react-oidc-context";

function Callback() {
  const { setName } = useContext(AppContext);
  const auth = useAuth();
  useEffect(() => {
    console.log(auth.isAuthenticated);
    console.log(auth?.user);
    if (auth?.user) {
      console.log(auth?.user);
      const { id_token, profile } = auth.user;
      sessionStorage.setItem(userToken, id_token.toString());
      setName({ payload: { name: profile["preferred_username"].toUpperCase() }, type: UPDATE_LOGGED_IN_USER_NAME });
    }
  }, [setName, auth.isAuthenticated]);

  return (
    <div className="text-center" style={{ minHeight: "-webkit-fill-available", minWidth: "-webkit-fill-available", position: "absolute", display: "flex" }}>
      <div className="spinner-border" role="status" style={{ margin: "auto" }}>
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
}

export default Callback;
