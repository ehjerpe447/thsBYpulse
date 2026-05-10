import { NavLink } from 'react-router-dom';
import { Activity, Lightbulb, Map } from 'lucide-react';

const items = [
  { to: '/pulse', label: 'Pulse', Icon: Activity },
  { to: '/ideas', label: 'Ideas', Icon: Lightbulb },
  { to: '/roadmap', label: 'Roadmap', Icon: Map },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-brand-green/10 bg-brand-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-3">
        {items.map(({ to, label, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition ${
                  isActive ? 'text-brand-green' : 'text-brand-slate/70 hover:text-brand-green'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
