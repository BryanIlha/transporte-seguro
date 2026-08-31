import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function PendingPhotos({
  files,
  onRemove,
  hasCover,
}: {
  files: File[];
  onRemove: (index: number) => void;
  hasCover: boolean;
}) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);
    return () => next.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [files]);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {previews.map(({ file, url }, index) => (
        <figure key={url} className="overflow-hidden rounded-md border border-border">
          <img
            src={url}
            alt={`Prévia de ${file.name}`}
            className="aspect-[4/3] w-full object-cover"
          />
          <figcaption className="flex items-center gap-2 p-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {!hasCover && index === 0 ? "Capa · " : ""}Aguardando salvar
              </p>
            </div>
            <button
              type="button"
              className="grid min-h-11 min-w-11 place-items-center rounded-md hover:bg-muted"
              aria-label={`Remover foto selecionada ${file.name}`}
              onClick={() => onRemove(index)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
