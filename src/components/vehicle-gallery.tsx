import { useState } from "react";
import { BusFront, ChevronLeft, ChevronRight } from "lucide-react";

type VehiclePhoto = { src: string; alt: string };

export function VehicleGallery({ photos, name }: { photos: VehiclePhoto[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const index = Math.min(selected, Math.max(photos.length - 1, 0));
  const photo = photos[index];
  const failed = photo && failedImages.includes(photo.src);

  return (
    <div role="group" aria-label={`Fotos de ${name}`}>
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        {photo && !failed ? (
          <img
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            loading="lazy"
            width={1200}
            height={900}
            className="h-full w-full object-cover"
            onError={() => setFailedImages((current) => [...current, photo.src])}
          />
        ) : (
          <div className="grid h-full place-content-center text-center text-sm text-muted-foreground">
            <BusFront className="mx-auto mb-3 h-8 w-8" aria-hidden="true" />
            {photo ? "Foto indisponível" : "Foto em breve"}
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex items-center justify-between border-b border-border px-3 py-1">
          <button
            type="button"
            aria-label={`Foto anterior de ${name}`}
            onClick={() => setSelected((index + photos.length - 1) % photos.length)}
            className="flex min-h-11 min-w-11 items-center justify-center text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <p aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground">
            Foto {index + 1} de {photos.length}
          </p>
          <button
            type="button"
            aria-label={`Próxima foto de ${name}`}
            onClick={() => setSelected((index + 1) % photos.length)}
            className="flex min-h-11 min-w-11 items-center justify-center text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
