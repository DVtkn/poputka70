export default function PriceBreakdown({
  compensation,
  serviceFee,
}: {
  compensation: number;
  serviceFee: number;
}) {
  const total = compensation + serviceFee;
  
  return (
    <div className="price-breakdown">
      <div className="price-breakdown-row">
        <span>Компенсация водителю</span>
        <span className="font-utility">{compensation} ₽</span>
      </div>
      <div className="price-breakdown-row">
        <span>Сервисный сбор Попутка70</span>
        <span className="font-utility">{serviceFee} ₽</span>
      </div>
      <div className="price-breakdown-row total">
        <span>Итого к оплате</span>
        <span className="font-utility">{total} ₽</span>
      </div>
    </div>
  );
}
