"use client";

import { Icon } from "./Icon";

type TrustItem = {
  icon: string;
  title: string;
  description: string;
};

const trustItems: TrustItem[] = [
  {
    icon: "shield",
    title: "Проверенные водители",
    description: "Права, страховка, ТО — всё проверено перед первой поездкой",
  },
  {
    icon: "star",
    title: "Реальные отзывы",
    description: "Только пассажиры, которые ехали, могут оставить оценку",
  },
  {
    icon: "wallet",
    title: "Безопасная оплата",
    description: "Деньги зачисляются водителю только после завершения поездки",
  },
  {
    icon: "users",
    title: "Поддержка 24/7",
    description: "Поможем решить любой вопрос в чате или по телефону",
  },
];

export default function TrustIndicators() {
  return (
    <section className="trust-indicators" aria-labelledby="trust-heading">
      <h2 id="trust-heading" className="visually-hidden">Почему доверяют нам</h2>
      <div className="trust-grid">
        {trustItems.map((item, index) => (
          <div key={index} className="trust-card animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="trust-icon" aria-hidden="true">
              <Icon name={item.icon} size={28} />
            </div>
            <h3 className="trust-title">{item.title}</h3>
            <p className="trust-description">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}