import "./App.css";
import Header from "./Components/header/Header";
import Footer from "./Components/footer/Footer";
import { useContext } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Callback from "./Components/Callback";
import ListTabs from "./Components/ListTabs";
import Login from "./Components/Login";
import TopicDetails from "./Components/topics/TopicDetails";
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
      <Header />
      <Outlet />
      <Footer />
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
          <Route path="/topic/:id" element={loggedIn ? <TopicDetails /> : <Navigate to="/" />} />
        </Route>
        <Route path="/callback" element={loggedIn ? <Navigate to={"/"} /> : <Callback />} />
      </Routes>
    </>
  );
}

export default App;
