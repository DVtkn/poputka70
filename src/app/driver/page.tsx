"use client";

import { useEffect, useState } from "react";
import { Lock, Car } from "lucide-react";
import DriverRegistration from "@/components/DriverRegistration";
import CreateRoute from "@/components/CreateRoute";
import AuthModal from "@/components/AuthModal";
import AppShell from "@/components/AppShell";

type CityPoint = { id: string; name: string };

type MeUser = {
  id: string;
  login: string;
  firstName: string;
  lastName: string | null;
  role: "PASSENGER" | "DRIVER";
  driverProfile: { carModel: string; carNumber: string; carColor: string | null } | null;
};

export default function DriverPage() {
  const [points, setPoints] = useState<CityPoint[]>([]);
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUser(data.user);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    fetch("/api/city-points")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPoints(data.points || []);
      })
      .catch(console.error);
  }, []);

  const handleRegistrationSuccess = async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    if (data.success) setUser(data.user);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-snow text-taiga px-4 py-8 flex items-center justify-center">
        <div className="skeleton w-32 h-8"></div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-snow text-taiga px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="w-14 h-14 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Нужен вход</h1>
          <p className="text-frost mb-6">Войди, чтобы стать водителем</p>
          <button onClick={() => setShowAuth(true)} className="btn-primary inline-block px-6 py-3">
            Войти
          </button>
        </div>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </main>
    );
  }

  const isDriver = user.role === "DRIVER" && user.driverProfile;

  return (
    <AppShell backHref="/" backLabel="На главную">
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em] mb-8">Кабинет водителя</h1>

      {isDriver && user.driverProfile && (
        <div className="card p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-river flex items-center justify-center text-white">
              <Car className="w-7 h-7" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <div>
              <div className="font-semibold text-lg">{user.driverProfile.carModel}</div>
              <div className="font-utility text-frost">{user.driverProfile.carNumber}</div>
            </div>
          </div>
        </div>
      )}

      {!isDriver && <DriverRegistration onSuccess={handleRegistrationSuccess} />}
      {isDriver && <CreateRoute points={points} onSuccess={() => {}} />}
    </AppShell>
  );
}