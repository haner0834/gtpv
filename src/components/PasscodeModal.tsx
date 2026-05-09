import { useRef, useState, useEffect } from "react";
import { apiVerify } from "../lib/api";
import { useAppStore } from "../store/app";

interface PasscodeModalProps {
  folder: string;
  onSuccess: (token: string) => void;
  onClose?: () => void;
  errorMessage?: string;
}

export function PasscodeModal({
  folder,
  onSuccess,
  onClose,
  errorMessage: externalError,
}: PasscodeModalProps) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const setToken = useAppStore((s) => s.setToken);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (externalError) setError(externalError);
  }, [externalError]);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    setError(null);
    if (val && idx < 3) {
      inputs.current[idx + 1]?.focus();
    }
    if (next.every((d) => d !== "") && val) {
      submit(next.join(""));
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const submit = async (passcode: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await apiVerify(folder, passcode);
      setToken(folder, token);
      onSuccess(token);
    } catch {
      setError("密碼錯誤，請再試一次");
      setDigits(["", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xs mx-4 bg-[#0f0f0f] border border-white/10 rounded-2xl p-8 shadow-2xl">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors text-xl leading-none"
          >
            ×
          </button>
        )}

        <div className="mb-6 text-center">
          <div className="text-xs tracking-[0.3em] text-white/30 uppercase mb-1">
            GTPV
          </div>
          <div className="text-white font-light text-lg">
            <span className="text-white/50">/</span>
            {folder}
          </div>
        </div>

        <p className="text-center text-white/40 text-sm mb-6">
          輸入 4 位數密碼
        </p>

        <div className="flex justify-center gap-3 mb-6">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className={[
                "w-12 h-14 text-center text-2xl font-mono rounded-xl border bg-white/5 text-white outline-none transition-all",
                "focus:border-white/60 focus:bg-white/10",
                d ? "border-white/30" : "border-white/10",
                loading ? "opacity-40 cursor-not-allowed" : "",
              ].join(" ")}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-red-400/80 text-sm animate-shake">
            {error}
          </p>
        )}

        {loading && (
          <p className="text-center text-white/30 text-xs mt-2">驗證中…</p>
        )}
      </div>
    </div>
  );
}
