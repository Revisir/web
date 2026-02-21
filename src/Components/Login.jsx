import { useAuth } from "react-oidc-context";

function Login() {
  const auth = useAuth();
  return (
    //TODO important responsivness
    <>
      <div className="container ">
        <div className="card text-center" style={{ background: "#f6f3eb" }}>
          <div className="card-body p-4">
            <h5 className="card-title p-2 mb-4 mt-3">Welcome to Reviser App</h5>
            <button
              className="btn my-2 w-100"
              style={{ background: "#FB7B76", color: "white" }}
              onClick={() => {
                document.getElementById("loadingButton").classList.remove("visually-hidden");
                document.getElementById("loginButtonText").classList.add("visually-hidden");
                auth.signinRedirect();
              }}
            >
              <span id="loadingButton" className="visually-hidden spinner-border spinner-border-sm" aria-hidden="true"></span>
              <span id="loginButtonText" className="" role="status">
                Login
              </span>
            </button>
          </div>
          <div className="card-footer text-body-secondary">App by Rjnishant</div>
        </div>
      </div>
    </>
  );
}

export default Login;
