import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { apiFolders } from "../lib/api";

interface FolderSelectorProps {
  currentFolder?: string;
  onFolderChange?: (folder: string) => void;
}

export function FolderSelector({
  currentFolder,
  onFolderChange,
}: FolderSelectorProps) {
  const navigate = useNavigate();
  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: apiFolders,
    staleTime: 5 * 60 * 1000,
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const folder = e.target.value;
    if (!folder) return;
    if (onFolderChange) {
      onFolderChange(folder);
    } else {
      navigate(`/${folder}`);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <select
        value={currentFolder ?? ""}
        onChange={handleChange}
        className={[
          "appearance-none bg-transparent border border-white/15 rounded-lg",
          "text-white/70 text-sm pl-3 pr-8 py-1.5 outline-none cursor-pointer",
          "hover:border-white/30 hover:text-white transition-all",
          "focus:border-white/40",
        ].join(" ")}
      >
        {!currentFolder && (
          <option value="" disabled className="bg-[#0f0f0f]">
            選擇相簿
          </option>
        )}
        {folders.map((f) => (
          <option key={f} value={f} className="bg-[#0f0f0f]">
            /{f}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2 text-white/40 pointer-events-none"
      />
    </div>
  );
}
