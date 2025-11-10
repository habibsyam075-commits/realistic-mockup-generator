import { DesignTransform } from '../App';

export const createCompositeImage = async (
  walletImageSrc: string,
  designImagesSrc: string[],
  designs: DesignTransform[],
  containerSize: { width: number; height: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return reject(new Error('Could not get canvas context'));
    }

    const walletImg = new Image();
    walletImg.crossOrigin = 'anonymous';
    walletImg.src = walletImageSrc;
    
    walletImg.onload = () => {
      canvas.width = walletImg.naturalWidth;
      canvas.height = walletImg.naturalHeight;

      // Calculate scaling factors
      const scaleX = walletImg.naturalWidth / containerSize.width;
      const scaleY = walletImg.naturalHeight / containerSize.height;

      // Draw wallet image
      ctx.drawImage(walletImg, 0, 0, walletImg.naturalWidth, walletImg.naturalHeight);

      const designImagePromises = designImagesSrc.map(src => {
        return new Promise<HTMLImageElement>((resolveImg, rejectImg) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolveImg(img);
          img.onerror = () => rejectImg(new Error(`Failed to load design image: ${src}`));
          img.src = src;
        });
      });

      Promise.all(designImagePromises)
        .then(loadedDesignImages => {
          loadedDesignImages.forEach((designImg, index) => {
            const { position, size, rotation } = designs[index];
            
            const scaledX = position.x * scaleX;
            const scaledY = position.y * scaleY;
            const scaledWidth = size.width * scaleX;
            const scaledHeight = size.height * scaleY;
            
            const centerX = scaledX + scaledWidth / 2;
            const centerY = scaledY + scaledHeight / 2;
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation * Math.PI / 180);
            ctx.drawImage(
              designImg,
              -scaledWidth / 2,
              -scaledHeight / 2,
              scaledWidth,
              scaledHeight
            );
            ctx.restore();
          });
          resolve(canvas.toDataURL('image/jpeg'));
        })
        .catch(reject);
    };

    walletImg.onerror = (err) => {
      reject(new Error('Failed to load wallet image'));
    };
  });
};