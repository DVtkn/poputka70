"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface StopSuggestion {
  id: string;
  name: string;
  address: string | null;
  isPopular: boolean;
}

/**
 * Комбобокс остановок: подсказки из справочника (768 остановок Томска),
 * популярные — первыми. Значение полностью контролируется родителем,
 * поэтому свободный ввод тоже работает: поиск сопоставляет названия неточно.
 */
export default function StopCombobox({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<StopSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/stops?query=${encodeURIComponent(value.trim())}&limit=10`, {
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as { success?: boolean; stops?: StopSuggestion[] } | null;
        if (data?.success) setOptions(data.stops ?? []);
      } catch {
        /* запрос отменён или сеть недоступна — оставляем прежние подсказки */
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value, open]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const choose = (name: string) => {
    onChange(name);
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
      setHighlighted((prev) => Math.min(prev + 1, options.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    }
    if (event.key === "Enter" && highlighted >= 0 && options[highlighted]) {
      event.preventDefault();
      choose(options[highlighted].name);
    }
    if (event.key === "Escape") setOpen(false);
  };

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="block text-xs font-medium text-frost-dark mb-1.5">
        {label}
      </label>
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
          aria-activedescendant={highlighted >= 0 && options[highlighted] ? `${id}-option-${highlighted}` : undefined}
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
          className="input pl-12"
        />
        {loading && (
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-river border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        )}
      </div>

      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label={`Подсказки: ${label}`}
          className="absolute z-30 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-fog bg-white shadow-lg"
        >
          {options.length === 0 && !loading && (
            <li className="px-4 py-3 text-sm text-frost-dark">
              Ничего не нашлось. Попробуй другое название или адрес.
            </li>
          )}
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`${option.id}`}
              role="option"
              aria-selected={index === highlighted}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option.name);
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
              {option.isPopular && <span className="badge badge-river shrink-0">популярная</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
