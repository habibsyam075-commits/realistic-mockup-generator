import { DesignTransform } from '../App';
import { MockupType } from '../types';

export interface GenerationAssets {
  captureImage: string; // The flat composite for user preview
  guideImage: string;   // The specific image generated for the AI
}

// Helper function to draw all designs on a canvas
const drawDesignsOnCanvas = (
  ctx: CanvasRenderingContext2D,
  loadedDesignImages: HTMLImageElement[],
  designs: DesignTransform[],
  scale: number
) => {
  loadedDesignImages.forEach((designImg, index) => {
    const { position, size, rotation } = designs[index];
    
    const scaledX = position.x * scale;
    const scaledY = position.y * scale;
    const scaledWidth = size.width * scale;
    const scaledHeight = size.height * scale;
    
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
};

export const generatePreviewAndGuides = async (
  walletImageSrc: string,
  designImagesSrc: string[],
  designs: DesignTransform[],
  containerSize: { width: number; height: number },
  mockupType: MockupType
): Promise<GenerationAssets> => {
  return new Promise((resolve, reject) => {
    const walletImg = new Image();
    walletImg.crossOrigin = 'anonymous';
    walletImg.src = walletImageSrc;

    walletImg.onerror = () => reject(new Error('Failed to load wallet image for processing'));
    
    walletImg.onload = () => {
      const designImagePromises = designImagesSrc.map(src => {
        return new Promise<HTMLImageElement>((resolveImg, rejectImg) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolveImg(img);
          img.onerror = () => rejectImg(new Error(`Failed to load design image: ${src}`));
          img.src = src;
        });
      });

      Promise.all(designImagePromises).then(loadedDesignImages => {
        const fullWidth = walletImg.naturalWidth;
        const fullHeight = walletImg.naturalHeight;
        const scale = fullWidth / containerSize.width;
        
        // 1. Create a canvas with just the designs drawn on it (the "design plate")
        const designPlateCanvas = document.createElement('canvas');
        designPlateCanvas.width = fullWidth;
        designPlateCanvas.height = fullHeight;
        const designPlateCtx = designPlateCanvas.getContext('2d')!;
        designPlateCtx.imageSmoothingEnabled = false;
        drawDesignsOnCanvas(designPlateCtx, loadedDesignImages, designs, scale);

        // 2. Generate the Capture Image for user confirmation (always a flat composite)
        const captureCanvas = document.createElement('canvas');
        captureCanvas.width = fullWidth;
        captureCanvas.height = fullHeight;
        const captureCtx = captureCanvas.getContext('2d')!;
        captureCtx.drawImage(walletImg, 0, 0, fullWidth, fullHeight);
        captureCtx.drawImage(designPlateCanvas, 0, 0);
        const captureImage = captureCanvas.toDataURL('image/jpeg');
        
        let guideImage: string;

        // 3. Generate the specific Guide Image for the AI based on the mockup type
        switch (mockupType) {
          case MockupType.PRINT:
            // For PRINT, the AI guide is the same as the user preview.
            guideImage = captureImage;
            break;

          case MockupType.ENGRAVE:
          case MockupType.EMBOSS:
            // For ENGRAVE/EMBOSS, create a version with a magenta overlay
            const magentaGuideCanvas = document.createElement('canvas');
            magentaGuideCanvas.width = fullWidth;
            magentaGuideCanvas.height = fullHeight;
            const magentaCtx = magentaGuideCanvas.getContext('2d')!;
            
            // Draw the base product image first
            magentaCtx.drawImage(walletImg, 0, 0, fullWidth, fullHeight);

            // Now create the magenta version of the design from the design plate
            let imageData = designPlateCtx.getImageData(0, 0, fullWidth, fullHeight);
            let pixels = imageData.data;
            const alphaThreshold = 10;
            for (let i = 0; i < pixels.length; i += 4) {
              const alpha = pixels[i + 3];
              if (alpha > alphaThreshold) {
                pixels[i] = 255;   // R
                pixels[i + 1] = 0;   // G
                pixels[i + 2] = 255;   // B
                pixels[i + 3] = 255; // Alpha
              } else {
                pixels[i + 3] = 0; // Make transparent otherwise
              }
            }
            designPlateCtx.putImageData(imageData, 0, 0);
            
            // Draw the magenta design plate on top of the product image
            magentaCtx.drawImage(designPlateCanvas, 0, 0);
            guideImage = magentaGuideCanvas.toDataURL('image/jpeg');
            break;
        }

        resolve({ captureImage, guideImage });

      }).catch(reject);
    };
  });
};