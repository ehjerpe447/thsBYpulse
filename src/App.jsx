import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import BottomNav from './components/BottomNav.jsx';
import Pulse from './pages/Pulse.jsx';
import Ideas from './pages/Ideas.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Admin from './pages/Admin.jsx';

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="min-h-screen flex flex-col bg-brand-white">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 md:pb-10">
        <Routes>
          <Route path="/" element={<Navigate to="/pulse" replace />} />
          <Route path="/pulse" element={<Pulse />} />
          <Route path="/ideas" element={<Ideas />} />
          <Route path="/roadmap" element={<Roadmap />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/pulse" replace />} />
        </Routes>
      </main>
      {!isAdmin && <BottomNav />}
      <footer className="hidden md:block border-t border-brand-green/10 py-6 text-center text-xs text-brand-slate/60">
        TreeHouse Planning Pulse · Internal feedback platform · Anonymous by default
      </footer>
    </div>
  );
}
