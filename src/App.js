import "./App.css";
import Header from "./Components/Header";
import { useContext} from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Callback from "./Components/Callback";
import ListTabs from "./Components/ListTabs";
import Login from "./Components/Login";
import { AppContext, AppProvider } from "./store/AppProvider";
// import { signInWithRedirect } from "aws-amplify/auth";

function App() {
  return (
    <AppProvider>
      <PrimaryApp />
    </AppProvider>
  );
}

function AppLayout() {
  return (
    <div className="container">
      <div className="m-50">
        <Header />
        <Outlet />
      </div>
    </div>
  );
}

function PrimaryApp() {
 
  const {
    name: { userName },
  } = useContext(AppContext);
  const loggedIn = Boolean(userName ?? false);
  return (
    <>
      
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={loggedIn ? <ListTabs /> : <Login />} />
        </Route>
        <Route path="/callback" element={loggedIn?<Navigate to={"/"}/>:<Callback />} />
      </Routes>
    </>
  );
}

export default App;
