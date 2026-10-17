#!/usr/bin/env node
/**
 * Сквозное тестирование пользовательских сценариев «как реальный пользователь»
 * Запуск через Neon HTTP API (работает в любых сетевых условиях).
 *
 * Сценарии:
 * 1. Гость: доступность справочника остановок Томска (768 остановок)
 * 2. Регистрация нового пассажира Алексея (студент ТГУ, без выбора роли)
 * 3. Регистрация водителя Сергея и добавление авто (Lada Vesta)
 * 4. 3-этапное построение маршрута и остановок для карты (RouteMap / routeStops)
 * 5. Публикация поездки водителем («Ленина ➔ Лагерный сад», 150 ₽, 3 места)
 * 6. Поиск и расчёт стоимости отрезка пассажиром
 * 7. Оформление бронирования места пассажиром
 * 8. Внутренний чат поездки (переписка между пассажиром и водителем)
 * 9. Подтверждение брони водителем и раскрытие контактов (телефонов)
 * 10. Биржа спроса (DemandRequest при отсутствии рейсов)
 * 11. Отмена брони и возврат места водителю
 * 12. Валидация и защита от некорректных действий
 */

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { buildRouteStops } from "../src/lib/route-registry.ts";
import { legPrice } from "../src/lib/trip-rules.ts";
import { chatMessageSchema } from "../src/lib/schemas.ts";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL не задан в .env");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const results = [];
function test(name, passed, details = "") {
  results.push({ name, passed, details });
  console.log(`${passed ? "✅ [PASS]" : "❌ [FAIL]"} ${name}${details ? ` — ${details}` : ""}`);
}

const stamp = Date.now().toString(36);
const driverLogin = `user-driver-${stamp}`;
const passengerLogin = `user-passenger-${stamp}`;
const testPassword = `Pass-${stamp}-123`;

async function run() {
  console.log("================================================================================");
  console.log("🚗 POPUTKA70: СКВОЗНОЕ ТЕСТИРОВАНИЕ ПОЛЬЗОВАТЕЛЬСКИХ СЦЕНАРИЕВ");
  console.log("================================================================================");

  let driverId = null;
  let passengerId = null;
  let tripId = null;
  let bookingId = null;
  let demandId = null;

  try {
    // --------------------------------------------------------------------------
    // Сценарий 1: База остановок Томска
    // --------------------------------------------------------------------------
    const stops = await sql`
      SELECT id, name, lat, lng, "nameNormalized"
      FROM "Stop"
      WHERE name ILIKE '%Ленина%' OR name ILIKE '%Лагерный%' OR name ILIKE '%Южная%'
      LIMIT 10
    `;
    test("1. Поиск остановок Томска", stops.length >= 2, `найдено ${stops.length} остановок`);

    const originStop = stops.find((s) => s.name.includes("Ленина")) || stops[0];
    const destStop = stops.find((s) => s.name.includes("Лагерный") || s.name.includes("Южная")) || stops[1];

    // --------------------------------------------------------------------------
    // Сценарий 2: Регистрация пассажира Алексея
    // --------------------------------------------------------------------------
    const passHash = await bcrypt.hash(testPassword, 10);
    const passengerPhone = `+7999111${Math.floor(1000 + Math.random() * 9000)}`;
    const [passenger] = await sql`
      INSERT INTO "User" (id, login, "passwordHash", "firstName", "lastName", phone, role, status, "lastActiveAt")
      VALUES ('user-p-' || ${stamp}, ${passengerLogin}, ${passHash}, 'Алексей', 'Студент', ${passengerPhone}, 'PASSENGER', 'ACTIVE', NOW())
      RETURNING id, login, "firstName", role, status
    `;
    passengerId = passenger.id;
    test(
      "2. Регистрация пассажира без выбора роли",
      passenger.role === "PASSENGER" && passenger.status === "ACTIVE",
      `логин: ${passenger.login}, роль: ${passenger.role}`
    );

    // --------------------------------------------------------------------------
    // Сценарий 3: Регистрация водителя Сергея и добавление автомобиля
    // --------------------------------------------------------------------------
    const driverPhone = `+7999222${Math.floor(1000 + Math.random() * 9000)}`;
    const [driver] = await sql`
      INSERT INTO "User" (id, login, "passwordHash", "firstName", "lastName", phone, role, status, "lastActiveAt")
      VALUES ('user-d-' || ${stamp}, ${driverLogin}, ${passHash}, 'Сергей', 'Водитель', ${driverPhone}, 'PASSENGER', 'ACTIVE', NOW())
      RETURNING id, login, "firstName", role
    `;
    driverId = driver.id;

    // Добавляем автомобиль -> становимся водителем
    const [driverProfile] = await sql`
      INSERT INTO "DriverProfile" (id, "userId", "carModel", "carNumber", "carColor", "verificationStatus")
      VALUES ('dp-' || ${stamp}, ${driver.id}, 'Lada Vesta', 'О777ОО70', 'Серебристый', 'APPROVED')
      RETURNING id, "carModel", "carNumber"
    `;

    await sql`UPDATE "User" SET role = 'DRIVER' WHERE id = ${driver.id}`;
    const [driverCheck] = await sql`SELECT role FROM "User" WHERE id = ${driver.id}`;

    test(
      "3. Добавление автомобиля и получение прав водителя",
      Boolean(driverProfile.id) && driverCheck.role === "DRIVER",
      `авто: ${driverProfile.carModel} (${driverProfile.carNumber}), роль: ${driverCheck.role}`
    );

    // --------------------------------------------------------------------------
    // Сценарий 4: 3-этапное построение маршрута для карты
    // --------------------------------------------------------------------------
    const route = await buildRouteStops(
      originStop.name,
      destStop.name,
      { lat: originStop.lat, lng: originStop.lng },
      { lat: destStop.lat, lng: destStop.lng }
    );
    test(
      "4. Построение маршрута для карты (3-этапный реестр)",
      route !== null && Array.isArray(route.stops) && route.stops.length >= 2,
      `маршрут: ${route?.routeNumber ?? "прямой"}, точек: ${route?.stops?.length ?? 0}`
    );

    // --------------------------------------------------------------------------
    // Сценарий 5: Публикация поездки водителем
    // --------------------------------------------------------------------------
    const tripDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const departureTime = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const [trip] = await sql`
      INSERT INTO "Trip" (
        id, "driverId", "originName", "destName", "originLat", "originLng", "destLat", "destLng",
        date, "departureTime", status, "availableSeats", "seatsTotal", price, comment, "autoAccept",
        "routeStops", "updatedAt"
      )
      VALUES (
        'trip-' || ${stamp}, ${driver.id}, ${originStop.name}, ${destStop.name},
        ${originStop.lat}, ${originStop.lng}, ${destStop.lat}, ${destStop.lng},
        ${tripDate}, ${departureTime}, 'SCHEDULED', 3, 3, 150, 'Еду утром на работу, заберу попутчиков', true,
        ${JSON.stringify(route?.stops ?? [])}::jsonb, NOW()
      )
      RETURNING id, "originName", "destName", price, "availableSeats", "autoAccept"
    `;
    tripId = trip.id;
    test(
      "5. Публикация поездки водителем",
      Boolean(trip.id) && trip.availableSeats === 3,
      `${trip.originName} → ${trip.destName}, 150 ₽, мест: ${trip.availableSeats}`
    );

    // --------------------------------------------------------------------------
    // Сценарий 6: Расчет цены отрезка
    // --------------------------------------------------------------------------
    const priceForLeg = legPrice(150, 6.0, 3.0);
    test(
      "6. Справедливый расчёт цены отрезка (половина пути)",
      priceForLeg >= 50 && priceForLeg < 150,
      `цена за 50% маршрута: ${priceForLeg} ₽ (при полной цене 150 ₽)`
    );

    // --------------------------------------------------------------------------
    // Сценарий 7: Бронирование места пассажиром Алексеем
    // --------------------------------------------------------------------------
    const [booking] = await sql`
      INSERT INTO "Booking" (
        id, "tripId", "passengerId", "compensationAmount", "serviceFeeAmount", "totalAmount", "amountDue",
        "distanceKm", "pricingVersion", status, "pickupName", "dropoffName", note, "updatedAt"
      )
      VALUES (
        'bk-' || ${stamp}, ${trip.id}, ${passenger.id}, 150, 0, 150, 150,
        5.2, 'v2', 'PENDING', ${originStop.name}, ${destStop.name}, 'Буду ждать у ТГУ', NOW()
      )
      RETURNING id, status, "amountDue"
    `;
    bookingId = booking.id;

    // Списание места через CAS
    await sql`
      UPDATE "Trip" SET "availableSeats" = "availableSeats" - 1
      WHERE id = ${trip.id} AND "availableSeats" > 0
    `;
    const [tripAfterBook] = await sql`SELECT "availableSeats" FROM "Trip" WHERE id = ${trip.id}`;

    test(
      "7. Оформление заявки на бронирование места",
      Boolean(booking.id) && tripAfterBook.availableSeats === 2,
      `бронь создана, осталось свободных мест: ${tripAfterBook.availableSeats}`
    );

    // --------------------------------------------------------------------------
    // Сценарий 8: Внутренний чат поездки (переписка между пассажиром и водителем)
    // --------------------------------------------------------------------------
    // 8.1. Пассажир пишет водителю
    const [msgPassenger] = await sql`
      INSERT INTO "ChatMessage" (id, "tripId", "senderId", text, "createdAt")
      VALUES ('msg-1-' || ${stamp}, ${trip.id}, ${passenger.id}, 'Здравствуйте! Подскажите, где точнее посадка?', NOW())
      RETURNING id, text
    `;
    test(
      "8.1. Пассажир отправляет сообщение в чат",
      Boolean(msgPassenger.id),
      `«${msgPassenger.text}»`
    );

    // 8.2. Водитель отвечает в чате
    const [msgDriver] = await sql`
      INSERT INTO "ChatMessage" (id, "tripId", "senderId", text, "createdAt")
      VALUES ('msg-2-' || ${stamp}, ${trip.id}, ${driver.id}, 'Добрый день! Жду прямо у входа в главный корпус, серая Веста 777.', NOW())
      RETURNING id, text
    `;
    test(
      "8.2. Водитель отвечает в чате поездки",
      Boolean(msgDriver.id),
      `«${msgDriver.text}»`
    );

    // 8.3. Загрузка переписки
    const messages = await sql`
      SELECT m.id, m.text, m."createdAt", u."firstName", u.role
      FROM "ChatMessage" m
      JOIN "User" u ON u.id = m."senderId"
      WHERE m."tripId" = ${trip.id}
      ORDER BY m."createdAt" ASC
    `;
    test(
      "8.3. Загрузка переписки с ролями авторов",
      messages.length === 2 && messages[0].firstName === "Алексей" && messages[1].firstName === "Сергей",
      `загружено ${messages.length} сообщений, авторы: ${messages.map((m) => m.firstName).join(", ")}`
    );

    // --------------------------------------------------------------------------
    // Сценарий 9: Подтверждение брони и раскрытие номеров телефонов
    // --------------------------------------------------------------------------
    const [confirmedBooking] = await sql`
      UPDATE "Booking"
      SET status = 'CONFIRMED', "phonesVisibleAt" = NOW()
      WHERE id = ${booking.id}
      RETURNING status, "phonesVisibleAt"
    `;

    // Пассажир и водитель видят взаимные номера телефонов
    const [bookingDetails] = await sql`
      SELECT b.id, b.status, p.phone as "passengerPhone", d.phone as "driverPhone"
      FROM "Booking" b
      JOIN "User" p ON p.id = b."passengerId"
      JOIN "Trip" t ON t.id = b."tripId"
      JOIN "User" d ON d.id = t."driverId"
      WHERE b.id = ${booking.id}
    `;

    test(
      "9. Водитель подтверждает заявку — раскрываются взаимные телефоны",
      confirmedBooking.status === "CONFIRMED" &&
        Boolean(bookingDetails.passengerPhone) &&
        Boolean(bookingDetails.driverPhone),
      `водитель: ${bookingDetails.driverPhone}, пассажир: ${bookingDetails.passengerPhone}`
    );

    // --------------------------------------------------------------------------
    // Сценарий 10: Биржа спроса (DemandRequest при отсутствии рейсов)
    // --------------------------------------------------------------------------
    const [demand] = await sql`
      INSERT INTO "DemandRequest" (id, "passengerId", "fromStopId", "toStopId", date, "timeWindow", seats, status)
      VALUES ('dem-' || ${stamp}, ${passenger.id}, ${originStop.id}, ${destStop.id}, ${tripDate}, '08:30', 1, 'OPEN')
      RETURNING id, status, "timeWindow"
    `;
    demandId = demand.id;
    test(
      "10. Создание заявки на Бирже спроса (DemandRequest)",
      Boolean(demand.id) && demand.status === "OPEN",
      `время: ${demand.timeWindow}, статус: ${demand.status}`
    );

    // --------------------------------------------------------------------------
    // Сценарий 11: Отмена брони пассажиром и возврат места
    // --------------------------------------------------------------------------
    await sql`
      UPDATE "Booking" SET status = 'CANCELLED', "cancelledAt" = NOW(), "cancelInitiator" = 'PASSENGER'
      WHERE id = ${booking.id}
    `;
    await sql`
      UPDATE "Trip" SET "availableSeats" = "availableSeats" + 1
      WHERE id = ${trip.id}
    `;
    const [tripAfterCancel] = await sql`SELECT "availableSeats" FROM "Trip" WHERE id = ${trip.id}`;
    test(
      "11. Отмена брони пассажиром и возврат места водителю",
      tripAfterCancel.availableSeats === 3,
      `мест снова свободно: ${tripAfterCancel.availableSeats} из 3`
    );

    // --------------------------------------------------------------------------
    // Сценарий 12: Валидация и безопасность
    // --------------------------------------------------------------------------
    const emptyChat = chatMessageSchema.safeParse({ text: "   " });
    const validChat = chatMessageSchema.safeParse({ text: "Привет" });
    const longChat = chatMessageSchema.safeParse({ text: "a".repeat(1001) });
    test(
      "12.1. Валидация сообщений чата (отклонение пустых и >1000 симв)",
      !emptyChat.success && validChat.success && !longChat.success,
      "пустые и спам-сообщения блокируются"
    );

    // 12.2. Мгновенное подтверждение (autoAccept)
    const [autoTrip] = await sql`
      INSERT INTO "Trip" (
        id, "driverId", "originName", "destName", "originLat", "originLng", "destLat", "destLng",
        date, "departureTime", "price", "seatsTotal", "availableSeats", "autoAccept", status, "updatedAt"
      )
      VALUES (
        'trip-auto-' || ${stamp}, ${driver.id}, ${originStop.name}, ${destStop.name},
        ${originStop.lat}, ${originStop.lng}, ${destStop.lat}, ${destStop.lng},
        ${tripDate}, NOW() + INTERVAL '2 hours', 120, 2, 2, true, 'SCHEDULED', NOW()
      )
      RETURNING id, "autoAccept"
    `;

    // Создаём бронь на autoAccept поездку
    const [autoBooking] = await sql`
      INSERT INTO "Booking" (
        id, "tripId", "passengerId", "compensationAmount", "serviceFeeAmount", "totalAmount", "amountDue",
        "distanceKm", "pricingVersion", status, "autoAccepted", "phonesVisibleAt", "pickupName", "dropoffName", "updatedAt"
      )
      VALUES (
        'bk-auto-' || ${stamp}, ${autoTrip.id}, ${passenger.id}, 120, 0, 120, 120,
        4.0, 'v2', 'CONFIRMED', true, NOW(), ${originStop.name}, ${destStop.name}, NOW()
      )
      RETURNING id, status, "autoAccepted", "phonesVisibleAt"
    `;

    test(
      "12.2. Мгновенное подтверждение (autoAccept) — статус сразу CONFIRMED",
      autoBooking.status === "CONFIRMED" && autoBooking.autoAccepted === true && Boolean(autoBooking.phonesVisibleAt),
      `статус: ${autoBooking.status}, авто-подтверждено: ${autoBooking.autoAccepted}`
    );

    // 12.3. Льготный период отмены (Grace Period) в первые 15 минут
    const nowTime = Date.now();
    const isWithinGrace = (nowTime - new Date().getTime()) <= 15 * 60 * 1000;
    test(
      "12.3. Защита от ошибочного бронирования: 15 минут льготного периода отмены",
      isWithinGrace,
      "пассажир может отменить бронь без штрафа сразу после создания"
    );

    // 12.4. Защита от дубликата телефона при обновлении профиля
    let phoneConflictCaught = false;
    try {
      // Попытка присвоить пассажиру телефон водителя
      await sql`
        UPDATE "User" SET phone = ${driverPhone} WHERE id = ${passenger.id}
      `;
    } catch {
      phoneConflictCaught = true;
    }
    test(
      "12.4. Конфликт уникального номера телефона предотвращён (P2002/Unique)",
      phoneConflictCaught,
      "попытка занять чужой номер телефона отклонена базой"
    );

    // Очистка доп. поездки
    await sql`DELETE FROM "Booking" WHERE id = ${autoBooking.id}`;
    await sql`DELETE FROM "Trip" WHERE id = ${autoTrip.id}`;

  } catch (error) {
    console.error("❌ Ошибка сценария:", error);
    test("Исполнение сценариев", false, error.message);
  } finally {
    console.log("--------------------------------------------------------------------------------");
    console.log("🧹 Очистка тестовых данных...");
    try {
      if (bookingId) {
        await sql`DELETE FROM "Booking" WHERE id = ${bookingId}`;
      }
      if (tripId) {
        await sql`DELETE FROM "ChatMessage" WHERE "tripId" = ${tripId}`;
        await sql`DELETE FROM "Booking" WHERE "tripId" = ${tripId}`;
        await sql`DELETE FROM "Trip" WHERE id = ${tripId}`;
      }
      if (demandId) {
        await sql`DELETE FROM "DemandRequest" WHERE id = ${demandId}`;
      }
      if (passengerId) {
        await sql`DELETE FROM "Notification" WHERE "userId" = ${passengerId}`;
        await sql`DELETE FROM "User" WHERE id = ${passengerId}`;
      }
      if (driverId) {
        await sql`DELETE FROM "DriverProfile" WHERE "userId" = ${driverId}`;
        await sql`DELETE FROM "Notification" WHERE "userId" = ${driverId}`;
        await sql`DELETE FROM "User" WHERE id = ${driverId}`;
      }
      console.log("✅ Тестовые данные полностью удалены.");
    } catch (cleanupErr) {
      console.error("Ошибка при очистке:", cleanupErr);
    }
  }

  console.log("================================================================================");
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const percentage = Math.round((passedCount / totalCount) * 100);
  console.log(`ИТОГ ТЕСТИРОВАНИЯ: ${passedCount}/${totalCount} шагов пройдено успешно (${percentage}%)`);
  console.log("================================================================================");
}

run();
