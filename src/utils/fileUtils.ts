/**
 * File Picker & Image/Video Processing Utility
 * Reads images/videos from the native file system, optimizes resolution for fast local/cloud sync.
 */

export async function readFileAsDataUrl(file: File, maxDimension: number = 1280): Promise<{
  url: string;
  type: 'image' | 'video';
  fileName: string;
  fileSize: number;
}> {
  const isVideo = file.type.startsWith('video/');

  return new Promise((resolve, reject) => {
    // If it's an image, optimize down to maxDimension to save storage/bandwidth
    if (!isVideo && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (!result) return reject(new Error('Failed to read file'));

        const img = new Image();
        img.onload = () => {
          const maxDim = maxDimension;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimized = canvas.toDataURL('image/jpeg', 0.85);
            resolve({
              url: optimized,
              type: 'image',
              fileName: file.name,
              fileSize: optimized.length,
            });
            return;
          }
          resolve({
            url: result,
            type: 'image',
            fileName: file.name,
            fileSize: file.size,
          });
        };
        img.onerror = () => {
          resolve({
            url: result,
            type: 'image',
            fileName: file.name,
            fileSize: file.size,
          });
        };
        img.src = result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    } else {
      // For videos or other media
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          url: e.target?.result as string,
          type: isVideo ? 'video' : 'image',
          fileName: file.name,
          fileSize: file.size,
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    }
  });
}
