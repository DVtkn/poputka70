"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bus, Car, Armchair } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<"passenger" | "driver" | null>(null);
  const [checked, setChecked] = useState(false);
  const [savedRole, setSavedRole] = useState<"passenger" | "driver" | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSavedRole(window.localStorage.getItem("userRole") as "passenger" | "driver" | null);
      setChecked(true);
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const handleRoleSelect = (selectedRole: "passenger" | "driver") => {
    setRole(selectedRole);
    localStorage.setItem("userRole", selectedRole);
  };

  const goToNext = () => {
    if (role === "driver") {
      router.push("/driver");
    } else {
      router.push("/");
    }
  };

  if (!checked) {
    return (
      <div className="min-h-screen bg-snow py-12 px-4 flex items-center justify-center">
        <div className="skeleton w-32 h-8"></div>
      </div>
    );
  }

  if (savedRole) {
    return (
      <div className="min-h-screen bg-snow py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            {savedRole === "driver"
              ? <Car className="w-7 h-7 text-river" strokeWidth={1.5} aria-hidden="true" />
              : <Bus className="w-7 h-7 text-river" strokeWidth={1.5} aria-hidden="true" />}
          </div>
          <h1 className="font-display text-2xl font-bold text-taiga mb-3">
            {savedRole === "driver" ? "Кабинет водителя" : "Лента поездок"}
          </h1>
          <p className="text-frost mb-6">Перенаправляем...</p>
          <Button onClick={() => {
            if (savedRole === "driver") {
              router.push("/driver");
            } else {
              router.push("/");
            }
          }} className="w-full">
            {savedRole === "driver" ? "В кабинет водителя" : "На главную"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-snow py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-taiga mb-3">Добро пожаловать в Попутка70!</h1>
          <p className="text-frost">Кто ты сегодня?</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card
            variant="outlined"
            className="cursor-pointer p-6 hover:bg-fog/50 transition-colors"
            onClick={() => handleRoleSelect("passenger")}
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-3">
                <Armchair className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-1">Пассажир</h3>
              <p className="text-sm text-frost">Ищу поездку, хочу сэкономить</p>
            </div>
          </Card>

          <Card
            variant="outlined"
            className="cursor-pointer p-6 hover:bg-fog/50 transition-colors"
            onClick={() => handleRoleSelect("driver")}
          >
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-3">
                <Car className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-1">Водитель</h3>
              <p className="text-sm text-frost">Еду сам, могу взять попутчиков</p>
            </div>
          </Card>
        </div>

        <Button className="w-full mt-6" onClick={goToNext} disabled={!role}>
          Продолжить
        </Button>
      </div>
    </div>
  );
}