import { Star } from "lucide-react";

export interface LandingReview {
  id: string;
  author: string;
  content: string;
  rating: number;
  about: string;
}

/**
 * Показываем только настоящие отзывы из базы — и только когда их достаточно,
 * чтобы блок выглядел убедительно. Никаких выдуманных историй.
 */
export default function Testimonials({
  reviews,
  rating,
}: {
  reviews: LandingReview[];
  rating: number | null;
}) {
  if (reviews.length < 3) return null;

  return (
    <section className="py-8 md:py-10" aria-labelledby="testimonials-title">
      <div className="container">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
          <div>
            <h2 id="testimonials-title" className="text-h3 text-taiga">
              Отзывы после поездок
            </h2>
            <p className="text-sm text-frost-dark mt-0.5">
              Оценки оставляют только участники состоявшихся поездок
            </p>
          </div>
          {rating !== null && (
            <div className="inline-flex items-center gap-1.5 text-sm font-utility font-semibold text-taiga">
              <Star className="w-4 h-4 text-birch fill-birch" strokeWidth={0} aria-hidden="true" />
              <span>{rating.toFixed(1)} из 5</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
          {reviews.slice(0, 6).map((review) => (
            <article key={review.id} className="bg-white border border-fog rounded-xl p-5 flex flex-col h-full" role="listitem">
              <div className="flex items-center gap-1 mb-3" aria-label={`Оценка ${review.rating} из 5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < review.rating ? "text-birch fill-birch" : "text-fog fill-fog"}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-sm text-taiga leading-relaxed flex-1">{review.content}</p>
              <footer className="mt-3 pt-3 border-t border-fog text-xs text-frost-dark">
                <span className="font-medium text-taiga">{review.author}</span>
                {" · "}поездка с {review.about}
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
