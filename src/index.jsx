import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// import reportWebVitals from "./reportWebVitals";
import { BrowserRouter } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { AuthProvider } from "react-oidc-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getConfig } from "./config.mjs";

const authConfig = {
  authority: getConfig("FE_AUTH_AUTHORITY"),
  client_id: getConfig("FE_AUTH_CLIENT_ID"),
  redirect_uri: `${getConfig("FE_CLIENT_URL")}/callback`,
  response_type: "code",
  scope: "email openid phone profile",
};
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: Infinity,
    },
  },
});

window.__TANSTACK_QUERY_CLIENT__ = queryClient;
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // <React.StrictMode>
  <AuthProvider {...authConfig}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </AuthProvider>,
  // </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals();
// 4OaS09tvBEeuyaBj
