import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import hearts from "../../assets/hearts.png";

/* ── Inline SVG icons ── */
function IconGrid() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      <rect x="2" y="2" width="7" height="7" rx="1.5" />
      <rect x="11" y="2" width="7" height="7" rx="1.5" />
      <rect x="2" y="11" width="7" height="7" rx="1.5" />
      <rect x="11" y="11" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconMessage() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      <path
        d="M17 10.5C17 14.09 13.87 17 10 17c-1.07 0-2.08-.22-3-.62L3 17l.93-3.5A6.4 6.4 0 0 1 3 10.5C3 6.91 6.13 4 10 4s7 2.91 7 6.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconHeart() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      <path
        d="M10 16.5S3 12.5 3 7.5A4 4 0 0 1 10 5a4 4 0 0 1 7 2.5C17 12.5 10 16.5 10 16.5Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      <circle cx="10" cy="10" r="3" />
      <path
        d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
        strokeLinecap="round"
      />
    </svg>
  );
}
function IconShield() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4 flex-shrink-0"
    >
      <path
        d="M10 2L3 5v5c0 4.4 3 8.1 7 9 4-0.9 7-4.6 7-9V5L10 2Z"
        strokeLinejoin="round"
      />
      <path d="M7 10l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className="h-5 w-5"
    >
      <circle cx="7" cy="6" r="3" />
      <circle cx="14" cy="8" r="2.5" />
      <path
        d="M2 17v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2M12 17v-1.5a3.5 3.5 0 0 1 3.5-3.5h0a3.5 3.5 0 0 1 3.5 3.5V17"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Sidebar() {
  const { displayName, signOut, role } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Role-based navigation items
  const navItems = role === "doctor"
    ? [
        { to: "/dashboard", label: "Dashboard", Icon: IconGrid },
        { to: "/messaging", label: "Messaging", Icon: IconMessage },
        { to: "/patients", label: "Patients", Icon: IconUsers },
        { to: "/settings", label: "Settings", Icon: IconSettings },
      ]
    : [
        { to: "/dashboard", label: "Dashboard", Icon: IconGrid },
        { to: "/messaging", label: "Messaging", Icon: IconMessage },
        { to: "/checkup", label: "Checkup", Icon: IconHeart },
        { to: "/settings", label: "Settings", Icon: IconSettings },
      ];

  return (
    <>
      {/* ── Mobile hamburger ── */}
      <button
        className="fixed left-4 top-4 z-50 flex items-center justify-center rounded-xl bg-nn-deep-blue p-2 shadow-md lg:hidden"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        <span className="flex flex-col gap-1.5">
          <span
            className={`block h-0.5 w-5 rounded bg-white transition-all ${mobileOpen ? "translate-y-2 rotate-45" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 rounded bg-white transition-all ${mobileOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block h-0.5 w-5 rounded bg-white transition-all ${mobileOpen ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </span>
      </button>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside
        className={[
          "fixed left-0 top-0 z-40 flex h-full w-64 flex-col",
          "bg-nn-soft-blue transition-transform duration-300",
          "shadow-[4px_0_24px_rgba(70,99,172,0.08)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6">
          <img src={hearts} alt="NatalNanny logo" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
          <div>
            <p className="text-sm font-bold tracking-tight text-nn-navy">
              Natal Nanny
            </p>
            <p className="text-[10px] text-nn-navy-light">Wellness Companion</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-nn-deep-blue text-white shadow-sm"
                    : "text-nn-navy hover:bg-nn-mist hover:text-nn-navy",
                ].join(" ")
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Mascot heart */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/60 px-4 py-3">
            <IconShield />
            <p className="text-[10px] leading-snug text-nn-navy-light">
              Not a diagnosis. Contact your care team for urgent symptoms.
            </p>
          </div>
        </div>

        {/* User footer */}
        <div className="border-t border-nn-mist px-4 py-4">
          <button
            onClick={() => {
              navigate("/settings");
              setMobileOpen(false);
            }}
            className="mb-2 flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-nn-mist"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nn-deep-blue text-xs font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-nn-navy">
                {displayName}
              </p>
              <p className="text-[11px] text-nn-navy-light">33 weeks</p>
            </div>
          </button>
          <button
            onClick={() => void signOut()}
            className="w-full rounded-lg px-3 py-2 text-left text-xs text-nn-navy-light transition-colors hover:bg-nn-mist hover:text-nn-navy"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
