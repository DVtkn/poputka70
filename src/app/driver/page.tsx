"use client";

import { useEffect, useState } from "react";
import { Lock, Car } from "lucide-react";
import DriverRegistration from "@/components/DriverRegistration";
import PublishTripForm from "@/components/PublishTripForm";
import AuthModal from "@/components/AuthModal";
import AppShell from "@/components/AppShell";

type MeUser = {
  id: string;
  login: string;
  firstName: string;
  lastName: string | null;
  role: "PASSENGER" | "DRIVER" | "ADMIN";
  driverProfile: { carModel: string; carNumber: string; carColor: string | null } | null;
};

export default function DriverPage() {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        const me = (await meRes.json().catch(() => null)) as { success?: boolean; user?: MeUser } | null;
        if (!active) return;
        if (me?.success && me.user) setUser(me.user);
      } catch {
        /* мягкая деградация: формы покажут свои ошибки */
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json().catch(() => null)) as { success?: boolean; user?: MeUser } | null;
      if (data?.success && data.user) setUser(data.user);
    } catch {
      /* noop */
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-snow text-taiga px-4 py-8 flex items-center justify-center">
        <div className="skeleton w-32 h-8" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-snow text-taiga px-4 py-8">
        <div className="max-w-md mx-auto text-center pt-16">
          <div className="w-14 h-14 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h1 className="text-h3 mb-2">Нужен вход</h1>
          <p className="text-frost-dark mb-6">Войди, чтобы стать водителем</p>
          <button onClick={() => setShowAuth(true)} className="btn-primary inline-block px-6 py-3">
            Войти
          </button>
        </div>
        <AuthModal
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            void refreshUser();
          }}
        />
      </main>
    );
  }

  const isDriver = Boolean(user.driverProfile);

  return (
    <AppShell backHref="/" backLabel="На главную">
      <h1 className="text-h2 mb-2">Подвезти</h1>
      <p className="text-frost-dark text-sm mb-8">Опубликуй поездку — пассажиры попросят место, ты решишь, кого взять.</p>

      {isDriver && user.driverProfile && (
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-river flex items-center justify-center text-white flex-shrink-0">
              <Car className="w-7 h-7" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div>
              <div className="font-semibold text-lg">{user.driverProfile.carModel}</div>
              <div className="font-utility text-frost-dark">{user.driverProfile.carNumber}</div>
            </div>
          </div>
        </div>
      )}

      {!isDriver && <DriverRegistration onSuccess={refreshUser} />}
      {isDriver && <PublishTripForm onPublished={() => void refreshUser()} />}
    </AppShell>
  );
}
