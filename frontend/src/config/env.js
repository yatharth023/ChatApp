const raw = import.meta.env;

export const env = Object.freeze({
  API_BASE: (raw.VITE_API_BASE ?? '/api').replace(/\/$/, ''),
  SOCKET_URL: raw.VITE_SOCKET_URL ?? '',
  CLOUDINARY_CLOUD_NAME: raw.VITE_CLOUDINARY_CLOUD_NAME ?? '',
});
