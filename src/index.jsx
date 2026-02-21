import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// import reportWebVitals from "./reportWebVitals";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthProvider } from "react-oidc-context";

const cognitoAuthConfig = {
  authority: "https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_kAEibA6fs",
  client_id: "6chhv3rf7dik3j5gbjic2f9g82",
  redirect_uri: "http://localhost:5173/callback",
  response_type: "code",
  scope: "email openid phone",
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // <React.StrictMode>
  <AuthProvider {...cognitoAuthConfig}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AuthProvider>,
  // </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
// 4OaS09tvBEeuyaBj
