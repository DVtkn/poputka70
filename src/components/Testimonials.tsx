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
    <section className="py-16 md:py-24" aria-labelledby="testimonials-title">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
          {rating !== null && (
            <div className="inline-flex items-center gap-2 rounded-full bg-birch-light-bg border border-birch/20 px-4 py-1.5 text-sm font-medium text-birch-dark mb-5">
              <Star className="w-4 h-4 fill-current" strokeWidth={0} aria-hidden="true" />
              Средний рейтинг {rating.toFixed(1)} из 5
            </div>
          )}
          <h2 id="testimonials-title" className="text-h2 mb-4">
            Отзывы после поездок
          </h2>
          <p className="text-frost-dark text-lg leading-relaxed">
            Оценки оставляют только те, кто действительно ехал
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" role="list">
          {reviews.slice(0, 6).map((review) => (
            <article key={review.id} className="card p-6 flex flex-col h-full" role="listitem">
              <div className="flex items-center gap-1 mb-4" aria-label={`Оценка ${review.rating} из 5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? "text-birch fill-birch" : "text-fog fill-fog"}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-taiga leading-relaxed flex-1">{review.content}</p>
              <footer className="mt-4 pt-4 border-t border-fog/60 text-sm text-frost-dark">
                <span className="font-medium text-taiga">{review.author}</span>
                {" "}— отзыв о поездке с {review.about}
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
