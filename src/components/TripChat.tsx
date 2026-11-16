"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MessageSquare, Send, Car, Loader2 } from "lucide-react";
import AuthModal from "@/components/AuthModal";

interface ChatMessageItem {
  id: string;
  text: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string | null;
    isDriver: boolean;
    carModel: string | null;
  };
  isMine: boolean;
}

interface TripChatProps {
  tripId: string;
  initialUserId?: string | null;
  driverName?: string;
}

export default function TripChat({ tripId, initialUserId, driverName }: TripChatProps) {
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<"ok" | "unauthorized" | "forbidden">("ok");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialUserId ?? null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const reloadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}/messages`);
      if (res.status === 401) {
        setAuthStatus("unauthorized");
        return;
      }
      if (res.status === 403) {
        setAuthStatus("forbidden");
        return;
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setAuthStatus("ok");
        setMessages(data.messages);
        if (data.currentUserId) setCurrentUserId(data.currentUserId);
      }
    } catch {
      // мягкая обработка
    }
  }, [tripId]);

  useEffect(() => {
    let active = true;

    const loadInitial = async () => {
      try {
        const res = await fetch(`/api/trips/${tripId}/messages`);
        if (!active) return;
        if (res.status === 401) {
          setAuthStatus("unauthorized");
          return;
        }
        if (res.status === 403) {
          setAuthStatus("forbidden");
          return;
        }
        const data = await res.json();
        if (active && data.success && Array.isArray(data.messages)) {
          setAuthStatus("ok");
          setMessages(data.messages);
          if (data.currentUserId) setCurrentUserId(data.currentUserId);
        }
      } catch {
        // мягкая обработка
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadInitial();

    // Автообновление каждые 4 секунды, если вкладка активна и чат доступен
    const timer = setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible" &&
        authStatus === "ok"
      ) {
        void fetch(`/api/trips/${tripId}/messages`)
          .then((res) => {
            if (res.status === 401) {
              setAuthStatus("unauthorized");
              return null;
            }
            if (res.status === 403) {
              setAuthStatus("forbidden");
              return null;
            }
            return res.json();
          })
          .then((data) => {
            if (active && data?.success && Array.isArray(data.messages)) {
              setMessages(data.messages);
            }
          })
          .catch(() => 0);
      }
    }, 4000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [tripId, authStatus]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    if (!currentUserId) {
      setShowAuth(true);
      return;
    }

    setSending(true);
    setError(null);

    // Оптимистичное обновление
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessageItem = {
      id: tempId,
      text: trimmed,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUserId,
        firstName: "Ты",
        lastName: null,
        isDriver: false,
        carModel: null,
      },
      isMine: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");

    try {
      const res = await fetch(`/api/trips/${tripId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Не удалось отправить сообщение");
      }

      // Заменяем временное сообщение реальным
      setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
      scrollToBottom();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка отправки";
      setError(msg);
      // Откатываем оптимистичное сообщение
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tomsk",
      });
    } catch {
      return "";
    }
  };

  const quickPrompts = [
    "Привет! Где точнее встречаемся?",
    "Есть ли место в багажнике для сумки?",
    "Немного задерживаюсь, уже выхожу",
  ];

  return (
    <section id="chat" className="bg-white border border-fog rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 mb-4 border-b border-fog pb-3">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="w-4 h-4 text-river flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          <div>
            <h2 className="font-display font-semibold text-base text-taiga">Чат поездки</h2>
            {driverName && <p className="text-xs text-frost-dark">Водитель: {driverName}</p>}
          </div>
        </div>
        <span className="text-xs font-utility text-frost-dark">
          {messages.length} {messages.length === 1 ? "сообщение" : "сообщений"}
        </span>
      </div>

      {/* Окно сообщений */}
      <div className="h-64 overflow-y-auto space-y-3 pr-1 mb-4 flex flex-col scrollbar-thin">
        {authStatus === "forbidden" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <MessageSquare className="w-8 h-8 text-frost-dark mb-2 opacity-50" aria-hidden="true" />
            <p className="text-sm font-medium text-taiga mb-1">Чат только для участников поездки</p>
            <p className="text-xs text-frost-dark max-w-xs">
              Сообщения могут читать и отправлять водитель и пассажиры с подтверждённой или ожидающей бронью.
            </p>
          </div>
        ) : authStatus === "unauthorized" ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm font-medium text-taiga mb-2">Чат поездки</p>
            <p className="text-xs text-frost-dark mb-3">Войдите в систему, чтобы участвовать в чате поездки</p>
            <button
              type="button"
              onClick={() => setShowAuth(true)}
              className="btn-primary text-xs py-1.5 px-3"
            >
              Войти
            </button>
          </div>
        ) : loading && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-frost-dark text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-river" />
            Загрузка чата...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm font-medium text-taiga mb-3">Сообщений пока нет</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setText(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="text-xs bg-snow hover:bg-river-light border border-fog hover:border-river/40 text-taiga px-2.5 py-1.5 rounded-lg transition-colors text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.isMine;
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${
                  isMe ? "self-end items-end" : "self-start items-start"
                }`}
              >
                {!isMe && (
                  <div className="flex items-center gap-1.5 text-xs text-frost-dark mb-1 ml-1">
                    <span className="font-semibold text-taiga">
                      {m.sender.firstName} {m.sender.lastName || ""}
                    </span>
                    {m.sender.isDriver && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-river">
                        <Car className="w-3 h-3" aria-hidden="true" />
                        Водитель
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={`rounded-xl px-3.5 py-2 text-sm ${
                    isMe
                      ? "bg-river text-white"
                      : "bg-snow border border-fog text-taiga"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <span
                    className={`block text-[10px] text-right mt-1 font-utility ${
                      isMe ? "text-white/75" : "text-frost-dark"
                    }`}
                  >
                    {formatMessageTime(m.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="text-xs text-ember bg-ember/10 border border-ember/20 rounded-lg p-2.5 mb-3" role="alert">
          {error}
        </div>
      )}

      {/* Поле ввода */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={authStatus === "forbidden"}
          placeholder={
            authStatus === "forbidden"
              ? "Чат доступен участникам поездки с бронью"
              : currentUserId
                ? "Напиши сообщение (Enter для отправки)..."
                : "Войди, чтобы написать водителю..."
          }
          rows={2}
          maxLength={1000}
          className="w-full text-sm rounded-xl border border-fog p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-river/40 resize-none bg-snow disabled:opacity-50 disabled:bg-fog/30"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!text.trim() || sending || authStatus === "forbidden"}
          className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-river text-white disabled:opacity-30 hover:bg-river-dark transition-colors"
          title="Отправить (Enter)"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        onSuccess={() => {
          setShowAuth(false);
          void reloadMessages();
        }}
      />
    </section>
  );
}
