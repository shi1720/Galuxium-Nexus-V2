import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
class AppBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="notfound" role="alert">
          <div className="eyebrow">PACTSHIFT</div>
          <h1>Let's get your workspace back.</h1>
          <p>
            The page could not finish loading. Your saved agreements are still
            stored.
          </p>
          <button
            className="btn primary"
            onClick={() => window.location.reload()}
          >
            Reload workspace
          </button>
          <a className="back-link" href="/">
            Return to the home page
          </a>
        </main>
      );
    return this.props.children;
  }
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppBoundary>
      <App />
    </AppBoundary>
  </React.StrictMode>,
);
