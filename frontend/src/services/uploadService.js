import axios from 'axios';
import { apiClient } from './apiClient.js';

/**
 * Turns an axios/browser error into a human-readable string. Distinguishes:
 *   - Our own backend errors (shape: `{ error: { code, message } }`)
 *   - Cloudinary errors (shape: `{ error: { message } }`)
 *   - Anything else (fallback to axios's default message)
 *
 * Historically the caller only surfaced Cloudinary's response, so a backend
 * `UPLOAD_DISABLED` (missing env vars) leaked through as the raw axios
 * message "Request failed with status code 400". The explicit branch below
 * hoists the real error out so users know exactly what to fix.
 */
const explainError = (err, stage) => {
  const apiError = err?.response?.data?.error;
  if (apiError?.code === 'UPLOAD_DISABLED') {
    return 'Media upload is not configured. Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in backend/.env, then restart the backend.';
  }
  if (apiError?.message) return `${stage}: ${apiError.message}`;
  return err?.message ?? 'Upload failed';
};

export const uploadService = {
  async getSignature() {
    try {
      const { data } = await apiClient.post('/upload/signature');
      return data;
    } catch (err) {
      throw new Error(explainError(err, 'Backend'));
    }
  },

  /**
   * Uploads directly to Cloudinary using a short-lived signature minted by
   * the backend. FormData must include every signed parameter verbatim
   * (plus `api_key`, `file`, `signature`) — otherwise Cloudinary rejects
   * with `Invalid Signature`. We sign only `folder + timestamp` so uploads
   * work against any Cloudinary account without a pre-configured preset.
   */
  async uploadToCloudinary(file, onProgress) {
    const sig = await uploadService.getSignature();
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);

    const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`;
    try {
      const { data } = await axios.post(url, form, {
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      return {
        secureUrl: data.secure_url,
        resourceType: data.resource_type,
        bytes: data.bytes,
        format: data.format,
        thumbnail: data.thumbnail_url ?? null,
      };
    } catch (err) {
      throw new Error(explainError(err, 'Cloudinary'));
    }
  },
};
