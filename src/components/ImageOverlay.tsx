import { useEffect, useCallback } from "react";
import { X, Download } from "lucide-react";
import { getFullUrl } from "../types";
import { isIOS } from "../lib/platform";

interface ImageOverlayProps {
  folder: string;
  imageId: string;
  onClose: () => void;
}

export function ImageOverlay({ folder, imageId, onClose }: ImageOverlayProps) {
  const fullUrl = getFullUrl(folder, imageId);
  const ios = isIOS();

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white/30 text-xs tracking-widest font-mono uppercase">
          {imageId.slice(0, 8)}
        </span>
        <div className="flex items-center gap-3">
          {ios ? (
            <span className="text-white/40 text-xs">長按圖片儲存</span>
          ) : (
            <a
              href={fullUrl}
              download
              className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={16} />
              <span>下載</span>
            </a>
          )}
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-2 pb-4 gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={fullUrl}
          alt={imageId}
          className="max-w-full max-h-[75vh] object-contain rounded-lg select-none"
          draggable={false}
          style={{ touchAction: "pinch-zoom" }}
        />

        {ios && (
          <p className="text-center text-white/70 text-sm">
            iOS 用戶請長按照片下載至圖庫
          </p>
        )}
      </div>
    </div>
  );
}
