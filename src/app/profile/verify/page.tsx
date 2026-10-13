"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { apiError } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";

function FileUpload({
  label,
  field,
  accept = "image/*",
  preview,
  onChange,
  onRemove,
  required,
}: {
  label: string;
  field: "license" | "car";
  accept?: string;
  preview: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-taiga mb-2">{label} {required && <span className="text-ember">*</span>}</label>
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={onChange}
          className="sr-only"
          id={field}
          required={required}
        />
        <label
          htmlFor={field}
          className={`
            flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all
            ${preview ? "border-birch bg-birch/5" : "border-fog hover:border-river hover:bg-snow"}
          `}
        >
          {preview ? (
            <div className="relative w-full max-w-xs">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URL, не оптимизируется next/image */}
              <img src={preview} alt={label} className="w-full rounded-xl object-cover" width={320} height={240} />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute top-2 right-2 p-1 bg-taiga/80 text-white rounded-full hover:bg-taiga transition-colors"
                aria-label="Удалить"
              >
                <X className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-frost mb-3" strokeWidth={1.5} aria-hidden="true" />
              <span className="text-frost-dark">Нажмите или перетащите фото</span>
              <span className="text-xs text-frost-dark mt-1">JPEG, PNG, WebP до 1.5 МБ (суммарно до 3 МБ)</span>
            </>
          )}
        </label>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "success">("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState({ license: null as File | null, car: null as File | null });
  const [previews, setPreviews] = useState({ license: "", car: "" });

  const handleFileChange = (field: "license" | "car", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      setError("Файл не должен превышать 1.5 МБ — сожми фото и попробуй снова");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Только JPEG, PNG или WebP");
      return;
    }

    setError("");
    setFiles((prev) => ({ ...prev, [field]: file }));
    setPreviews((prev) => ({ ...prev, [field]: URL.createObjectURL(file) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.license || !files.car) {
      setError("Загрузите оба фото");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("licensePhoto", files.license);
    formData.append("carPhoto", files.car);

    try {
      const res = await fetch("/api/driver/verify", { method: "POST", body: formData });
      if (res.status === 413) {
        setError("Фото слишком большие. Сожми снимки и попробуй снова.");
        return;
      }
      const data = (await res.json().catch(() => null)) as { success?: boolean } | null;

      if (!res.ok || !data?.success) {
        setError(apiError(data, "Ошибка загрузки").message);
        return;
      }

      setStep("success");
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-snow py-12 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-birch/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-birch" strokeWidth={2} aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl font-bold text-taiga mb-3">Документы отправлены</h1>
          <p className="text-frost-dark mb-8">
            Наша команда проверит их в течение 24 часов. Вы получите уведомление о результате.
          </p>
          <Link href="/profile" className="btn-primary inline-block px-8 py-3">
            В кабинет
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-snow py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <Link href="/profile" className="inline-flex items-center gap-1 text-frost hover:text-taiga text-sm mb-6 transition-colors">
            ← Назад в кабинет
          </Link>
          <h1 className="font-display text-3xl font-bold text-taiga mb-2">Верификация водителя</h1>
          <p className="text-frost-dark">
            Загрузите фото водительского удостоверения и автомобиля. После проверки вы получите бейдж
            <span className="badge-birch ml-1">Проверен</span> и больше доверия от пассажиров.
          </p>
        </header>

        <Card className="p-6">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-ember/10 text-ember text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FileUpload
                label="Водительское удостоверение"
                field="license"
                preview={previews.license}
                onChange={(e) => handleFileChange("license", e)}
                onRemove={() => {
                  setFiles((prev) => ({ ...prev, license: null }));
                  setPreviews((prev) => ({ ...prev, license: "" }));
                }}
                required
              />
              <FileUpload
                label="Автомобиль (сбоку, виден номер)"
                field="car"
                preview={previews.car}
                onChange={(e) => handleFileChange("car", e)}
                onRemove={() => {
                  setFiles((prev) => ({ ...prev, car: null }));
                  setPreviews((prev) => ({ ...prev, car: "" }));
                }}
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-fog">
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Отмена
              </Button>
              <Button type="submit" className="flex-1" loading={loading}>
                Отправить на проверку
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}