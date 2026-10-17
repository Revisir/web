import { useContext, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
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
    <div className="absolute inset-0 flex items-center justify-center bg-background text-center" role="status">
      <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default Callback;
