import { useAuth } from "react-oidc-context";
import { useState } from "react";

function Login() {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
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
                setLoading(true);
                auth.signinRedirect();
              }}
            >
              {loading && <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>}
              {!loading && <span role="status">Login</span>}
            </button>
          </div>
          <div className="card-footer text-body-secondary">App by Rjnishant</div>
        </div>
      </div>
    </>
  );
}

export default Login;
