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
      <div className="md:hidden fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 px-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-fog bg-white/95 backdrop-blur-xl p-3 shadow-card">
          <div className="min-w-0">
            <div className="font-utility text-lg font-bold leading-none">{priceFull} ₽</div>
            <div className="text-[11px] text-frost-dark mt-0.5">за место</div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-primary px-5 min-h-[48px] flex-shrink-0"
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
