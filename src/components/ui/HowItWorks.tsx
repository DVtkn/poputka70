"use client";

import { Icon } from "./Icon";

type Step = {
  number: number;
  title: string;
  description: string;
  icon: string;
};

const steps: Step[] = [
  {
    number: 1,
    title: "Введите маршрут",
    description: "Укажите откуда и куда едете, выберите дату — покажем все доступные попутки",
    icon: "search",
  },
  {
    number: 2,
    title: "Выберите поездку",
    description: "Сравните время, цену и отзывы. Забронируйте место за 30 секунд",
    icon: "check",
  },
  {
    number: 3,
    title: "Ездите комфортно",
    description: "Встречайтесь с водителем в указанной точке. Оплата после поездки",
    icon: "car",
  },
];

export default function HowItWorks() {
  return (
    <section className="how-it-works" aria-labelledby="how-heading">
      <div className="container">
        <header className="section-header">
          <h2 id="how-heading" className="section-title">Как это работает</h2>
          <p className="section-subtitle">Три шага — и вы уже на месте</p>
        </header>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <article key={step.number} className="step-card animate-fade-in-up" style={{ animationDelay: `${index * 150}ms` }}>
              <div className="step-number" aria-hidden="true">{step.number}</div>
              <div className="step-icon" aria-hidden="true">
                <Icon name={step.icon} size={28} />
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}