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
      <AppShell backHref="/" backLabel="На главную">
        <div className="max-w-md mx-auto text-center pt-8 md:pt-16">
          <div className="w-14 h-14 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h1 className="text-h3 mb-2">Нужен вход</h1>
          <p className="text-frost-dark mb-6">Войдите, чтобы опубликовать поездку</p>
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
      </AppShell>
    );
  }

  const isDriver = Boolean(user.driverProfile);

  return (
    <AppShell wide backHref="/" backLabel="На главную">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h1 className="text-h2">Опубликовать поездку</h1>

        {isDriver && user.driverProfile && (
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-fog">
            <Car className="w-5 h-5 text-river flex-shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <div className="text-sm">
              <span className="font-semibold text-taiga">{user.driverProfile.carModel}</span>
              <span className="text-fog mx-2">·</span>
              <span className="font-utility text-frost-dark">{user.driverProfile.carNumber}</span>
            </div>
          </div>
        )}
      </div>

      {!isDriver && <DriverRegistration onSuccess={refreshUser} />}
      {isDriver && <PublishTripForm onPublished={() => void refreshUser()} />}
    </AppShell>
  );
}
