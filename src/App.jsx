import "./App.css";
import Header from "./Components/header/Header";
import Footer from "./Components/footer/Footer";
import { useContext } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import Callback from "./Components/Callback";
import Login from "./Components/Login";
import TopicDetails from "./Components/topics/TopicDetails";
import TodayPage from "./pages/TodayPage";
import TopicsPage from "./pages/TopicsPage";
import StatsPage from "./pages/StatsPage";
import NormalQuiz from "./Components/quiz/NormalQuiz";
import { AppContext, AppProvider } from "./store/AppProvider";

function App() {
  return (
    <AppProvider>
      <PrimaryApp />
    </AppProvider>
  );
}

function AppLayout() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-3">
      <Header />
      <main className="grow">
        <Outlet />
      </main>
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
          <Route path="/" element={loggedIn ? <TodayPage /> : <Login />} />
          <Route element={loggedIn ? <Outlet /> : <Navigate to="/" replace />}>
            <Route path="/topics" element={<TopicsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/topic/:id" element={<TopicDetails />} />
            <Route path="/topic/:id/quiz" element={<NormalQuiz />} />
          </Route>
        </Route>
        <Route path="/callback" element={loggedIn ? <Navigate to={"/"} /> : <Callback />} />
      </Routes>
    </>
  );
}

export default App;
