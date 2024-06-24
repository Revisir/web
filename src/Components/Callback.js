import { fetchAuthSession } from "aws-amplify/auth";
import { useContext, useEffect } from "react";
import { AppContext } from "../store/AppProvider";
import { UPDATE_LOGGED_IN_USER_NAME } from "../store/loggedInReducer";
import { userToken } from "../constants";

function Callback() {
  const { setName } = useContext(AppContext);
  useEffect(() => {
    fetchAuthSession()
      .then((data) => {
        const { payload, toString } = data.tokens.idToken;
        sessionStorage.setItem(userToken, toString());
        setName({ payload: { name: payload["cognito:username"].toUpperCase() }, type: UPDATE_LOGGED_IN_USER_NAME });
      })
      .catch((error) => {
        console.log(error);
      });
  }, [setName]);

  return (
    <div className="text-center" style={{ minHeight: "-webkit-fill-available", minWidth: "-webkit-fill-available", position: "absolute", display: "flex" }}>
      <div className="spinner-border" role="status" style={{ margin: "auto" }}>
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
}

export default Callback;
