"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Car, Armchair } from "lucide-react";

type Role = "passenger" | "driver";

const OPTIONS: Array<{ value: Role; title: string; description: string; icon: typeof Car }> = [
  { value: "passenger", title: "Я пассажир", description: "Ищу поездки и хочу сэкономить", icon: Armchair },
  { value: "driver", title: "Я водитель", description: "Еду сам и могу взять попутчиков", icon: Car },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [savedRole, setSavedRole] = useState<Role | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("userRole");
    const finish = () => {
      if (saved === "passenger" || saved === "driver") setSavedRole(saved);
      setChecked(true);
    };
    const timeout = window.setTimeout(finish, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const go = (nextRole: Role) => {
    try {
      window.localStorage.setItem("userRole", nextRole);
    } catch {
      /* приватный режим — не критично */
    }
    router.push(nextRole === "driver" ? "/driver" : "/");
  };

  const choose = (nextRole: Role) => {
    setRole(nextRole);
    go(nextRole);
  };

  if (!checked) {
    return (
      <div className="min-h-screen bg-snow py-12 px-4 flex items-center justify-center">
        <div className="skeleton w-32 h-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-snow py-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-taiga mb-3">
            Добро пожаловать в Попутка70!
          </h1>
          <p className="text-frost-dark">
            {savedRole ? "Можно продолжить или выбрать другой режим" : "Кто ты сегодня?"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Выбор роли">
          {OPTIONS.map((option) => {
            const active = (role ?? savedRole) === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(option.value)}
                className={`card p-6 text-center transition-all min-h-[44px] ${
                  active ? "border-river ring-2 ring-river/20" : "hover:border-river/40"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-3">
                  <option.icon className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
                </div>
                <h2 className="font-display text-lg font-semibold mb-1">{option.title}</h2>
                <p className="text-sm text-frost-dark leading-snug">{option.description}</p>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-frost-dark mt-6">
          Режим влияет только на подсказки в интерфейсе — водителем можно стать в любой момент
        </p>
      </div>
    </div>
  );
}
