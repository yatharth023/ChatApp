import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import { logger } from './logger.js';

const enabled = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

if (enabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  logger.info(
    { cloudName: env.CLOUDINARY_CLOUD_NAME, folder: env.CLOUDINARY_UPLOAD_FOLDER },
    'cloudinary.enabled',
  );
} else {
  logger.warn(
    'cloudinary.disabled — set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in .env and restart the server to enable media uploads',
  );
}

export const cloudinaryEnabled = () => enabled;

export { cloudinary };
