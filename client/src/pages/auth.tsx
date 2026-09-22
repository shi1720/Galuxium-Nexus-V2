import {
  ArrowLeft,
  ArrowRight,
  Download,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Bootstrap } from "../../../shared/types";
import { api, download } from "../api";
import { ErrorBox, Logo } from "../components/ui";
import { useApp } from "../context";

export function Auth({
  signup = false,
  recover = false,
}: {
  signup?: boolean;
  recover?: boolean;
}) {
  const { setData, toast } = useApp(),
    nav = useNavigate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const b = await api<Bootstrap & { recoveryCode?: string }>(
        recover ? "/auth/recover" : signup ? "/auth/register" : "/auth/login",
        "POST",
        form,
      );
      setData(b);
      if (b.recoveryCode) setRecovery(b.recoveryCode);
      else nav("/app");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Logo light />
        <div>
          <div className="eyebrow">GOOD WORK. CLEAR AGREEMENTS.</div>
          <h1>
            Change happens.
            <br />
            Make it a<br />
            <em>fair exchange.</em>
          </h1>
          <p>
            A little structure for the conversations
            <br />
            that protect your best work.
          </p>
        </div>
        <span>Designed for independent studios. Built by Shivam Gupta.</span>
      </div>
      <div className="auth-panel">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to Pactshift
        </Link>
        {recovery ? (
          <div className="auth-form">
            <div className="round-icon">
              <ShieldCheck />
            </div>
            <h2>Save your recovery code</h2>
            <p>
              This is the only time we show it. Keep it somewhere safe to
              recover your account if you forget your password.
            </p>
            <code className="recovery-code">{recovery}</code>
            <button
              className="btn secondary full"
              onClick={() => {
                download(
                  "pactshift-recovery-code.txt",
                  `Pactshift account recovery code\n\n${recovery}\n\nKeep private. This can reset your password.`,
                );
                toast("Recovery code downloaded.");
              }}
            >
              <Download size={17} /> Download recovery code
            </button>
            <button className="btn primary full" onClick={() => nav("/app")}>
              I saved it. Open workspace <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <div className="eyebrow">
              {recover
                ? "ACCOUNT RECOVERY"
                : signup
                  ? "YOUR NEXT PROJECT, IN SYNC"
                  : "WELCOME BACK"}
            </div>
            <h2>
              {recover
                ? "Get back to your work."
                : signup
                  ? "A little clarity starts here."
                  : "Your agreements, together."}
            </h2>
            <p>
              {recover
                ? "Use the private recovery code saved when you registered."
                : signup
                  ? "Create a free workspace. No payment details needed."
                  : "Log in to pick up where you left off."}
            </p>
            {signup && (
              <>
                <label>
                  Your name
                  <input
                    name="name"
                    required
                    maxLength={80}
                    autoComplete="name"
                    placeholder="Shivam Gupta"
                  />
                </label>
                <label>
                  Studio or workspace name
                  <input
                    name="workspaceName"
                    required
                    maxLength={80}
                    placeholder="Your studio"
                  />
                </label>
              </>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@studio.com"
              />
            </label>
            {recover && (
              <label>
                Recovery code
                <input
                  name="recoveryCode"
                  required
                  autoComplete="off"
                  placeholder="Your saved recovery code"
                />
              </label>
            )}
            <label>
              {recover ? "New password" : "Password"}
              <input
                name="password"
                type="password"
                required
                minLength={signup || recover ? 12 : 1}
                maxLength={128}
                autoComplete={
                  signup || recover ? "new-password" : "current-password"
                }
                placeholder={
                  signup || recover ? "At least 12 characters" : "Your password"
                }
              />
            </label>
            <ErrorBox error={error} />
            <button className="btn primary full" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={18} /> : null}
              {recover
                ? "Recover account"
                : signup
                  ? "Create your workspace"
                  : "Log in"}
              <ArrowRight size={17} />
            </button>
            {signup ? (
              <p className="fine-print">
                By creating an account, you agree to the{" "}
                <Link to="/terms">terms</Link> and acknowledge the{" "}
                <Link to="/privacy">privacy notice</Link>.
              </p>
            ) : (
              !recover && (
                <Link className="text-link" to="/recover">
                  Forgot your password?
                </Link>
              )
            )}
            <div className="auth-switch">
              {signup ? "Already have a workspace?" : "New to Pactshift?"}{" "}
              <Link to={signup ? "/login" : "/signup"}>
                {signup ? "Log in" : "Start for free"}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
