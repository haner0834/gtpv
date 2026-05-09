import { useState } from "react";
import { getThumbnailUrl } from "../types";
import { ImageOverlay } from "./ImageOverlay";

interface ImageGridProps {
  folder: string;
  images: string[];
}

export function ImageGrid({ folder, images }: ImageGridProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <>
      <div className="columns-2 sm:columns-3 md:columns-4 gap-1.5 px-1.5">
        {images.map((id) => (
          <ImageCard
            key={id}
            folder={folder}
            imageId={id}
            onClick={() => setSelected(id)}
          />
        ))}
      </div>

      {selected && (
        <ImageOverlay
          folder={folder}
          imageId={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

interface ImageCardProps {
  folder: string;
  imageId: string;
  onClick: () => void;
}

function ImageCard({ folder, imageId, onClick }: ImageCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const src = getThumbnailUrl(folder, imageId, 256);

  return (
    <div
      className="break-inside-avoid mb-1.5 cursor-pointer group relative overflow-hidden rounded-md bg-white/5"
      onClick={onClick}
    >
      {!loaded && !error && (
        <div className="aspect-square animate-pulse bg-white/5 rounded-md" />
      )}

      {!error ? (
        <img
          src={src}
          alt={imageId}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={[
            "w-full block rounded-md transition-all duration-300",
            "group-hover:brightness-75 group-hover:scale-[1.02]",
            loaded ? "opacity-100" : "opacity-0 absolute inset-0",
          ].join(" ")}
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div className="aspect-square flex items-center justify-center rounded-md bg-white/5">
          <span className="text-white/20 text-xs">!</span>
        </div>
      )}
    </div>
  );
}
