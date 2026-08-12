import { Star } from "lucide-react";

/** Affiche 5 étoiles (Lucide) selon la note /5 — même style d’icônes que la sidebar. */
export function StarRating({ note, size = 14, className = "" }) {
  const n = Math.min(5, Math.max(0, Math.floor(Number(note) || 0)));
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < n ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"}
        />
      ))}
    </span>
  );
}
