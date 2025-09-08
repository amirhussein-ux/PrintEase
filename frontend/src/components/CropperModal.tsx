import React, { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';

type Props = {
  src: string;
  aspect?: number;
  onCancel: () => void;
  onApply: (file: File) => void;
};

// helper to create image element
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: any, rotation = 0) {
  const image = await createImage(imageSrc);

  const radians = (rotation * Math.PI) / 180;
  const maxDim = Math.max(image.width, image.height);
  const safeArea = 2 * maxDim;

  // draw the image onto a large enough canvas and rotate it
  const canvas = document.createElement('canvas');
  canvas.width = safeArea;
  canvas.height = safeArea;
  const ctx = canvas.getContext('2d')!;

  // move origin to center and rotate
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(radians);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  // extract the cropped area from the rotated image
  const dataX = Math.round(safeArea / 2 - image.width / 2 + pixelCrop.x);
  const dataY = Math.round(safeArea / 2 - image.height / 2 + pixelCrop.y);
  const data = ctx.getImageData(dataX, dataY, pixelCrop.width, pixelCrop.height);

  // put extracted data into a new canvas of the desired size
  const outCanvas = document.createElement('canvas');
  outCanvas.width = pixelCrop.width;
  outCanvas.height = pixelCrop.height;
  const outCtx = outCanvas.getContext('2d')!;
  outCtx.putImageData(data, 0, 0);

  return await new Promise<Blob | null>((resolve) => outCanvas.toBlob(resolve, 'image/png'));
}

export default function CropperModal({ src, aspect = 1, onCancel, onApply }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((_: any, croppedAreaPixelsLocal: any) => {
    setCroppedAreaPixels(croppedAreaPixelsLocal);
  }, []);

  const handleApply = useCallback(async () => {
    if (!croppedAreaPixels) return;
  const blob = await getCroppedImg(src, croppedAreaPixels, rotation);
    if (!blob) return;
    const file = new File([blob], 'logo.png', { type: 'image/png' });
    onApply(file);
  }, [croppedAreaPixels, src, onApply, rotation]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 min-h-screen" style={{ zIndex: 2147483647 }}>
      <div className="bg-white rounded-lg p-4 w-full max-w-lg" style={{ zIndex: 2147483648 }}>
        <div style={{ position: 'relative', height: 360, background: '#333' }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            cropShape="round"
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
              className="px-3 py-2 rounded bg-gray-200 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3v4m0 0a6 6 0 11-6 6H5" />
              </svg>
              Rotate
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} className="px-3 py-2 rounded bg-gray-200">Cancel</button>
            <button type="button" onClick={handleApply} className="px-3 py-2 rounded bg-blue-900 text-white">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}
