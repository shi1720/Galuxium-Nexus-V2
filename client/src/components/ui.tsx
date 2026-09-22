import {
  AlertCircle,
  ArrowLeftRight,
  FolderOpen,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className={"logo " + (light ? "light" : "")}
      aria-label="Pactshift home"
    >
      <span className="logo-mark">
        <ArrowLeftRight size={22} />
      </span>
      Pactshift<span className="logo-dot">.</span>
    </Link>
  );
}

export function Spinner() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" /> Loading your workspace…
    </div>
  );
}

export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <div className="error" role="alert">
      <AlertCircle size={18} />
      {error}
    </div>
  ) : null;
}

export function Badge({
  children,
  tone = "gray",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}

export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <FolderOpen size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  children,
  close,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLElement>(null),
    closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]",
        ) || [],
      ).sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      );
    focusable()[0]?.focus();
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const els = focusable(),
          first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + (wide ? "wide" : "")}
      >
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={close}
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone?: string;
}) {
  return (
    <div className={"stat " + tone}>
      <div className="stat-top">
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

export function Status({ value }: { value: string }) {
  const labels: Record<string, string> = {
    draft: "Needs review",
    shared: "Awaiting client",
    accepted: "Agreed",
    deferred: "For later",
    revoked: "Link revoked",
    planned: "Planned",
    in_progress: "In progress",
    done: "Complete",
    swapped: "Exchanged",
  };
  return (
    <Badge
      tone={
        ["accepted", "done"].includes(value)
          ? "green"
          : value === "shared"
            ? "purple"
            : value === "draft"
              ? "amber"
              : "gray"
      }
    >
      {labels[value] || value}
    </Badge>
  );
}

export function humanize(s: string) {
  return s.replace(/[_.]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
