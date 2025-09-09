import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';

type PixelCrop = { x: number; y: number; width: number; height: number };

type Props = {
  src: string;
  aspect?: number;
  onCancel: () => void;
  onApply: (file: File) => void;
  /** Theme for modal content: "light" or "dark" (default). */
  theme?: "light" | "dark";
};

// Create an HTMLImageElement from a URL
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getRadianAngle(degree: number) {
  return (degree * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function getCroppedImg(imageSrc: string, pixelCrop: PixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);
  // Rotate on a temp canvas sized to fit the rotated image
  const canvas = document.createElement('canvas');
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;
  const ctx = canvas.getContext('2d')!;

  // Center, rotate, then draw
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);
  // Extract the selected crop area
  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
  // Draw crop to output canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = pixelCrop.width;
  outCanvas.height = pixelCrop.height;
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.putImageData(data, 0, 0);

  return await new Promise<Blob | null>((resolve) => outCanvas.toBlob(resolve, 'image/png'));
}

export default function CropperModal({ src, aspect = 1, onCancel, onApply, theme = "dark" }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);

  const onCropComplete = useCallback((_: unknown, croppedAreaPixelsLocal: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixelsLocal);
  }, []);

  const handleApply = useCallback(async () => {
    if (!croppedAreaPixels) return;
  const blob = await getCroppedImg(src, croppedAreaPixels, rotation);
    if (!blob) return;
    const file = new File([blob], 'logo.png', { type: 'image/png' });
    onApply(file);
  }, [croppedAreaPixels, src, onApply, rotation]);

  const isLight = theme === "light";
  const cardClasses = isLight
    ? "rounded-xl bg-white text-gray-900 border border-gray-200 shadow-xl p-4 w-full max-w-lg"
    : "rounded-xl bg-gray-900 text-white border border-white/10 shadow-xl p-4 w-full max-w-lg";
  const stageClasses = isLight ? "bg-gray-100" : "bg-gray-800";
  const rotateBtnClasses = isLight
    ? "px-3 py-2 rounded bg-gray-200 text-gray-900 hover:bg-gray-300 flex items-center gap-2"
    : "px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 flex items-center gap-2";
  const cancelBtnClasses = isLight
    ? "px-3 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
    : "px-3 py-2 rounded border border-white/10 text-white hover:bg-white/10";
  const applyBtnClasses = isLight
    ? "px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
    : "px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-500";

  const content = (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 min-h-screen" style={{ zIndex: 2147483647 }}>
      <div className={cardClasses} style={{ zIndex: 2147483648 }}>
        <div className={stageClasses} style={{ position: 'relative', height: 360 }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              title="Rotate 90°"
              className={rotateBtnClasses}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3v4m0 0a6 6 0 11-6 6H5" />
              </svg>
              Rotate
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} className={cancelBtnClasses}>Cancel</button>
            <button type="button" onClick={handleApply} className={applyBtnClasses}>Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
