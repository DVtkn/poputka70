import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Политика конфиденциальности — Попутка70",
  description: "Политика конфиденциальности сервиса Попутка70. Как мы собираем, используем и защищаем ваши данные.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-snow py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-taiga mb-3">
            Политика конфиденциальности
          </h1>
          <p className="text-frost">Версия 1.0 от 09.08.2026</p>
        </header>

        <article className="prose prose-taiga max-w-none space-y-8">
          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">1. Кто мы</h2>
            <p className="text-frost">
              ООО «Попутка70» (далее — «Мы», «Администрация») — оператор сервиса Попутка70.
              Контакты: legal@poputka70.ru, г. Томск.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">2. Какие данные мы собираем</h2>
            <h3 className="font-semibold text-taiga">При регистрации:</h3>
            <ul className="list-disc list-inside space-y-1 text-frost">
              <li>Логин, хеш пароля (bcrypt)</li>
              <li>Телефон (опционально, для SMS-верификации)</li>
              <li>Имя, фамилия</li>
            </ul>
            <h3 className="font-semibold text-taiga mt-4">При верификации водителя:</h3>
            <ul className="list-disc list-inside space-y-1 text-frost">
              <li>Фото водительского удостоверения</li>
              <li>Фото автомобиля</li>
              <li>Марка, модель, госномер, цвет авто</li>
            </ul>
            <h3 className="font-semibold text-taiga mt-4">При использовании сервиса:</h3>
            <ul className="list-disc list-inside space-y-1 text-frost">
              <li>Созданные маршруты и поездки</li>
              <li>История бронирований</li>
              <li>Отзывы и рейтинги</li>
              <li>Push-подписки (endpoint, ключи шифрования)</li>
              <li>IP-адрес, User-Agent, логи безопасности</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">3. Цели обработки</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Идентификация и авторизация пользователя</li>
              <li>Обеспечение работы маркетплейса (поиск, бронирование, оплата)</li>
              <li>Верификация водителей для безопасности</li>
              <li>Рассылка уведомлений (push, SMS, in-app)</li>
              <li>Расчёт рейтингов и репутации</li>
              <li>Превенция фрода и abusе</li>
              <li>Выполнение требований закона (152-ФЗ, 580-ФЗ)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">4. Правовые основания (152-ФЗ)</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Согласие субъекта (п. 1 ч. 1 ст. 6)</li>
              <li>Исполнение договора (п. 2 ч. 1 ст. 6)</li>
              <li>Законный интерес (п. 5 ч. 1 ст. 6) — безопасность, антифрод</li>
              <li>Обязательства по закону (п. 3 ч. 1 ст. 6)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">5. Передача третьим лицам</h2>
            <p className="text-frost">Мы не продаём данные. Передача возможна только:</p>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Платёжному шлюзу (ЮKassa) — для обработки платежей</li>
              <li>SMS-провайдеру — для отправки кодов подтверждения</li>
              <li>Госорганам — по законному основанию</li>
            </ul>
            <p className="text-frost">Водитель видит имя пассажира и телефон после подтверждения брони. Пассажир видит имя, фото авто, госномер и телефон водителя после подтверждения поездки.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">6. Хранение и защита</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Данные хранятся в PostgreSQL (Neon / Yandex Cloud) на территории РФ.</li>
              <li>Пароли — только в виде bcrypt-хешей.</li>
              <li>Фото документов — в Cloudinary с ограниченным доступом.</li>
              <li>JWT-токены — HttpOnly cookies, срок 30 дней.</li>
              <li>Резервное копирование БД — ежедневно.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">7. Сроки хранения</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Аккаунт и профиль — пока аккаунт активен + 3 года после удаления (архив).</li>
              <li>Финансовые операции (Booking, платежи) — 5 лет (налоговое законодательство).</li>
              <li>Логи безопасности — 1 год.</li>
              <li>Push-подписки — до отзыва пользователем.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">8. Ваши права (ст. 18-21 152-ФЗ)</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Доступ к данным и получение копии</li>
              <li>Исправление неточных данных</li>
              <li>Удаление данных («право на забвение»)</li>
              <li>Ограничение обработки</li>
              <li>Переносимость данных</li>
              <li>Отзыв согласия (для обработки по согласию)</li>
              <li>Жалоба в Роскомнадзор</li>
            </ul>
            <p className="text-frost">Для реализации прав напишите на legal@poputka70.ru. Ответ в течение 30 дней.</p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">9. Cookies и аналитика</h2>
            <p className="text-frost">
              Используем необходимые cookies (сессия, csrf). Аналитика — только анонимная (Plausible / Umami),
              без IP. Можно отключить в настройках браузера.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">10. Возрастное ограничение</h2>
            <p className="text-frost">
              Сервис предназначен для лиц старше 18 лет. При обнаружении несовершеннолетнего — аккаунт блокируется,
              данные удаляются.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">11. Изменения политики</h2>
            <p className="text-frost">
              Обновления публикуются на этой странице. Существенные изменения — с уведомлением пользователей.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">12. Контакты ДПО</h2>
            <p className="text-frost">
              Уполномоченный по защите персональных данных:<br />
              Email: dpo@poputka70.ru
            </p>
          </section>
        </article>

        <footer className="mt-12 pt-8 border-t border-fog text-center text-sm text-frost">
          <Link href="/" className="text-river hover:underline">← На главную</Link>
        </footer>
      </div>
    </main>
  );
}