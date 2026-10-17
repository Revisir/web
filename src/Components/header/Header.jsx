import { useContext, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogOut, Menu, Moon, Plus, Sun } from "lucide-react";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import IconButton from "@/Components/common/IconButton";
import { AppContext } from "../../store/AppProvider";
import { REMOVE_LOGGED_IN_USER_NAME } from "../../store/reducers/loggedInReducer.mjs";
import { TOGGLE_THEME } from "../../store/reducers/themeReducer.mjs";
import { countTopicsLeftToday, useDueQueue } from "../../hooks/useDueQueue";
import TopicModal from "../topics/TopicModal";
import { signOutRedirect } from "../../utils.mjs";

const NAV_ITEMS = [
  { to: "/", label: "Today's List", end: true, showDueCount: true },
  { to: "/topics", label: "Topics" },
  { to: "/stats", label: "Stats" },
];

// NavLink marks the current route with aria-current="page".
const NAV_LINK_CLASS =
  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-label-md text-muted-foreground no-underline transition-colors hover:bg-surface-container hover:text-foreground aria-[current=page]:bg-surface-container-high aria-[current=page]:text-primary";
const MENU_LINK_CLASS = "no-underline text-foreground aria-[current=page]:font-medium aria-[current=page]:text-primary";

function DueCountBadge({ count }) {
  if (!count) return null;
  return <Badge className="h-auto rounded bg-warning px-1.5 font-mono text-mono-sm font-semibold text-warning-foreground">{count} due</Badge>;
}

function BrandLink() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2 text-foreground no-underline hover:text-foreground">
      <img src="/Reviser.png" alt="" className="h-8 w-auto" />
      <span className="text-headline-sm font-semibold">Reviser</span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, dispatchTheme } = useContext(AppContext);
  const isDark = theme === "dark";
  return (
    <IconButton label={isDark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => dispatchTheme({ type: TOGGLE_THEME })}>
      {isDark ? <Sun /> : <Moon />}
    </IconButton>
  );
}

function SignedInBar() {
  const { setName } = useContext(AppContext);
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: dueTopics } = useDueQueue();
  const dueCount = countTopicsLeftToday(dueTopics);

  const handleLogout = async () => {
    setName({ payload: { name: "" }, type: REMOVE_LOGGED_IN_USER_NAME });
    signOutRedirect();
  };
  const addNewTopic = () => {
    setShowAddModal(true);
  };

  return (
    <>
      <div className="flex min-w-0 items-center gap-6">
        <BrandLink />
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ to, label, end, showDueCount }) => (
            <NavLink key={to} to={to} end={end} className={NAV_LINK_CLASS}>
              <span>{label}</span>{" "}
              {showDueCount && <DueCountBadge count={dueCount} />}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1">
        <Button className="mr-2 hidden md:inline-flex" onClick={addNewTopic}>
          <Plus data-icon="inline-start" />
          New Topic
        </Button>
        <ThemeToggle />
        <IconButton label="Sign out" onClick={handleLogout}>
          <LogOut />
        </IconButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Open navigation" className="md:hidden">
              <Menu />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {NAV_ITEMS.map(({ to, label, end, showDueCount }) => (
              <DropdownMenuItem key={to} asChild>
                <NavLink to={to} end={end} className={MENU_LINK_CLASS}>
                  <span>{label}</span>{" "}
                  {showDueCount && (
                    <span className="ml-auto">
                      <DueCountBadge count={dueCount} />
                    </span>
                  )}
                </NavLink>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={addNewTopic}>
              <Plus />
              New Topic
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showAddModal && <TopicModal setShowModal={setShowAddModal} />}
    </>
  );
}

function Header() {
  const {
    name: { userName },
  } = useContext(AppContext);
  const loggedIn = Boolean(userName ?? false);
  return (
    <header className="sticky top-0 z-40 mb-6 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4">
        {loggedIn ? (
          <SignedInBar />
        ) : (
          <>
            <BrandLink />
            <ThemeToggle />
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
