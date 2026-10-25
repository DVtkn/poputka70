"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";

interface StopSuggestion {
  id: string;
  name: string;
  address: string | null;
  isPopular: boolean;
  kind: "stop" | "point";
  lat: number;
  lng: number;
}

/**
 * Комбобокс остановок: подсказки из справочника (768 остановок Томска),
 * популярные — первыми. Значение полностью контролируется родителем,
 * поэтому свободный ввод тоже работает: поиск сопоставляет названия неточно.
 */
export interface StopSelection {
  name: string;
  lat: number;
  lng: number;
}

const stopsCache = new Map<string, StopSuggestion[]>();

export default function StopCombobox({
  id,
  label,
  value,
  onChange,
  onSelect,
  placeholder,
  autoFocus,
  labelRight,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (selection: StopSelection) => void;
  placeholder?: string;
  autoFocus?: boolean;
  labelRight?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<StopSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const queryKey = value.trim().toLowerCase();
  const cached = stopsCache.get(queryKey);
  const displayedOptions = cached ?? options;

  useEffect(() => {
    if (!open) return;

    const key = value.trim().toLowerCase();
    if (stopsCache.has(key)) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/stops?query=${encodeURIComponent(value.trim())}&limit=10`, {
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as { success?: boolean; stops?: StopSuggestion[] } | null;
        if (data?.success) {
          const list = data.stops ?? [];
          stopsCache.set(key, list);
          setOptions(list);
        }
      } catch {
        /* запрос отменён или сеть недоступна — оставляем прежние подсказки */
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value, open]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("touchstart", onDocumentClick);
    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("touchstart", onDocumentClick);
    };
  }, []);

  const choose = (option: StopSuggestion) => {
    onChange(option.name);
    onSelect?.({ name: option.name, lat: option.lat, lng: option.lng });
    setOpen(false);
    setHighlighted(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, displayedOptions.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    }
    if (event.key === "Enter" && highlighted >= 0 && displayedOptions[highlighted]) {
      event.preventDefault();
      choose(displayedOptions[highlighted]);
    }
    if (event.key === "Escape") setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="block text-xs font-medium text-frost-dark">
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-frost pointer-events-none">
          <MapPin className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-activedescendant={highlighted >= 0 && displayedOptions[highlighted] ? `${id}-option-${highlighted}` : undefined}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          className="input pl-12 pr-10"
        />
        {loading && (
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-river border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
        {value && !loading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
              setOpen(true);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-frost-dark hover:text-taiga hover:bg-fog/60 transition-colors"
            aria-label={`Очистить поле ${label.toLowerCase()}`}
          >
            <X className="w-3.5 h-3.5" strokeWidth={2.2} />
          </button>
        )}
      </div>

      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label={`Подсказки: ${label}`}
          className="absolute z-30 mt-1 w-full max-h-56 sm:max-h-72 overflow-auto rounded-xl border border-fog bg-white shadow-lg"
        >
          {displayedOptions.length === 0 && !loading && (
            <li className="px-4 py-3 text-sm text-frost-dark">
              Ничего не нашлось. Попробуй другое название или адрес.
            </li>
          )}
          {displayedOptions.map((option, index) => (
            <li
              key={option.id}
              id={`${option.id}`}
              role="option"
              aria-selected={index === highlighted}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onTouchEnd={(event) => {
                event.preventDefault();
                choose(option);
              }}
              onMouseEnter={() => setHighlighted(index)}
              className={`px-4 py-2.5 cursor-pointer text-sm flex items-center justify-between gap-3 ${
                index === highlighted ? "bg-river-light" : ""
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-taiga">{option.name}</span>
                {option.address && (
                  <span className="block truncate text-xs text-frost-dark">{option.address}</span>
                )}
              </span>
              {option.kind === "point" ? (
                <span className="badge badge-frost shrink-0">ориентир</span>
              ) : option.isPopular ? (
                <span className="badge badge-river shrink-0">популярная</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
