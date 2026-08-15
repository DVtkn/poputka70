"use client";

import { useEffect, useState } from "react";
import { Bell, Ticket, Car, CreditCard, Clock, Star, AlertTriangle, CheckCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  relatedEntityId?: string;
};

const TYPE_ICONS: Array<[string, typeof Bell]> = [
  ["BOOKING", Ticket],
  ["TRIP", Car],
  ["PAYMENT", CreditCard],
  ["CONFIRMATION", Clock],
  ["REVIEW", Star],
  ["COMPLAINT", AlertTriangle],
];

function NotificationIcon({ type }: { type: string }) {
  const pair = TYPE_ICONS.find(([key]) => type.includes(key));
  const Icon = pair ? pair[1] : Bell;
  return (
    <div className="w-10 h-10 rounded-xl bg-river-light flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-river" strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch (e) {
        if (!cancelled) console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: ids, read: true }),
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length) markAsRead(unreadIds);
  };

  if (loading) {
    return (
      <AppShell backHref="/profile" backLabel="В профиль">
        <div className="skeleton h-10 w-48 mb-8" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 w-full" />)}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell backHref="/profile" backLabel="В профиль">
      <header className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em]">Уведомления</h1>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
            Прочитать все ({unreadCount})
          </Button>
        )}
      </header>

      {notifications.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-river-light flex items-center justify-center mx-auto mb-4">
            <Bell className="w-6 h-6 text-river" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">Уведомлений нет</h3>
          <p className="text-frost">Когда появятся новые — они будут здесь</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={`p-5 ${n.read ? "opacity-70" : "border-river/30"}`}>
              <div className="flex items-start gap-3">
                <NotificationIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{n.title}</h3>
                  <p className="text-sm text-frost mt-1">{n.body}</p>
                  <p className="text-xs text-frost mt-2">{new Date(n.createdAt).toLocaleString("ru-RU")}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markAsRead([n.id])}
                    className="p-1 rounded-lg text-frost hover:text-river hover:bg-fog transition-colors"
                    aria-label="Отметить как прочитанное"
                  >
                    <CheckCheck className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}