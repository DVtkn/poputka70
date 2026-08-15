"use client";

import Link from "next/link";
import { Icon } from "./Icon";

type DriverBenefit = {
  icon: string;
  title: string;
  description: string;
};

const driverBenefits: DriverBenefit[] = [
  {
    icon: "wallet",
    title: "Окупайте топливо",
    description: "Получайте до 70% расходов на бензин с каждого пассажира",
  },
  {
    icon: "clock",
    title: "Ездите когда угодно",
    description: "Создайте маршрут за минуту. Никаких графиков и обязательств",
  },
  {
    icon: "users",
    title: "Выбирайте пассажиров",
    description: "Смотрите профили и отзывы. Подтверждайте только удобных",
  },
  {
    icon: "shield",
    title: "Полная безопасность",
    description: "Страховка на пассажиров, автооплата, поддержка 24/7",
  },
];

export default function BecomeDriverCTA() {
  return (
    <section className="become-driver" aria-labelledby="driver-heading">
      <div className="container">
        <div className="driver-content">
          <div className="driver-info">
            <header className="section-header">
              <h2 id="driver-heading" className="section-title">Ездите по городу каждый день?</h2>
              <p className="section-subtitle">Превратите пустые места в доход. Бесплатно, без рисков, на ваших условиях.</p>
            </header>
            <ul className="benefits-list" role="list">
              {driverBenefits.map((benefit, index) => (
                <li key={index} className="benefit-item animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }} role="listitem">
                  <div className="benefit-icon" aria-hidden="true">
                    <Icon name={benefit.icon} size={22} />
                  </div>
                  <div>
                    <strong>{benefit.title}</strong>
                    <span>{benefit.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="driver-card">
            <div className="driver-card-header">
              <div className="driver-avatar" aria-hidden="true">
                <Icon name="car" size={32} />
              </div>
              <div>
                <h3>Стать водителем</h3>
                <p>Регистрация за 2 минуты</p>
              </div>
            </div>
            <Link href="/driver" className="driver-btn">
              <span>Начать зарабатывать</span>
              <Icon name="arrowRight" size={20} aria-hidden="true" />
            </Link>
            <p className="driver-note">Никаких комиссий за регистрацию • Отмена в любой момент</p>
          </div>
        </div>
      </div>
    </section>
  );
}