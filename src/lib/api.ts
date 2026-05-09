const WORKER_BASE = "https://gtpv-worker.linandy40804.workers.dev";

export async function apiFolders(): Promise<string[]> {
  const res = await fetch(`${WORKER_BASE}/api/folders`);
  if (!res.ok) throw new Error("Failed to fetch folders");
  const data = await res.json();
  return data.folders as string[];
}

export async function apiVerify(
  folder: string,
  passcode: string
): Promise<string> {
  const res = await fetch(`${WORKER_BASE}/api/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, passcode }),
  });
  if (!res.ok) throw new Error("Invalid passcode");
  const data = await res.json();
  return data.token as string;
}

export async function apiList(
  folder: string,
  token: string
): Promise<string[]> {
  const url = new URL(`${WORKER_BASE}/api/list`);
  url.searchParams.set("folder", folder);
  url.searchParams.set("token", token);
  const res = await fetch(url.toString());
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error("Failed to fetch images");
  const data = await res.json();
  return data.images as string[];
}
