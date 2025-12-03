import React, { useState, Suspense, useRef, useEffect, Component, useCallback } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Decal, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import Cropper from 'react-easy-crop';
import { saveDesign } from "@/lib/savedDesigns";
import { useAuth } from "@/context/AuthContext";
import html2canvas from 'html2canvas';
import { toast } from "react-toastify";

// --- TYPES ---
interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropPosition {
  x: number;
  y: number;
}

// --- CONFIGURATION ---
const productSettings: Record<string, any> = {
  // 3D Products
  Mug: {
    type: "3d",
    decalDefaults: { position: [0, 1, 0.5], scale: 1, minScale: 0.5, maxScale: 2 }, 
    variations: {
      White: { path: "/models/mug.glb", colorCode: "#ffffff", scale: 1, position: [0, -1, 0], rotation: [0, 0, 0], targetMeshName: "MugBody" },
      Black: { path: "/models/mug.glb", colorCode: "#1a1a1a", scale: 1, position: [0, -1, 0], rotation: [0, 0, 0], targetMeshName: "MugBody" },
      Red: { path: "/models/mug.glb", colorCode: "#D93434", scale: 1, position: [0, -1, 0], rotation: [0, 0, 0], targetMeshName: "MugBody" },
      Orange: { path: "/models/mug.glb", colorCode: "#E87C24", scale: 1, position: [0, -1, 0], rotation: [0, 0, 0], targetMeshName: "MugBody" },
      Blue: { path: "/models/mug.glb", colorCode: "#347CD9", scale: 1, position: [0, -1, 0], rotation: [0, 0, 0], targetMeshName: "MugBody" },
      Green: { path: "/models/mug.glb", colorCode: "#34A853", scale: 1, position: [0, -1, 0], rotation: [0, 0, 0], targetMeshName: "MugBody" },
      Yellow: { path: "/models/mug.glb", colorCode: "#F0DB4F", scale: 1, position: [0, -1, 0], rotation: [0, 0, 0], targetMeshName: "MugBody" },
      Purple: { path: "/models/mug.glb", colorCode: "#6A0DAD", scale: 1, position: [0, -1, 0], rotation: [0, 0, 0], targetMeshName: "MugBody" },
      Gray: { path: "/models/mug.glb", colorCode: "#808080", scale: 1, position: [0, -1, 0], rotation: [0, 0, 0], targetMeshName: "MugBody" },
      Pink: { path: "/models/mug.glb", colorCode: "#FFC0CB", scale: 1, position: [0, -1, 0], rotation: [0, 0, 0], targetMeshName: "MugBody" },
    },
  },
  "T-Shirt": {
    type: "3d",
    decalDefaults: { position: [0.1, 0.55, 0.5], scale: 0.1, minScale: 0.05, maxScale: 0.3 },
    variations: {
      White: { path: "/models/shirt.glb", colorCode: "#f2f2f2", scale: 12, position: [0, -6.4, 0], rotation: [0, 0, 0], targetMeshName: "Shirt" },
      Black: { path: "/models/shirt.glb", colorCode: "#1a1a1a", scale: 12, position: [0, -6.4, 0], rotation: [0, 0, 0], targetMeshName: "Shirt" },
      Red: { path: "/models/shirt.glb", colorCode: "#D93434", scale: 12, position: [0, -6.4, 0], rotation: [0, 0, 0], targetMeshName: "Shirt" },
      Orange: { path: "/models/shirt.glb", colorCode: "#E87C24", scale: 12, position: [0, -6.4, 0], rotation: [0, 0, 0], targetMeshName: "Shirt" },
      Blue: { path: "/models/shirt.glb", colorCode: "#347CD9", scale: 12, position: [0, -6.4, 0], rotation: [0, 0, 0], targetMeshName: "Shirt" },
      Green: { path: "/models/shirt.glb", colorCode: "#34A853", scale: 12, position: [0, -6.4, 0], rotation: [0, 0, 0], targetMeshName: "Shirt" },
      Yellow: { path: "/models/shirt.glb", colorCode: "#F0DB4F", scale: 12, position: [0, -6.4, 0], rotation: [0, 0, 0], targetMeshName: "Shirt" },
      Purple: { path: "/models/shirt.glb", colorCode: "#6A0DAD", scale: 12, position: [0, -6.4, 0], rotation: [0, 0, 0], targetMeshName: "Shirt" },
      Gray: { path: "/models/shirt.glb", colorCode: "#808080", scale: 12, position: [0, -6.4, 0], rotation: [0, 0, 0], targetMeshName: "Shirt" },
      Pink: { path: "/models/shirt.glb", colorCode: "#FFC0CB", scale: 12, position: [0, -6.4, 0], rotation: [0, 0, 0], targetMeshName: "Shirt" },
    },
  },
  
  // 2D Products
  Mousepad: {
    type: "2d",
    dimensions: { width: 300, height: 100 },
    backgroundColor: "#ffffff",
    decalDefaults: { position: [0.5, 0.5], scale: 1, minScale: 0.5, maxScale: 1 },
    variations: {
      White: { colorCode: "#ffffff" },
      Black: { colorCode: "#1a1a1a" },
      Red: { colorCode: "#D93434" },
      Blue: { colorCode: "#347CD9" },
    },
  },
  Sticker: {
    type: "2d",
    dimensions: { width: 100, height: 100 },
    backgroundColor: "#ffffff",
    decalDefaults: { position: [0.5, 0.5], scale: 0.6, minScale: 0.1, maxScale: 1 },
    variations: {
      White: { colorCode: "#ffffff" },
      Transparent: { colorCode: "transparent" },
    },
  },
  "Phone Case": {
    type: "2d",
    dimensions: { width: 80, height: 160 },
    backgroundColor: "#ffffff",
    decalDefaults: { position: [0.5, 0.5], scale: 0.4, minScale: 0.05, maxScale: 0.8 },
    variations: {
      Black: { colorCode: "#1a1a1a" },
      White: { colorCode: "#ffffff" },
      Clear: { colorCode: "rgba(255,255,255,0.1)" },
    },
  },
};

// --- Error Boundary ---
class ErrorBoundary extends Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error in Canvas:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-400 text-center">Something went wrong with the preview. Please reload.</div>;
    }
    return this.props.children;
  }
}

// --- Loader ---
function Loader() {
  return (
    <Html center>
      <div className="text-white text-lg animate-pulse">Loading Model...</div>
    </Html>
  );
}

// --- Product Model Component (3D) ---
function ProductModel3D({
  decalTexture, decalPosition, decalScale, modelPath, scale, position, rotation, targetMeshName, baseColor
}: {
  decalTexture: THREE.Texture | null;
  decalPosition: [number, number, number];
  decalScale: number;
  modelPath: string;
  scale: number | [number, number, number];
  position: [number, number, number];
  rotation: [number, number, number];
  targetMeshName: string;
  baseColor: string;
}) {
  if (!modelPath) return <Loader />;
  const { nodes } = useGLTF(modelPath);
  const [actualMesh, setActualMesh] = useState<THREE.Mesh | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [textureAspect, setTextureAspect] = useState(1);

  useEffect(() => {
    if (!nodes[targetMeshName]) {
      console.warn(`⚠️ Target Mesh "${targetMeshName}" not found. Available nodes:`, Object.keys(nodes));
    }

    const targetNode = nodes[targetMeshName];
    if (!targetNode) return;
    
    let foundMesh: THREE.Mesh | null = null;
    if (targetNode.isMesh) foundMesh = targetNode as THREE.Mesh;
    else {
      targetNode.traverse((child) => {
        if (child instanceof THREE.Mesh && !foundMesh) foundMesh = child;
      });
    }
    setActualMesh(foundMesh || null);
  }, [nodes, targetMeshName, modelPath]);

  useEffect(() => {
    if (decalTexture) {
      decalTexture.anisotropy = 16;
      decalTexture.needsUpdate = true;

      const { image } = decalTexture;
      if (image && image.width && image.height) {
        setTextureAspect(image.width / image.height);
      }
    }
  }, [decalTexture]); 

  if (!actualMesh) return null;

  const adjustedWidth = decalScale * textureAspect;
  const adjustedHeight = decalScale;
  const decalDepth = 1; 

  return (
    <group scale={scale} position={position} rotation={rotation}>
      <mesh ref={meshRef} geometry={actualMesh.geometry} castShadow receiveShadow>
        <meshStandardMaterial 
          key={decalTexture?.uuid || "base-material"}
          color={baseColor} 
          roughness={0.8} 
          metalness={0.1} 
        />
        
        {decalTexture && (
          <Decal
            position={decalPosition}
            rotation={[0, 0, 0]}
            scale={[adjustedWidth, adjustedHeight, decalDepth]} 
            map={decalTexture}
            mesh={meshRef}
          >
            <meshStandardMaterial
              map={decalTexture}
              polygonOffset
              polygonOffsetFactor={-1} 
              transparent
              roughness={1}
              toneMapped={false} 
            />
          </Decal>
        )}
      </mesh>
    </group>
  );
}

// --- 2D Product Preview Component ---
function Product2DPreview({
  decalImage,
  position,
  scale,
  dimensions,
  backgroundColor
}: {
  decalImage: string | null;
  position: [number, number];
  scale: number;
  dimensions: { width: number; height: number };
  backgroundColor: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 400, height: 400 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setContainerSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const scaleFactor = Math.min(
    containerSize.width / dimensions.width,
    containerSize.height / dimensions.height
  ) * 0.9;

  const displayWidth = dimensions.width * scaleFactor;
  const displayHeight = dimensions.height * scaleFactor;

  const imageWidth = displayWidth * scale;
  const imageHeight = displayHeight * scale;
  const imageLeft = (displayWidth - imageWidth) * position[0];
  const imageTop = (displayHeight - imageHeight) * (1 - position[1]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center relative"
    >
      <div 
        className="relative border-2 border-gray-700 rounded-lg shadow-2xl"
        style={{
          width: displayWidth,
          height: displayHeight,
          backgroundColor,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `linear-gradient(to right, #666 1px, transparent 1px),
                             linear-gradient(to bottom, #666 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} />
        </div>

        {decalImage && (
          <div
            className="absolute border-2 border-blue-400/50 rounded-lg overflow-hidden transition-all duration-200"
            style={{
              width: imageWidth,
              height: imageHeight,
              left: imageLeft,
              top: imageTop,
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
            }}
          >
            <img
              src={decalImage}
              alt="Design"
              className="w-full h-full object-cover"
            />
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
          </div>
        )}

        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm font-mono">
          {dimensions.width}mm × {dimensions.height}mm
        </div>
      </div>
    </div>
  );
}

// --- Image Cropper Modal ---
interface CropperModalProps {
  image: string;
  onClose: () => void;
  onCropComplete: (croppedImage: string) => void;
  aspectRatio: number;
}

function CropperModal({ image, onClose, onCropComplete, aspectRatio }: CropperModalProps) {
  const [crop, setCrop] = useState<CropPosition>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (crop: CropPosition) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async () => {
    if (!croppedAreaPixels) return;
    
    try {
      setIsProcessing(true);
      const imageEl = await createImage(image);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('No 2d context');

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.translate(croppedAreaPixels.width / 2, croppedAreaPixels.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-croppedAreaPixels.width / 2, -croppedAreaPixels.height / 2);

      ctx.drawImage(
        imageEl,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      return new Promise<string>((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const croppedImageUrl = URL.createObjectURL(blob);
          resolve(croppedImageUrl);
        }, 'image/png');
      });
    } catch (error) {
      console.error('Error cropping image:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyCrop = async () => {
    const croppedImage = await getCroppedImg();
    if (croppedImage) {
      onCropComplete(croppedImage);
      onClose();
    }
  };

  const handleRotateLeft = () => {
    setRotation((prev) => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation((prev) => prev + 90);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 w-full max-w-4xl mx-4 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Crop & Adjust Your Design</h3>
            <p className="text-gray-400 text-sm mt-1">Drag to reposition, scroll to zoom, rotate as needed</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="relative h-[400px] bg-gray-900 rounded-lg overflow-hidden">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={(croppedArea, croppedAreaPixels) => {
                setCroppedAreaPixels(croppedAreaPixels);
              }}
              classes={{
                containerClassName: "rounded-lg",
                cropAreaClassName: "border-2 border-blue-400 shadow-lg",
              }}
              restrictPosition={false}
            />
          </div>

          <div className="mt-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-200">Zoom</label>
                <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded text-blue-300">
                  {zoom.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">Rotation</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleRotateLeft}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex-1">
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                  />
                </div>
                
                <button
                  onClick={handleRotateRight}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
                
                <div className="text-center min-w-[60px]">
                  <span className="text-lg font-mono text-blue-300">{rotation}°</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyCrop}
            disabled={isProcessing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </>
            ) : (
              'Apply Crop'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// --- Draggable Position Control ---
interface DraggablePositionControlProps {
  position: [number, number];
  onChange: (position: [number, number]) => void;
  productType: '3d' | '2d';
  productName: string;
}

function DraggablePositionControl({ position, onChange, productType, productName }: DraggablePositionControlProps) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getDefaultPosition = (): [number, number] => {
    if (productType === '3d') {
      if (productName === 'Mug') return [0.5, 0.5];
      if (productName === 'T-Shirt') return [0.5, 0.5];
    }
    return [0.5, 0.5];
  };

  const defaultPosition = getDefaultPosition();

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    updatePosition(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e.touches[0]);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    updatePosition(e.touches[0]);
  };

  const updatePosition = (event: MouseEvent | Touch) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = 1 - (event.clientY - rect.top) / rect.height;
    
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));
    
    onChange([clampedX, clampedY]);
  };

  const handleDotClick = (dotPosition: [number, number]) => {
    onChange(dotPosition);
  };

  const handleResetPosition = () => {
    onChange(defaultPosition);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="bg-gray-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-gray-200">Drag to Position</label>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetPosition}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </button>
          <div className="text-xs text-gray-400 font-mono">
            X: {position[0].toFixed(2)} | Y: {position[1].toFixed(2)}
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="relative w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-600 overflow-hidden cursor-crosshair"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `linear-gradient(to right, #666 1px, transparent 1px),
                             linear-gradient(to bottom, #666 1px, transparent 1px)`,
            backgroundSize: '25% 25%'
          }} />
        </div>

        <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/30 transform -translate-y-1/2"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/30 transform -translate-x-1/2"></div>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4">
          <div className="absolute top-0 left-1/2 w-px h-2 bg-blue-400/50 transform -translate-x-1/2"></div>
          <div className="absolute bottom-0 left-1/2 w-px h-2 bg-blue-400/50 transform -translate-x-1/2"></div>
          <div className="absolute left-0 top-1/2 w-2 h-px bg-blue-400/50 transform -translate-y-1/2"></div>
          <div className="absolute right-0 top-1/2 w-2 h-px bg-blue-400/50 transform -translate-y-1/2"></div>
        </div>

        <div className="absolute top-1/4 left-1/4">
          <div 
            className="w-3 h-3 bg-blue-400/30 rounded-full border border-blue-400/50 cursor-pointer hover:scale-150 transition-transform"
            onClick={() => handleDotClick([0.25, 0.75])}
          />
        </div>
        <div className="absolute top-1/4 left-3/4">
          <div 
            className="w-3 h-3 bg-blue-400/30 rounded-full border border-blue-400/50 cursor-pointer hover:scale-150 transition-transform"
            onClick={() => handleDotClick([0.75, 0.75])}
          />
        </div>
        <div className="absolute top-3/4 left-1/4">
          <div 
            className="w-3 h-3 bg-blue-400/30 rounded-full border border-blue-400/50 cursor-pointer hover:scale-150 transition-transform"
            onClick={() => handleDotClick([0.25, 0.25])}
          />
        </div>
        <div className="absolute top-3/4 left-3/4">
          <div 
            className="w-3 h-3 bg-blue-400/30 rounded-full border border-blue-400/50 cursor-pointer hover:scale-150 transition-transform"
            onClick={() => handleDotClick([0.75, 0.25])}
          />
        </div>

        <div 
          className="absolute w-8 h-8 rounded-full border-2 border-blue-400 bg-blue-400/20 flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 shadow-lg z-10"
          style={{
            left: `${position[0] * 100}%`,
            top: `${(1 - position[1]) * 100}%`
          }}
        >
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
        </div>

        <div 
          className="absolute w-6 h-6 rounded-full border border-blue-300/30 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${defaultPosition[0] * 100}%`,
            top: `${(1 - defaultPosition[1]) * 100}%`
          }}
        >
          <div className="w-1.5 h-1.5 bg-blue-300/30 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>

        <div className="absolute top-2 left-2 text-xs text-gray-500">Top Left</div>
        <div className="absolute top-2 right-2 text-xs text-gray-500">Top Right</div>
        <div className="absolute bottom-2 left-2 text-xs text-gray-500">Bottom Left</div>
        <div className="absolute bottom-2 right-2 text-xs text-gray-500">Bottom Right</div>
      </div>

      <div className="mt-3 text-xs text-gray-400 text-center">
        Drag the blue circle or click preset dots • Blue dot = current, Gray dot = default
      </div>
    </div>
  );
}

// --- Helper function for fallback thumbnail ---
async function createFallbackThumbnail(productType: string, color: string, preview: string | null): Promise<string> {
  console.log("🔄 Creating fallback thumbnail...");
  
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return preview || '';
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 800, 600);
  gradient.addColorStop(0, '#1e293b');
  gradient.addColorStop(1, '#0f172a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 600);
  
  // Add product icon
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.font = 'bold 72px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (productType === 'Mug') {
    ctx.fillText('☕', 400, 200);
  } else if (productType === 'T-Shirt') {
    ctx.fillText('👕', 400, 200);
  } else if (productType === 'Mousepad') {
    ctx.fillText('🖱️', 400, 200);
  } else if (productType === 'Sticker') {
    ctx.fillText('🏷️', 400, 200);
  } else if (productType === 'Phone Case') {
    ctx.fillText('📱', 400, 200);
  } else {
    ctx.fillText('🎨', 400, 200);
  }
  
  // Add text
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(productType || 'Custom Design', 400, 300);
  
  ctx.font = '18px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('Custom Design Preview', 400, 340);
  
  // Add color indicator
  ctx.fillStyle = color || '#ffffff';
  ctx.beginPath();
  ctx.arc(400, 400, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  return canvas.toDataURL('image/png', 1.0);
}

// --- MAIN CUSTOMIZER ---
const Customize: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'2d' | '3d'>('3d');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  
  const [draggablePosition, setDraggablePosition] = useState<[number, number]>([0.5, 0.5]);
  const [decal3DScale, setDecal3DScale] = useState(0.15);
  const [decal2DPosition, setDecal2DPosition] = useState<[number, number]>([0.5, 0.5]);
  const [decal2DScale, setDecal2DScale] = useState(0.5);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const available3DProducts = Object.keys(productSettings).filter(
    product => productSettings[product].type === "3d"
  );
  const available2DProducts = Object.keys(productSettings).filter(
    product => productSettings[product].type === "2d"
  );

  const currentProductInfo = selectedProduct ? productSettings[selectedProduct] : null;
  const currentVariation = selectedProduct && selectedColor ? currentProductInfo?.variations[selectedColor] : null;
  const decalScaleRange = currentProductInfo ? currentProductInfo.decalDefaults : { minScale: 0, maxScale: 1 };

  useEffect(() => {
    if (location.state?.storeId) {
      console.log("📦 Store ID from navigation state:", location.state.storeId);
      localStorage.setItem("customerStoreId", location.state.storeId);
      
      if (!localStorage.getItem("customerStoreId")) {
        console.log("⚠️ No store ID found, setting from navigation state");
      }
    }
    
    console.log("🔍 Current localStorage customerStoreId:", localStorage.getItem("customerStoreId"));
  }, [location.state]);

  const convertTo3DPosition = (position2D: [number, number]): [number, number, number] => {
    if (!selectedProduct) return [0, 0, 0];
    
    const product = productSettings[selectedProduct];
    if (product.type !== '3d') return [0, 0, 0];
    
    const defaults = product.decalDefaults.position;
    
    if (selectedProduct === 'Mug') {
      const x = (position2D[0] - 0.5) * 0.6;
      const y = 0.8 + (position2D[1] * 0.7);
      return [x, y, defaults[2]];
    } else if (selectedProduct === 'T-Shirt') {
      const x = (position2D[0] - 0.5);
      const y = 0.3 + (position2D[1] * 0.5);
      return [x, y, defaults[2]];
    }
    
    return defaults;
  };

  const decal3DPosition = convertTo3DPosition(draggablePosition);

  const resetDecalSettings = (productName: string | null) => {
    if (productName && productSettings[productName]) {
      const defaults = productSettings[productName].decalDefaults;
      if (productSettings[productName].type === "3d") {
        setDraggablePosition([0.5, 0.5]);
        setDecal3DScale(defaults.scale);
      } else {
        setDecal2DPosition(defaults.position);
        setDecal2DScale(defaults.scale);
      }
    }
  };

  const processFile = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setNotification("Please upload a valid image file (PNG, JPG, JPEG).");
      return;
    }

    const url = URL.createObjectURL(file);
    setOriginalImage(url);
    setPreview(url);
    
    const img = new Image();
    img.onload = () => {
      setAspectRatio(img.width / img.height);
      setImageToCrop(url);
      setShowCropper(true);
    };
    img.src = url;
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    setPreview(croppedImageUrl);
    
    const loader = new THREE.TextureLoader();
    loader.load(
      croppedImageUrl, 
      (loadedTexture) => {
        loadedTexture.encoding = THREE.sRGBEncoding;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
        setNotification('Failed to load image. Please try another file.');
      }
    );
  };

  const handleEditCrop = () => {
    if (originalImage) {
      setImageToCrop(originalImage);
      setShowCropper(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleProductSelect = (productName: string) => {
    setSelectedProduct(productName);
    const firstColor = Object.keys(productSettings[productName].variations)[0];
    setSelectedColor(firstColor);
    resetDecalSettings(productName);
    setPreview(null); 
    setTexture(null); 
    setOriginalImage(null);
    setAspectRatio(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleColorSelect = (colorName: string) => setSelectedColor(colorName);

  const handleReset = () => {
    setPreview(null);
    setTexture(null);
    setOriginalImage(null);
    setAspectRatio(1);
    setSelectedProduct(null);
    setSelectedColor(null);
    setDraggablePosition([0.5, 0.5]);
    setDecal3DScale(0.15);
    setDecal2DPosition([0.5, 0.5]);
    setDecal2DScale(0.5);
    setAutoRotate(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setNotification(null);
  };

  const handleBuy = () => {
    if (!selectedProduct) { 
      setNotification("Please select a product first."); 
      return; 
    }
    setNotification(null); 
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setModalClosing(true);
    setTimeout(() => { setShowModal(false); setModalClosing(false); }, 300);
  };

  const handleDraggablePositionChange = (position: [number, number]) => {
    setDraggablePosition(position);
  };

  const handleDecal2DPositionChange = (position: [number, number]) => {
    setDecal2DPosition(position);
  };

  // FIXED: COMPLETE handleSaveAndProceed function with proper thumbnail capture
 const handleSaveAndProceed = async () => {
  if (!selectedProduct || !selectedColor || !preview || !user) {
    setNotification("Please complete your design first.");
    return;
  }

  try {
    setIsSaving(true);
    
    let storeId = localStorage.getItem("customerStoreId") || location.state?.storeId;
    
    if (!storeId) {
      setNotification("Please select a store first.");
      setTimeout(() => navigate("/customer/select-shop"), 2000);
      return;
    }

    console.log("💾 SAVING DESIGN...");
    
    let dataUrlForSaving = preview;
    
    if (preview.startsWith('blob:')) {
      console.log("Converting blob URL to data URL...");
      try {
        const response = await fetch(preview);
        const blob = await response.blob();
        dataUrlForSaving = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        console.log("✅ Converted to data URL, length:", dataUrlForSaving.length);
      } catch (error) {
        console.error("❌ Conversion failed:", error);
        setNotification("Failed to process image. Please try again.");
        return;
      }
    }

    const response = await fetch(dataUrlForSaving);
    const blob = await response.blob();
    const designFile = new File([blob], `design-${selectedProduct}-${Date.now()}.png`, {
      type: "image/png"
    });

    const thumbnailFile = new File([blob], `thumbnail-${selectedProduct}-${Date.now()}.png`, {
      type: "image/png"
    });

    const designData = {
      productType: selectedProduct,
      color: selectedColor,
      storeId,
      customization: {
        position: currentProductInfo?.type === '3d' 
          ? { x: draggablePosition[0], y: draggablePosition[1] }
          : { x: decal2DPosition[0], y: decal2DPosition[1] },
        scale: currentProductInfo?.type === '3d' ? decal3DScale : decal2DScale,
        // CRITICAL: Save as data URL for thumbnails to work
        originalImage: dataUrlForSaving
      },
      name: `My ${selectedProduct} Design`,
      tags: ['custom', selectedProduct.toLowerCase().replace(' ', '-'), selectedColor]
    };

    console.log("📦 Saving design with data URL:", {
      dataUrlLength: dataUrlForSaving.length,
      dataUrlPreview: dataUrlForSaving.substring(0, 100)
    });

    await saveDesign(designData, designFile, thumbnailFile);
    
    toast.success("✅ Design saved!");
    
    setTimeout(() => {
      navigate("/dashboard/saved-designs");
    }, 1000);
    
  } catch (error) {
    console.error("❌ Save failed:", error);
    setNotification("Failed to save design. Please try again.");
  } finally {
    setIsSaving(false);
  }
};

  useEffect(() => {
    useGLTF.preload("/models/mug.glb");
    useGLTF.preload("/models/shirt.glb");
  }, []);

  return (
    <DashboardLayout role="customer">
      <div className="w-full max-w-7xl mx-auto">
        <div className="mt-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wide">
            Customize your Product
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            Design your perfect product with real-time {activeTab === '3d' ? '3D' : '2D'} preview
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex rounded-xl bg-gray-800 p-1 border border-gray-700">
            <button
              onClick={() => {
                setActiveTab('3d');
                setSelectedProduct(null);
                setSelectedColor(null);
              }}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === '3d'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
                3D Products
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab('2d');
                setSelectedProduct(null);
                setSelectedColor(null);
              }}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === '2d'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                2D Products
              </span>
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row gap-6 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 shadow-2xl border border-gray-700">
          
          <aside 
            ref={sidebarRef}
            className="w-full lg:w-96 bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700 p-6 flex flex-col shadow-lg"
            style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
          >
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <label htmlFor="product-select" className="block text-sm font-semibold text-gray-200 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  SELECT PRODUCT
                </label>
                <select 
                  id="product-select" 
                  value={selectedProduct || ""} 
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full p-3 bg-gray-700/80 border border-gray-600 rounded-xl text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:bg-gray-700"
                >
                  <option value="" disabled className="text-gray-400">Choose a product...</option>
                  {activeTab === '3d' 
                    ? available3DProducts.map((product) => (
                        <option key={product} value={product} className="bg-gray-800">{product}</option>
                      ))
                    : available2DProducts.map((product) => (
                        <option key={product} value={product} className="bg-gray-800">{product}</option>
                      ))
                  }
                </select>
              </div>

              {selectedProduct && currentProductInfo && (
                <>
                  <div className="space-y-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                        isDraggingOver 
                          ? 'border-blue-400 bg-blue-900/20 scale-[1.02]' 
                          : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3 pointer-events-none">
                        <div className="p-3 bg-blue-500/10 rounded-full">
                          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-200 block">Upload Your Design</span>
                          <span className="text-xs text-gray-400 mt-1 block">PNG or JPG • Drag & Drop</span>
                        </div>
                      </div>
                      <input type="file" accept="image/png, image/jpeg, image/jpg" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    </div>

                    {preview && (
                      <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-200">Image Preview</span>
                          <button 
                            onClick={handleEditCrop}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Edit Crop
                          </button>
                        </div>
                        <div className="relative h-32 rounded-lg overflow-hidden border border-gray-600">
                          <img 
                            src={preview} 
                            alt="Design Preview" 
                            className="w-full h-full object-contain bg-gray-800"
                          />
                        </div>
                        <div className="mt-2 text-xs text-gray-400 text-center">
                          Click "Edit Crop" to adjust rotation and position
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6 pt-4 border-t border-gray-700">
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                        </svg>
                        PRODUCT COLOR
                      </label>
                      <div className="flex gap-2 flex-wrap"> 
                        {Object.entries(currentProductInfo.variations).map(([colorName, colorData]: [string, any]) => (
                          <button 
                            key={colorName} 
                            onClick={() => handleColorSelect(colorName)}
                            className={`w-10 h-10 rounded-xl border-3 transition-all duration-200 transform hover:scale-110 shadow-lg ${
                              selectedColor === colorName 
                                ? 'border-blue-400 scale-110 ring-2 ring-blue-400/30' 
                                : 'border-gray-600 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: colorData.colorCode }} 
                            title={colorName} 
                          />
                        ))}
                      </div>
                    </div>

                    {preview && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-semibold text-gray-200">DESIGN SCALE</label>
                            <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded text-blue-300">
                              {currentProductInfo.type === '3d' ? decal3DScale.toFixed(2) : decal2DScale.toFixed(2)}
                            </span>
                          </div>
                          <input 
                            type="range" 
                            min={decalScaleRange.minScale} 
                            max={decalScaleRange.maxScale} 
                            step="0.01" 
                            value={currentProductInfo.type === '3d' ? decal3DScale : decal2DScale}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (currentProductInfo.type === '3d') {
                                setDecal3DScale(value);
                              } else {
                                setDecal2DScale(value);
                              }
                            }} 
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-200 mb-3">DESIGN POSITION</label>
                          {currentProductInfo.type === '3d' ? (
                            <DraggablePositionControl
                              position={draggablePosition}
                              onChange={handleDraggablePositionChange}
                              productType="3d"
                              productName={selectedProduct}
                            />
                          ) : (
                            <DraggablePositionControl
                              position={decal2DPosition}
                              onChange={handleDecal2DPositionChange}
                              productType="2d"
                              productName={selectedProduct}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {notification && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="text-red-400 text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {notification}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={handleReset} 
                    className="flex-1 py-3.5 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold text-white text-sm border border-gray-600 shadow-sm transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset
                  </button>
                  <button 
                    type="button" 
                    onClick={handleBuy} 
                    disabled={!selectedProduct}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 font-semibold text-white text-sm shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1 flex items-start justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 p-6 shadow-2xl relative">
            {selectedProduct && currentProductInfo && currentProductInfo.type === '3d' && (
              <div className="absolute top-4 right-4 z-10">
                <label className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 cursor-pointer transition-all duration-200">
                  <input
                    type="checkbox"
                    checked={autoRotate}
                    onChange={(e) => setAutoRotate(e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 focus:ring-offset-gray-800 focus:ring-2 focus:ring-offset-2 cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <svg className={`w-4 h-4 ${autoRotate ? 'text-blue-400 animate-spin' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className={`text-sm font-medium ${autoRotate ? 'text-blue-300' : 'text-gray-300'}`}>
                      Rotate
                    </span>
                  </div>
                </label>
              </div>
            )}
            
            <div 
              ref={canvasRef}
              className="w-full h-[600px] rounded-xl border-2 border-gray-700 overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 shadow-inner"
            >
              <ErrorBoundary>
                {selectedProduct && selectedColor && currentVariation ? (
                  currentProductInfo.type === '3d' ? (
                    <div 
                      id={`preview-canvas-${selectedProduct}-${selectedColor}`}
                      className="w-full h-full"
                    >
                      <Canvas 
                        key={`${currentVariation.path}-${selectedColor}`} 
                        camera={{ position: [0, 0, 5], fov: 50 }}
                        onPointerDown={() => setIsDragging(true)} 
                        onPointerUp={() => setIsDragging(false)}
                        onCreated={({ gl }) => {
                          gl.domElement.addEventListener('webglcontextlost', (e) => {
                            console.error('WebGL context lost');
                            e.preventDefault();
                          }, false);
                        }}
                      >
                        <ambientLight intensity={0.8} />
                        <Environment preset="city" />
                        <Suspense fallback={<Loader />}>
                          <ProductModel3D 
                            decalTexture={texture} 
                            decalPosition={decal3DPosition} 
                            decalScale={decal3DScale} 
                            modelPath={currentVariation.path}
                            scale={currentVariation.scale} 
                            position={currentVariation.position} 
                            rotation={currentVariation.rotation}
                            targetMeshName={currentVariation.targetMeshName} 
                            baseColor={currentVariation.colorCode} 
                          />
                        </Suspense>
                        <OrbitControls 
                          enablePan={false} 
                          minDistance={2} 
                          maxDistance={10} 
                          autoRotate={autoRotate && !isDragging} 
                          autoRotateSpeed={1.5} 
                        />
                      </Canvas>
                    </div>
                  ) : (
                    <div 
                      id={`2d-preview-${selectedProduct}-${selectedColor}`}
                      className="w-full h-full"
                    >
                      <Product2DPreview
                        decalImage={preview}
                        position={decal2DPosition}
                        scale={decal2DScale}
                        dimensions={currentProductInfo.dimensions}
                        backgroundColor={currentVariation.colorCode}
                      />
                    </div>
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p className="text-xl font-medium text-gray-300 mb-2">Ready to Create?</p>
                    <p className="text-sm text-gray-500 text-center max-w-sm">
                      Select a {activeTab === '3d' ? '3D' : '2D'} product and start customizing with your own design
                    </p>
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      {showCropper && imageToCrop && (
        <CropperModal
          image={imageToCrop}
          onClose={() => {
            setShowCropper(false);
            setImageToCrop(null);
          }}
          onCropComplete={handleCropComplete}
          aspectRatio={aspectRatio}
        />
      )}

      {(showModal || modalClosing) && createPortal(
        <div 
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ${
            modalClosing ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div 
            className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl w-full max-w-md mx-4 transform transition-all duration-300 ${
              modalClosing 
                ? 'scale-95 opacity-0 translate-y-4' 
                : 'scale-100 opacity-100 translate-y-0'
            }`}
          >
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Order Confirmation</h3>
                    <p className="text-sm text-gray-400">Review your customized product</p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-xl border border-gray-600 flex items-center justify-center">
                    {selectedProduct === 'Mug' && (
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.75 7.75h-16.5M6 4.75h12M18.25 7.75V19a2.25 2.25 0 01-2.25 2.25H8A2.25 2.25 0 015.75 19V7.75" />
                      </svg>
                    )}
                    {selectedProduct === 'T-Shirt' && (
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M22 21v-2a4 4 0 00-3-3.87m-3-12a4 4 0 010 7.75" />
                      </svg>
                    )}
                    {selectedProduct === 'Mousepad' && (
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="4" y="4" width="16" height="16" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                      </svg>
                    )}
                    {selectedProduct === 'Phone Case' && (
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="3" width="12" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
                      </svg>
                    )}
                    {selectedProduct === 'Sticker' && (
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-1">{selectedProduct}</h4>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border border-gray-600"
                        style={{ backgroundColor: currentProductInfo?.variations[selectedColor || '']?.colorCode || '#ffffff' }}
                      />
                      <span className="text-sm text-gray-400">{selectedColor}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-300">Customization Status</span>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg">Complete</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Design Uploaded</span>
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Position & Scale</span>
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Ready for Production</span>
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={handleCloseModal}
                  className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-medium text-white text-sm border border-gray-600 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Continue Editing
                </button>
                <button 
                  onClick={handleSaveAndProceed}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 font-medium text-white text-sm shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Save & Proceed
                    </>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-gray-500 mt-4 pt-4 border-t border-gray-700/50">
                Your design will be saved in your account for 30 days
              </p>
            </div>
          </div>
        </div>, 
        document.body
      )}
      
      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e40af;
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
        }
        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e40af;
          boxShadow: 0 2px 6px rgba(59, 130, 246, 0.4);
        }
        
        aside::-webkit-scrollbar {
          width: 6px;
        }
        aside::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.4);
          border-radius: 3px;
        }
        aside::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 3px;
        }
        aside::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Customize;