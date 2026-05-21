// Generates a 400px-wide thumbnail when a photo is uploaded
// Triggered on Cloud Storage upload to inspections/{inspectionId}/photos/

import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as admin from 'firebase-admin';
import * as path from 'path';

export const onPhotoUpload = onObjectFinalized(
  { memory: '512MiB', region: 'us-east1' },
  async (event) => {
    const filePath = event.data.name;
    if (!filePath) return;

    // Only process inspection photos, not thumbnails or baked photos
    if (!filePath.startsWith('inspections/') || filePath.includes('_thumb') || filePath.includes('_baked')) {
      return;
    }

    // Only process images
    if (!event.data.contentType?.startsWith('image/')) return;

    const bucket = admin.storage().bucket(event.data.bucket);
    const file = bucket.file(filePath);

    // Download the image
    const [buffer] = await file.download();

    // Generate thumbnail (400px wide)
    const sharp = (await import('sharp')).default;
    const thumbnail = await sharp(buffer)
      .resize(400, null, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload thumbnail
    const ext = path.extname(filePath);
    const thumbPath = filePath.replace(ext, `_thumb${ext}`);
    const thumbFile = bucket.file(thumbPath);

    await thumbFile.save(thumbnail, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: crypto.randomUUID() },
      },
    });
  }
);
