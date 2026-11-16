export type TelegramChatId = number | string;

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][];
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramMessageEntity {
  type:
    | "mention"
    | "hashtag"
    | "cashtag"
    | "bot_command"
    | "url"
    | "email"
    | "phone_number"
    | "bold"
    | "italic"
    | "underline"
    | "strikethrough"
    | "spoiler"
    | "blockquote"
    | "expandable_blockquote"
    | "code"
    | "pre"
    | "text_link"
    | "text_mention"
    | "custom_emoji"
    | "bank_card_number";
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
  custom_emoji_id?: string;
}

export interface TelegramWidgetQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  widget_id?: string;
  data?: string;
  chat_instance?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  widget_query?: TelegramWidgetQuery;
}

export interface SendMessageOptions {
  parse_mode?: "MarkdownV2" | "HTML";
  entities?: TelegramMessageEntity[];
  reply_markup?: TelegramInlineKeyboardMarkup;
  disable_web_page_preview?: boolean;
}

export interface SendWidgetOptions {
  caption?: string;
  reply_markup?: TelegramInlineKeyboardMarkup;
  data?: string | Record<string, unknown>;
  fallbackText?: string;
}

export interface SendWidgetResult {
  ok: boolean;
  message_id?: number;
  fallbackUsed?: boolean;
  error?: string;
}

export interface TelegramSafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TelegramBackButton {
  isVisible: boolean;
  show: () => TelegramBackButton;
  hide: () => TelegramBackButton;
  onClick: (callback: () => void) => TelegramBackButton;
  offClick: (callback: () => void) => TelegramBackButton;
}

export type TelegramHapticImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";
export type TelegramHapticNotificationType = "error" | "success" | "warning";

export interface TelegramHapticFeedback {
  impactOccurred: (style: TelegramHapticImpactStyle) => TelegramHapticFeedback;
  notificationOccurred: (type: TelegramHapticNotificationType) => TelegramHapticFeedback;
  selectionChanged: () => TelegramHapticFeedback;
}

export type TelegramHomeScreenStatus = "unsupported" | "unknown" | "added" | "missed";

export interface TelegramInitDataUnsafe {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: TelegramChat;
  start_param?: string;
  auth_date?: number;
  hash?: string;
  [key: string]: unknown;
}

export interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  isFullscreen?: boolean;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  BackButton?: TelegramBackButton;
  HapticFeedback?: TelegramHapticFeedback;
  addToHomeScreen?: () => void;
  checkHomeScreenStatus?: (callback: (status: TelegramHomeScreenStatus) => void) => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  onEvent?: (eventType: string, eventHandler: (...args: unknown[]) => void) => void;
  offEvent?: (eventType: string, eventHandler: (...args: unknown[]) => void) => void;
  initData?: string;
  initDataUnsafe?: TelegramInitDataUnsafe;
  themeParams?: Record<string, string>;
  isExpanded?: boolean;
  viewportHeight?: number;
  viewportStableHeight?: number;
  headerColor?: string;
  backgroundColor?: string;
  version?: string;
  platform?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}
