import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Оферта — Попутка70",
  description: "Публичная оферта сервиса Попутка70. Условия использования платформы для совместных поездок.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-snow py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-taiga mb-3">
            Публичная оферта
          </h1>
          <p className="text-frost">Версия 1.0 от 09.08.2026</p>
        </header>

        <article className="prose prose-taiga max-w-none space-y-8">
          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">1. Общие положения</h2>
            <p className="text-frost">
              Настоящая Публичная оферта (далее — «Оферта») составляют условия использования сервиса «Попутка70»
              (далее — «Сервис», «Платформа»), который предоставляет ООО «Попутка70» (далее — «Администрация»).
            </p>
            <p className="text-frost">
              Регистрируясь на Платформе и используя её функции, Пользователь (далее — «Вы») принимает условия настоящей
              Оферты в полном объёме. Если Вы не согласны с какими-либо положениями, пожалуйста, не используйте Сервис.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">2. Суть сервиса</h2>
            <p className="text-frost">
              Попутка70 — это платформа для координации совместных поездок (карпулинга). Сервис не является службой
              такси, перевозчиком или агрегатором такси. Водители публикуют маршруты, которые планируют совершить
              самостоятельно, независимо от наличия пассажиров. Пассажиры выбирают существующие маршруты и
              компенсируют водителям часть расходов на топливо и эксплуатацию автомобиля.
            </p>
            <p className="text-frost">
              <strong>Ключевой принцип:</strong> Водитель едет по маршруту независимо от наличия пассажира.
              Попутка70 не гарантирует наличие свободных мест, точность времени прибытия или совершение поездки.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">3. Роли пользователей</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li><strong>Пассажир</strong> — ищет и бронирует места в поездках.</li>
              <li><strong>Водитель</strong> — публикует маршруты, подтверждает поездки, возит пассажиров.</li>
              <li>Один пользователь может одновременно выполнять обе роли.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">4. Регистрация и аккаунт</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Для использования Сервиса необходимо создать аккаунт (логин/пароль или телефон + SMS).</li>
              <li>Вы несёте ответственность за сохранность учётных данных и все действия под своим аккаунтом.</li>
              <li>Администрация вправе приостановить или удалить аккаунт при нарушении Оферты.</li>
              <li>Не допускается создание нескольких аккаунтов одним лицом.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">5. Верификация водителей</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Базовая верификация (подтверждение телефона) обязательна для всех.</li>
              <li>Расширенная верификация (загрузка ВУ, фото автомобиля) добровольна, даёт бейдж «✓ Проверен».</li>
              <li>Администрация проверяет документы вручную в течение 24 часов.</li>
              <li>Отказ в верификации не лишает права пользоваться Сервисом как пассажиру.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">6. Бронирование и оплата</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Пассажир просит место в конкретной поездке: водитель принимает или вежливо отклоняет заявку.</li>
              <li>Цену места устанавливает водитель — это <strong>компенсация расходов</strong> на дорогу. Попутка70 бесплатна и комиссию не берёт.</li>
              <li>Сумма фиксируется в момент заявки и видна обеим сторонам до поездки.</li>
              <li>Оплата происходит напрямую между пассажиром и водителем (наличные или перевод) при посадке. Платформа в расчётах не участвует и деньги пользователей не удерживает.</li>
              <li>Поездка считается согласованной, когда водитель принял заявку.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">7. Отмена и возвраты</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li><strong>Водитель отменил поездку:</strong> пассажир ничего не платит; если оплата уже была передана — водитель возвращает её напрямую.</li>
              <li><strong>Пассажир снял заявку:</strong> без штрафов; лучше предупредить водителя заранее. Снять заявку можно не позднее чем за час до выезда.</li>
              <li><strong>Неявка:</strong> случай фиксируется в истории поездок и влияет на рейтинг.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">8. Рейтинги и отзывы</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Отзывы возможны только после завершённой поездки (статус COMPLETED).</li>
              <li>Оценивают только участники поездки (водитель ↔ пассажир).</li>
              <li>Рейтинги разделены: <code>ratingAsDriver</code> и <code>ratingAsPassenger</code>.</li>
              <li>Администрация может скрыть отзыв, нарушающий правила (мат, спам, ложь).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">9. Ограничения ответственности</h2>
            <ul className="list-disc list-inside space-y-2 text-frost">
              <li>Сервис предоставляется «как есть» (as is).</li>
              <li>Администрация не несёт ответственности за действия водителей/пассажиров, состояние авто,
                соблюдение ПДД, потеря вещей, задержки.</li>
              <li>Администрация — информационная площадка: она не является стороной расчётов между пользователями.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">10. Персональные данные</h2>
            <p className="text-frost">
              Обработка персональных данных регулируется <Link href="/legal/privacy" className="text-river hover:underline">
                Политикой конфиденциальности
              </Link>. Данные хранятся на серверах в РФ (152-ФЗ).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">11. Изменения Оферты</h2>
            <p className="text-frost">
              Администрация может изменять Оферту. Новая версия вступает в силу с момента публикации. Продолжение
              использования Сервиса означает принятие изменений.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold text-taiga">12. Контакты</h2>
            <p className="text-frost">
              ООО «Попутка70»<br />
              г. Томск<br />
              Email: legal@poputka70.ru<br />
              Телефон: +7 (3822) XXX-XX-XX
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