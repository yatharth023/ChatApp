import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { cloudinaryEnabled } from '../config/cloudinary.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * We never proxy binary data. The frontend uploads directly to Cloudinary
 * using a short-lived signature we mint here. The signature scopes the
 * upload to a user-specific folder.
 *
 * We deliberately do NOT sign an `upload_preset` param, because most
 * Cloudinary accounts don't have a pre-configured signed preset — and if
 * the preset name doesn't exist server-side, Cloudinary rejects the upload
 * with "Upload preset must be specified when using unsigned upload". Signed
 * uploads with only `folder` + `timestamp` work against any account.
 *
 * See: https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */
export const uploadService = {
  signMediaUpload(userId) {
    if (!cloudinaryEnabled()) {
      throw ApiError.badRequest('UPLOAD_DISABLED', 'Media upload is not configured');
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `${env.CLOUDINARY_UPLOAD_FOLDER}/${userId}`;
    const params = { folder, timestamp };
    const paramString = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    const signature = crypto
      .createHash('sha1')
      .update(paramString + env.CLOUDINARY_API_SECRET)
      .digest('hex');

    return {
      timestamp,
      signature,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      folder,
    };
  },
};
