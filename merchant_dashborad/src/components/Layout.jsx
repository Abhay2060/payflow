import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/dashboard",    label: "Dashboard",     icon: "📊" },
  { to: "/transactions", label: "Transactions",  icon: "💳" },
  { to: "/webhooks",     label: "Webhooks",      icon: "🔔" },
  { to: "/settings",     label: "Settings",      icon: "⚙️" },
];

export const Layout = ({ children }) => {
  const { merchant, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="drawer" type="checkbox" className="drawer-toggle" />

      {/* Page content */}
      <div className="drawer-content flex flex-col">
        {/* Mobile topbar */}
        <div className="navbar bg-base-100 shadow lg:hidden">
          <label htmlFor="drawer" className="btn btn-ghost drawer-button">
            ☰
          </label>
          <span className="font-bold text-lg ml-2">Payment Gateway</span>
        </div>

        <main className="flex-1 p-6 bg-base-200 min-h-screen">
          {children}
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-40">
        <label htmlFor="drawer" className="drawer-overlay" />
        <aside className="w-64 min-h-screen bg-base-100 flex flex-col shadow-xl">
          {/* Logo */}
          <div className="p-6 border-b border-base-200">
            <div className="text-xl font-bold text-primary">💰 PayGateway</div>
            <div className="text-xs text-base-content/50 mt-1 truncate">{merchant?.email}</div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 p-4 space-y-1">
            {NAV.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-content"
                      : "hover:bg-base-200 text-base-content"
                  }`
                }
              >
                <span>{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Merchant info + logout */}
          <div className="p-4 border-t border-base-200">
            <div className="text-sm font-medium truncate">{merchant?.name}</div>
            <div className="text-xs text-base-content/50 mb-3 capitalize">{merchant?.status}</div>
            <button onClick={handleLogout} className="btn btn-sm btn-outline btn-error w-full">
              Logout
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
