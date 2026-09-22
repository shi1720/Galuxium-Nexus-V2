import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { Bootstrap } from "../../shared/types";
import { api, setCsrf } from "./api";
import { Empty, Logo, Spinner } from "./components/ui";
import { Context, useApp } from "./context";
import { Auth } from "./pages/auth";
import { Activity, Dashboard, DecisionLog } from "./pages/dashboard";
import { Landing, Policy } from "./pages/marketing";
import { Offer } from "./pages/offer";
import { ProjectPage, Projects } from "./pages/projects";
import { RequestPage } from "./pages/request";
import { Pricing, SettingsPage } from "./pages/settings";

export function App() {
  const [data, setData] = useState<Bootstrap | null>(null),
    [loading, setLoading] = useState(true),
    [notice, setNotice] = useState("");
  const refresh = async () => {
    const b = await api<Bootstrap>("/bootstrap");
    setData(b);
  };
  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
    const onFocus = () => {
      refresh().catch(() => {});
    };
    const expired = () => {
      setData(null);
      setCsrf("");
      setNotice("Your session expired. Please log in again.");
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("pactshift-session-expired", expired);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pactshift-session-expired", expired);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  return (
    <Context.Provider value={{ data, refresh, setData, toast: setNotice }}>
      <BrowserRouter>
        <ScrollReset />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth signup />} />
          <Route path="/recover" element={<Auth recover />} />
          <Route path="/offer/:token" element={<Offer />} />
          <Route path="/privacy" element={<Policy />} />
          <Route path="/terms" element={<Policy terms />} />
          <Route
            path="/app/*"
            element={loading ? <Spinner /> : data ? <Shell /> : <Auth />}
          />
          <Route
            path="*"
            element={
              <div className="notfound">
                <Logo />
                <h1>This page has moved.</h1>
                <Link className="btn primary" to="/">
                  Back to Pactshift
                </Link>
              </div>
            }
          />
        </Routes>
        {notice && (
          <div className="toast" role="status">
            <CheckCircle2 size={18} />
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </BrowserRouter>
    </Context.Provider>
  );
}

export function Shell() {
  const { data, setData } = useApp(),
    nav = useNavigate();
  const [mobile, setMobile] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobile) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobile(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobile]);
  if (!data) return null;
  return (
    <div className="app-shell">
      <aside
        id="workspace-navigation"
        aria-label="Workspace navigation"
        className={"sidebar " + (mobile ? "open" : "")}
      >
        <Logo />
        <div className="workspace-switch">
          <span className="workspace-avatar">
            {data.workspace.name.slice(0, 1)}
          </span>
          <div>
            <strong>{data.workspace.name}</strong>
            <span>
              {data.workspace.isDemo
                ? "Sample workspace"
                : `${data.workspace.plan} workspace`}
            </span>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav onClick={() => setMobile(false)}>
          <NavLink to="/app" end>
            <LayoutDashboard size={18} /> Overview
          </NavLink>
          <NavLink to="/app/projects">
            <FolderOpen size={18} /> Projects{" "}
            <span className="nav-count">
              {data.workspace.projects.filter((p) => !p.archived).length}
            </span>
          </NavLink>
          <NavLink to="/app/decisions">
            <ArrowLeftRight size={18} /> Decision log
          </NavLink>
          <NavLink to="/app/activity">
            <ShieldCheck size={18} /> Audit trail
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon">
              <Leaf size={18} />
            </div>
            <strong>Room for better decisions.</strong>
            <p>One agreed change is one less difficult conversation.</p>
            <Link to="/app/billing" onClick={() => setMobile(false)}>
              Explore plans <ArrowUpRight size={14} />
            </Link>
          </div>
          <nav onClick={() => setMobile(false)}>
            <NavLink to="/app/settings">
              <Settings size={18} /> Settings
            </NavLink>
            <NavLink to="/app/billing">
              <Wallet size={18} /> Plans & usage
            </NavLink>
          </nav>
          <div className="profile">
            <span className="avatar">
              {data.user.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{data.user.name}</strong>
              <span>
                {data.workspace.isDemo ? "Demo explorer" : "Workspace owner"}
              </span>
            </div>
            <button
              className="icon-btn"
              aria-label="Log out"
              onClick={async () => {
                await api("/auth/logout", "POST", {});
                setData(null);
                setCsrf("");
                nav("/");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <button
            ref={menuButton}
            className="icon-btn mobile-menu"
            aria-label={mobile ? "Close navigation" : "Open navigation"}
            aria-expanded={mobile}
            aria-controls="workspace-navigation"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? <X /> : <Menu />}
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />{" "}
            <span>{data.workspace.name}</span>
          </div>
          <div className="topbar-right">
            <span className="live-dot" />{" "}
            {data.workspace.isDemo ? "Your private demo" : "Private workspace"}
            <span className="topbar-divider" />
            <Link
              to="/app/settings"
              className="icon-btn"
              aria-label="Workspace settings"
            >
              <Settings size={17} />
            </Link>
          </div>
        </header>
        {data.workspace.isDemo && (
          <div className="demo-banner">
            <Sparkles size={14} />
            <span>
              Make yourself at home. This is an isolated workspace with
              fictional sample data.
            </span>
            <Link to="/signup">
              Create your own <ArrowRight size={14} />
            </Link>
          </div>
        )}
        <main className="workspace-content">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectPage />} />
            <Route
              path="projects/:id/requests/:rid"
              element={<RequestPage />}
            />
            <Route path="decisions" element={<DecisionLog />} />
            <Route path="activity" element={<Activity />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="billing" element={<Pricing />} />
            <Route
              path="*"
              element={
                <Empty
                  title="Page not found"
                  description="Use the workspace navigation to return to your projects."
                />
              }
            />
          </Routes>
        </main>
        <div className="app-footer">
          <span>Clear scope. Better partnerships.</span>
          <span>
            Pactshift <span className="footer-dot">·</span>{" "}
            <Link to="/privacy">Privacy</Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    // Browser integrations may wrap scrollTo and return a value. An effect
    // must only return a cleanup function, never the browser API result.
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
