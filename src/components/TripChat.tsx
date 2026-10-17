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
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
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
        const data = await res.json();
        if (active && data.success && Array.isArray(data.messages)) {
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

    // Автообновление каждые 4 секунды, если вкладка активна
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void fetch(`/api/trips/${tripId}/messages`)
          .then((res) => res.json())
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
  }, [tripId]);

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
    "👋 Привет! Где точнее встречаемся?",
    "🧳 Есть ли место в багажнике для сумки?",
    "⏳ Немного задерживаюсь, уже бегу!",
  ];

  return (
    <section id="chat" className="card p-5 mt-6 border-fog">
      <div className="flex items-center justify-between gap-3 mb-4 border-b border-fog/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-river/10 text-river flex items-center justify-center">
            <MessageSquare className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-base">Чат поездки</h2>
            <p className="text-xs text-frost-dark">
              Вопросы водителю и координация посадки
            </p>
          </div>
        </div>
        <span className="text-xs font-utility px-2.5 py-1 rounded-full bg-snow border border-fog text-frost-dark">
          {messages.length} {messages.length === 1 ? "сообщение" : "сообщений"}
        </span>
      </div>

      {/* Окно сообщений */}
      <div className="h-64 overflow-y-auto space-y-3 pr-1 mb-4 flex flex-col scrollbar-thin">
        {loading && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-frost-dark text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-river" />
            Загрузка чата...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <p className="text-sm font-medium text-taiga mb-1">Пока сообщений нет</p>
            <p className="text-xs text-frost-dark max-w-xs mb-3">
              Напиши водителю{driverName ? ` (${driverName})` : ""}, чтобы уточнить место встречи, ориентиры или багаж.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setText(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="text-xs bg-snow hover:bg-river/10 border border-fog hover:border-river/30 text-taiga px-2.5 py-1 rounded-full transition-colors text-left"
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
                      <span className="badge-birch text-[10px] py-0 px-1.5">
                        <Car className="w-2.5 h-2.5" />
                        Водитель
                      </span>
                    )}
                  </div>
                )}

                <div
                  className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    isMe
                      ? "bg-river text-white rounded-br-xs"
                      : "bg-snow border border-fog text-taiga rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <span
                    className={`block text-[10px] text-right mt-1 ${
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
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
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
          placeholder={
            currentUserId
              ? "Напиши сообщение (Enter для отправки)..."
              : "Войди, чтобы написать водителю..."
          }
          rows={2}
          maxLength={1000}
          className="w-full text-sm rounded-xl border border-fog p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-river/40 resize-none bg-snow"
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!text.trim() || sending}
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
