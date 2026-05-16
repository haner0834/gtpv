import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiList } from "../lib/api";
import { useAppStore } from "../store/app";
import { PasscodeModal } from "../components/PasscodeModal";
import { ImageGrid } from "../components/ImageGrid";
import { FolderSelector } from "../components/FolderSelector";

type AuthState =
  | "loading" // checking existing token
  | "needs_passcode" // no valid token
  | "authenticated" // token valid
  | "switch_folder"; // user switching folder, need new passcode

export function GalleryPage() {
  const { folder } = useParams<{ folder: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlToken = searchParams.get("token");

  const getToken = useAppStore((s) => s.getToken);
  const setToken = useAppStore((s) => s.setToken);

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [pendingFolder, setPendingFolder] = useState<string | null>(null);

  if (!folder) return null;

  // Determine token to use: URL > store
  useEffect(() => {
    const storeToken = getToken(folder);
    const token = urlToken ?? storeToken ?? null;

    if (!token) {
      // 先嘗試用空字串向 worker 驗證，worker 會告訴我們是否為 public folder
      apiList(folder!, "public")
        .then(() => {
          setActiveToken("public");
          setAuthState("authenticated");
        })
        .catch(() => {
          setAuthState("needs_passcode");
        });
      return;
    }
    setActiveToken(token);
    // will be confirmed or denied by the list query
    setAuthState("authenticated");
  }, [folder, urlToken]);

  // Fetch images — only when authenticated and token available
  const {
    data: images,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["images", folder, activeToken],
    queryFn: () => apiList(folder!, activeToken!),
    enabled: authState === "authenticated" && !!activeToken,
    retry: false,
  });

  // If list returns 401, prompt re-auth
  useEffect(() => {
    if (error && (error as Error).message === "UNAUTHORIZED") {
      setAuthState("needs_passcode");
      setActiveToken(null);
    }
  }, [error]);

  const onPasscodeSuccess = (token: string, targetFolder?: string) => {
    const f = targetFolder ?? folder;
    setToken(f!, token);

    if (targetFolder && targetFolder !== folder) {
      navigate(`/${targetFolder}?token=${token}`);
      return;
    }
    setActiveToken(token);
    setSearchParams({ token });
    setAuthState("authenticated");
  };

  const handleFolderChange = async (newFolder: string) => {
    if (newFolder === folder) return;
    const existingToken = getToken(newFolder);
    if (existingToken) {
      // Try with existing token — navigate; gallery page will validate
      navigate(`/${newFolder}?token=${existingToken}`);
    } else {
      setPendingFolder(newFolder);
      setAuthState("switch_folder");
    }
  };

  return (
    <div className="min-h-dvh bg-[#080808]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center justify-between px-4 h-12">
          <button
            onClick={() => navigate("/")}
            className="text-white/40 hover:text-white transition-colors text-sm font-black tracking-tighter"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            GTPV
          </button>
          <FolderSelector
            currentFolder={folder}
            onFolderChange={handleFolderChange}
          />
        </div>
      </header>

      {/* Content */}
      <main className="pt-3">
        {authState === "loading" && (
          <div className="flex items-center justify-center h-40">
            <span className="text-white/20 text-sm">載入中…</span>
          </div>
        )}

        {authState === "authenticated" && (
          <>
            {isLoading && (
              <div className="flex items-center justify-center h-40">
                <span className="text-white/20 text-sm">載入相片…</span>
              </div>
            )}
            {images && images.length === 0 && (
              <div className="flex items-center justify-center h-40">
                <span className="text-white/20 text-sm">此相簿尚無相片</span>
              </div>
            )}
            {images && images.length > 0 && (
              <ImageGrid folder={folder} images={images} />
            )}
          </>
        )}
      </main>

      {/* Passcode modal for initial auth */}
      {authState === "needs_passcode" && (
        <PasscodeModal
          folder={folder}
          onSuccess={(token) => onPasscodeSuccess(token)}
          onClose={() => navigate("/")}
        />
      )}

      {/* Passcode modal for switching folders */}
      {authState === "switch_folder" && pendingFolder && (
        <PasscodeModal
          folder={pendingFolder}
          onSuccess={(token) => {
            setPendingFolder(null);
            setAuthState("authenticated");
            onPasscodeSuccess(token, pendingFolder);
          }}
          onClose={() => {
            setPendingFolder(null);
            setAuthState("authenticated");
          }}
        />
      )}
    </div>
  );
}
