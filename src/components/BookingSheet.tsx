"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import RequestSeatBox from "@/components/RequestSeatBox";

interface CorridorStopOption {
  id: string;
  name: string;
}

/** Мобильная бронь: липкая кнопка + нижний лист. Один тап открывает, второй отправляет. */
export default function BookingSheet({
  tripId,
  originName,
  destName,
  priceFull,
  seatsLeft,
  corridor,
}: {
  tripId: string;
  originName: string;
  destName: string;
  priceFull: number;
  seatsLeft: number;
  corridor: CorridorStopOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-xl border-t border-fog px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-lg">
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <div className="min-w-0">
            <div className="font-utility text-xl font-bold leading-none text-taiga">{priceFull} ₽</div>
            <div className="text-[11px] text-frost-dark mt-0.5">за место · свободно {seatsLeft}</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-primary px-6 min-h-[48px] flex-shrink-0 shadow-riverSm"
          >
            Запросить место
            <ArrowRight className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Запросить место"
        description={`${originName} → ${destName}`}
        size="sm"
        closeOnOverlayClick
      >
        <div className="p-4">
          <RequestSeatBox
            tripId={tripId}
            originName={originName}
            destName={destName}
            priceFull={priceFull}
            seatsLeft={seatsLeft}
            corridor={corridor}
            showHeading={false}
          />
        </div>
      </Modal>
    </>
  );
}
