#!/usr/bin/env node
/**
 * Скрипт автоматической настройки Telegram-бота для Poputka70:
 * 1. Регистрация Webhook с секретным токеном.
 * 2. Установка кнопки WebApp (Mini App) в меню чата.
 * 3. Настройка команд бота (/start, /search, /recent, /help).
 *
 * Запуск:
 *   node --env-file=.env scripts/bot/setup-webhook.mjs
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://poputka70.vercel.app";

if (!token) {
  console.error("❌ Ошибка: переменная TELEGRAM_BOT_TOKEN не задана в .env");
  process.exit(1);
}

const webhookUrl = `${appUrl}/api/bot/telegram`;

async function setup() {
  console.log("🚀 Начинаем настройку Telegram бота Poputka70...");
  console.log(`🌐 Webhook URL: ${webhookUrl}`);
  console.log(`📱 Mini App URL: ${appUrl}`);

  // 1. Установка Webhook
  const webhookRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret || undefined,
      allowed_updates: ["message", "callback_query"],
    }),
  });
  const webhookData = await webhookRes.json();
  if (webhookData.ok) {
    console.log("✅ Webhook успешно установлен!");
  } else {
    console.error("❌ Ошибка установки Webhook:", webhookData.description);
  }

  // 2. Установка кнопки WebApp (Menu Button)
  const menuRes = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      menu_button: {
        type: "web_app",
        text: "Попутка70",
        web_app: { url: appUrl },
      },
    }),
  });
  const menuData = await menuRes.json();
  if (menuData.ok) {
    console.log("✅ Кнопка Mini App в левом нижнем углу меню настроена!");
  } else {
    console.warn("⚠️ Не удалось настроить Menu Button:", menuData.description);
  }

  // 3. Установка списка команд
  const commandsRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      commands: [
        { command: "start", description: "Главное меню и поиск" },
        { command: "search", description: "Найти попутку по маршруту" },
        { command: "recent", description: "Ближайшие опубликованные рейсы" },
        { command: "help", description: "О сервисе и поддержка" },
      ],
    }),
  });
  const commandsData = await commandsRes.json();
  if (commandsData.ok) {
    console.log("✅ Команды бота (/start, /search, /recent, /help) зарегистрированы!");
  }

  console.log("\n🎉 Настройка завершена! Бот готов к работе.");
}

setup().catch((err) => {
  console.error("Фатальная ошибка настройки:", err);
  process.exit(1);
});
