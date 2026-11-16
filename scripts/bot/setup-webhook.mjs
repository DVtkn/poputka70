#!/usr/bin/env node
/**
 * Скрипт автоматической настройки Telegram-бота для Poputka70:
 * 1. Регистрация Webhook с секретным токеном.
 * 2. Установка кнопки WebApp (Mini App) в меню чата.
 * 3. Установка имени, описания, краткого био и команд бота (синхронизировано с public/bot/branding.json).
 * 4. Подсказка по загрузке готовой графики из public/bot/ в @BotFather.
 *
 * Запуск:
 *   node --env-file=.env scripts/bot/setup-webhook.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://poputka70.vercel.app";

if (!token) {
  console.error("❌ Ошибка: переменная TELEGRAM_BOT_TOKEN не задана в .env");
  process.exit(1);
}

const brandingPath = path.join(process.cwd(), "public", "bot", "branding.json");
const branding = JSON.parse(readFileSync(brandingPath, "utf-8"));
const webhookUrl = `${appUrl}/api/bot/telegram`;

async function callTelegram(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function setup() {
  console.log("🚀 Начинаем настройку Telegram-бота Попутка70...");
  console.log(`🌐 Webhook URL: ${webhookUrl}`);
  console.log(`📱 Mini App URL: ${appUrl}`);

  // 1. Установка Webhook
  const webhookData = await callTelegram("setWebhook", {
    url: webhookUrl,
    secret_token: secret || undefined,
    allowed_updates: ["message", "callback_query"],
  });
  if (webhookData.ok) {
    console.log("✅ Webhook успешно установлен!");
  } else {
    console.error("❌ Ошибка установки Webhook:", webhookData.description);
  }

  // 2. Установка кнопки WebApp (Menu Button)
  const menuData = await callTelegram("setChatMenuButton", {
    menu_button: {
      type: branding.profile.menuButton.type,
      text: branding.profile.menuButton.text,
      web_app: { url: appUrl },
    },
  });
  if (menuData.ok) {
    console.log("✅ Кнопка Mini App в левом нижнем углу меню настроена!");
  } else {
    console.warn("⚠️ Не удалось настроить Menu Button:", menuData.description);
  }

  // 3. Установка имени бота
  const nameData = await callTelegram("setMyName", {
    name: branding.profile.name,
  });
  if (nameData.ok) {
    console.log(`✅ Имя бота установлено: ${branding.profile.name}`);
  } else {
    console.warn("⚠️ Не удалось установить имя бота:", nameData.description);
  }

  // 4. Установка списка команд
  const commandsData = await callTelegram("setMyCommands", {
    commands: branding.profile.commands,
  });
  if (commandsData.ok) {
    console.log("✅ Команды бота (/start, /search, /recent, /help) зарегистрированы!");
  } else {
    console.warn("⚠️ Не удалось установить команды:", commandsData.description);
  }

  // 5. Описание бота (экран «Что умеет этот бот?» до нажатия Start)
  const descData = await callTelegram("setMyDescription", {
    description: branding.profile.description,
  });
  if (descData.ok) {
    console.log("✅ Описание бота (What can this bot do?) установлено!");
  } else {
    console.warn("⚠️ Не удалось установить описание:", descData.description);
  }

  // 6. Краткое описание (в профиле бота)
  const shortDescData = await callTelegram("setMyShortDescription", {
    short_description: branding.profile.shortDescription,
  });
  if (shortDescData.ok) {
    console.log("✅ Краткое описание (Bio профиля) установлено!");
  } else {
    console.warn("⚠️ Не удалось установить краткое описание:", shortDescData.description);
  }

  console.log("\n🎨 Готовая графика для загрузки в @BotFather:");
  console.log(`   • Аватарка (/setuserpic):       ${branding.assets.primaryAvatar.file} (512×512 PNG)`);
  console.log(`   • Обложка (/setdescriptionpic): ${branding.assets.descriptionCover.file} (640×360 PNG)`);
  console.log("\n🎉 Настройка завершена! Бот готов к работе.");
}

setup().catch((err) => {
  console.error("Фатальная ошибка настройки:", err);
  process.exit(1);
});
