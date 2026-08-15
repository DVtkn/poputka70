"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import { LogOut } from "lucide-react";

export default function UserGreeting() {
  const [user, setUser] = useState<{ firstName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  const loadUser = () => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.success) setUser(d.user); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUser(); }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-between mb-8">
        <div className="skeleton w-28 h-8 rounded-xl" />
        <div className="skeleton w-24 h-10 rounded-xl" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-tight bg-gradient-to-r from-river to-taiga bg-clip-text text-transparent"
        >
          Попутка70
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/profile"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full border border-fog"
          >
            <div className="avatar avatar-sm">{user.firstName.charAt(0)}</div>
            <span className="text-sm font-semibold hidden md:block">{user.firstName}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-frost hover:text-taiga transition-colors p-2 rounded-lg hover:bg-fog/50"
            aria-label="Выйти"
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-tight bg-gradient-to-r from-river to-taiga bg-clip-text text-transparent"
        >
          Попутка70
        </Link>
        <button
          onClick={() => setShowAuth(true)}
          className="btn-primary px-6 py-2.5 text-sm"
        >
          Войти
        </button>
      </div>
      <AuthModal
        isOpen={showAuth}
        onClose={() => { setShowAuth(false); loadUser(); }}
      />
    </>
  );
}