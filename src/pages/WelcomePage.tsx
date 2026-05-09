import { useNavigate } from "react-router-dom";
import { FolderSelector } from "../components/FolderSelector";

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[#080808] px-6">
      {/* Grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px",
        }}
      />

      <div className="relative text-center">
        <div className="mb-12">
          <h1
            className="text-[5rem] font-black tracking-tighter text-white leading-none"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            GTPV
          </h1>
          <p className="text-white/25 text-sm tracking-[0.25em] uppercase mt-2">
            Graduation Trip Photo Viewer
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <p className="text-white/35 text-sm">選擇相簿開始瀏覽</p>
          <FolderSelector
            onFolderChange={(folder) => navigate(`/${folder}`)}
          />
        </div>

        <p className="mt-16 text-white/15 text-xs tracking-widest">
          © GTPV
        </p>
      </div>
    </div>
  );
}
