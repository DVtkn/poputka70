"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, ShieldX, Clock, CheckCircle2, XCircle, Car, ChevronLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type VerificationItem = {
  id: string;
  carModel: string;
  carNumber: string;
  carColor: string | null;
  licensePhotoUrl: string;
  carPhotoUrl: string;
  verificationComment: string | null;
  createdAt: string;
  user: { id: string; login: string; firstName: string; lastName: string | null; phone: string | null; createdAt: string };
};

type Tab = "pending" | "approved" | "rejected";

export default function AdminVerificationsPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [data, setData] = useState<Record<Tab, VerificationItem[]>>({ pending: [], approved: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<VerificationItem | null>(null);
  const [modalAction, setModalAction] = useState<"APPROVE" | "REJECT" | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setError("");
      const res = await fetch("/api/admin/verifications");
      const d = await res.json();
      if (d.success) {
        setData({ pending: d.pending || [], approved: d.approved || [], rejected: d.rejected || [] });
      } else {
        setError(d.error || "Не удалось загрузить заявки");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const confirmAction = async () => {
    if (!modalItem || !modalAction) return;
    setActionLoading(modalItem.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/verifications/${modalItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverProfileId: modalItem.id, action: modalAction, comment }),
      });
      const d = await res.json();
      if (d.success) {
        setModalItem(null);
        setModalAction(null);
        setComment("");
        await fetchData();
      } else {
        setError(d.error || "Ошибка операции");
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setActionLoading(null);
    }
  };

  const currentList = data[tab];

  if (loading) {
    return (
      <div className="min-h-screen bg-snow">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="skeleton h-10 w-72 mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6">
                <div className="flex gap-4">
                  <div className="skeleton w-16 h-16 rounded-2xl" />
                  <div className="flex-1 space-y-3">
                    <div className="skeleton h-5 w-1/3" />
                    <div className="skeleton h-4 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-snow text-taiga">
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <Link href="/profile" className="inline-flex items-center gap-1.5 text-frost hover:text-river text-sm mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          В кабинет
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-8 h-8 text-river" strokeWidth={1.5} />
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-[-0.02em]">Модерация верификаций</h1>
          </div>
          <p className="text-frost">Проверка документов водителей и статус «Проверен»</p>
        </header>

        <div className="flex gap-1 mb-8 p-1 border border-fog rounded-xl bg-white w-fit" role="tablist" aria-label="Статусы верификации">
          {[
            { key: "pending" as Tab, label: "На проверке", icon: Clock, cls: "text-ember" },
            { key: "approved" as Tab, label: "Одобренные", icon: CheckCircle2, cls: "text-river" },
            { key: "rejected" as Tab, label: "Отклонённые", icon: XCircle, cls: "text-frost" },
          ].map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? "bg-river text-white shadow-sm" : "text-frost hover:text-taiga hover:bg-fog/50"
              }`}
            >
              <t.icon className={`w-4 h-4 ${tab === t.key ? "text-white" : t.cls}`} strokeWidth={1.5} />
              {t.label}
              <span className={`font-utility ${tab === t.key ? "text-white/80" : "text-frost"}`}>{data[t.key].length}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-ember/10 border border-ember/20 rounded-xl p-4 text-ember text-sm mb-6" role="alert">
            {error}
          </div>
        )}

        {currentList.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-fog/50 flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-frost" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-xl font-bold mb-1">
              {tab === "pending" ? "Пока нет заявок на проверке" : "В этой вкладке пусто"}
            </h3>
            <p className="text-frost text-sm">
              {tab === "pending" ? "Новые заявки водителей появятся здесь" : "Здесь будут карточки с решением"}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {currentList.map((item) => (
              <Card key={item.id} className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-5">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-river/10 flex items-center justify-center flex-shrink-0">
                      <Car className="w-7 h-7 text-river" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg">{item.user.firstName} {item.user.lastName || ""}</span>
                        <span className="text-sm text-frost">@{item.user.login}</span>
                      </div>
                      <div className="font-utility text-sm text-frost mt-0.5 truncate">
                        {item.carModel} • {item.carNumber} {item.carColor ? `• ${item.carColor}` : ""}
                      </div>
                      <div className="text-xs text-frost mt-0.5">Заявка от {new Date(item.createdAt).toLocaleString("ru-RU")}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={tab === "pending" ? "ember" : tab === "approved" ? "default" : "frost"}>
                      {tab === "pending" ? "На проверке" : tab === "approved" ? "Одобрено" : "Отклонено"}
                    </Badge>

                    {tab === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => { setModalItem(item); setModalAction("APPROVE"); setComment(""); }}
                          disabled={actionLoading === item.id}
                        >
                          <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
                          Одобрить
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => { setModalItem(item); setModalAction("REJECT"); setComment(""); }}>
                          <ShieldX className="w-4 h-4" strokeWidth={1.5} />
                          Отклонить
                        </Button>
                      </>
                    )}

                    {tab !== "pending" && item.verificationComment && (
                      <span className="text-xs text-frost max-w-[220px] truncate" title={item.verificationComment}>
                        {item.verificationComment}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-fog">
                  <div>
                    <div className="text-xs text-frost uppercase tracking-wider font-semibold mb-2">Водительское удостоверение</div>
                    <a href={item.licensePhotoUrl} target="_blank" rel="noopener noreferrer" className="block group">
                      <img
                        src={item.licensePhotoUrl}
                        alt="Водительское удостоверение"
                        className="w-full max-h-48 rounded-xl object-cover border border-fog group-hover:border-river/40 transition-colors"
                      />
                    </a>
                  </div>
                  <div>
                    <div className="text-xs text-frost uppercase tracking-wider font-semibold mb-2">Автомобиль</div>
                    <a href={item.carPhotoUrl} target="_blank" rel="noopener noreferrer" className="block group">
                      <img
                        src={item.carPhotoUrl}
                        alt="Фото автомобиля"
                        className="w-full max-h-48 rounded-xl object-cover border border-fog group-hover:border-river/40 transition-colors"
                      />
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={!!modalItem}
        onClose={() => { setModalItem(null); setModalAction(null); }}
        title={modalAction === "APPROVE" ? "Одобрить верификацию" : "Отклонить верификацию"}
        description={
          modalItem
            ? `${modalItem.user.firstName} ${modalItem.user.lastName || ""} • ${modalItem.carModel} ${modalItem.carNumber}`
            : ""
        }
        size="sm"
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-taiga">
            Комментарий (необязательно)
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={modalAction === "REJECT" ? "Укажи причину отказа — водитель увидит её" : "Например: документы в порядке"}
              rows={3}
              className="mt-2 w-full bg-white border border-fog rounded-xl px-4 py-3 text-sm text-taiga placeholder:text-frost focus:outline-none focus:border-river focus:ring-4 focus:ring-river/15"
            />
          </label>
          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              variant={modalAction === "APPROVE" ? "default" : "danger"}
              size="lg"
              loading={actionLoading === modalItem?.id}
              onClick={confirmAction}
            >
              {modalAction === "APPROVE" ? "Одобрить" : "Отклонить"}
            </Button>
            <Button className="flex-1" variant="secondary" size="lg" onClick={() => setModalItem(null)}>
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}