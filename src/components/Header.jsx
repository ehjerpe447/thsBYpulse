import { Link, NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const navItems = [
  { to: '/pulse', label: 'Daily Pulse' },
  { to: '/ideas', label: 'Idea Lab' },
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/changelog', label: 'Changelog' },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-brand-white/85 backdrop-blur border-b border-brand-green/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/pulse" className="flex items-center gap-3">
          <img
            src="/treehouse-foods-logo.png"
            alt="TreeHouse Foods"
            className="h-7 w-auto"
          />
          <span className="hidden sm:flex items-center gap-3">
            <span className="h-6 w-px bg-brand-slate/20" aria-hidden="true" />
            <span className="text-[11px] uppercase tracking-[0.12em] text-brand-slate/60">
              Planning Pulse
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-green/10 text-brand-green'
                    : 'text-brand-slate hover:text-brand-green hover:bg-brand-green/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-slate/70 hover:text-brand-green transition"
        >
          <ShieldCheck size={14} />
          Admin
        </Link>
      </div>
    </header>
  );
}
