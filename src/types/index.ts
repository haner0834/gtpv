export interface ImageItem {
  id: string;
  folder: string;
}

export interface FolderListResponse {
  folders: string[];
}

export interface VerifyResponse {
  token: string;
}

export interface ListResponse {
  images: string[];
}

export type ThumbnailSize = 64 | 128 | 256 | 512;

export function getThumbnailUrl(
  folder: string,
  imageId: string,
  size: ThumbnailSize
): string {
  return `https://images.gtpv.kmshweb.com/${folder}/${imageId}/thumbnail${size}`;
}

export function getFullUrl(folder: string, imageId: string): string {
  return `https://images.gtpv.kmshweb.com/${folder}/${imageId}/full`;
}
