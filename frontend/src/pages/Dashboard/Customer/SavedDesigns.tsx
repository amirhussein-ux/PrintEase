import React, { useState, useEffect, Suspense, useRef } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { getMyDesigns, deleteDesign, getThumbnailUrl, type SavedDesign } from "@/lib/savedDesigns";
import { FiTrash2, FiEdit, FiDownload, FiEye, FiShoppingCart, FiShare2, FiCopy, FiFilter, FiX, FiRefreshCw } from "react-icons/fi";
import { MdOutlineAddShoppingCart, MdOutline3dRotation, MdOutlineImage, MdOutlineRotateRight, MdOutlineZoomIn, MdOutlineZoomOut, MdOutline3dRotation as Md3dRotation } from "react-icons/md";
import { TbColorSwatch, TbPhotoEdit, TbArrowsMaximize, TbRotate, TbRotate2 } from "react-icons/tb";
import { toast } from "react-toastify";
import ConfirmDialog from "../shared_components/ConfirmDialog";
import { useNavigate } from "react-router-dom";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Decal, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";

const productSettings: Record<string, any> = {
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

// Theme Variables for consistent dark/light mode - WHITE THEME
const PANEL_SURFACE = "rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const SOFT_PANEL = "rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const INPUT_SURFACE = "rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400";
const MUTED_TEXT = "text-gray-600 dark:text-gray-300";
const MUTED_TEXT_LIGHT = "text-gray-500 dark:text-gray-400";
const BACKGROUND_GRADIENT = "bg-gradient-to-b from-gray-50 via-white to-gray-100 text-gray-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white";
const CARD_BACKGROUND = "bg-white dark:bg-gray-800";
const CARD_BORDER = "border border-gray-200 dark:border-gray-700";
const CARD_HOVER = "hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xl";
const BUTTON_PRIMARY = "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700";
const BUTTON_SECONDARY = "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-500";
const BUTTON_FILTER_ACTIVE = "bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700";
const BUTTON_FILTER_INACTIVE = "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700";
const STATS_CARD = "bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700";
const STORE_INFO_BG = "bg-gray-50 dark:bg-gray-700/30";
const MODAL_OVERLAY = "bg-black/50 dark:bg-black/70";
const IMAGE_BACKGROUND = "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900";

class ErrorBoundary extends React.Component<any, { hasError: boolean }> {
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
      return <div className="p-4 text-red-600 dark:text-red-400 text-center">Something went wrong with the preview. Please reload.</div>;
    }
    return this.props.children;
  }
}

function Loader() {
  return (
    <Html center>
      <div className="text-gray-900 dark:text-white text-lg animate-pulse">Loading Model...</div>
    </Html>
  );
}

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

// --- UPDATED: 2D Product Preview Component (Matching Customize) ---
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
        className="relative border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-2xl"
        style={{
          width: displayWidth,
          height: displayHeight,
          backgroundColor,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `linear-gradient(to right, #999 1px, transparent 1px),
                             linear-gradient(to bottom, #999 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} />
        </div>

        {decalImage && (
          <div
            className="absolute border-2 border-blue-400/50 rounded-lg overflow-hidden"
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

        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-gray-600 dark:text-gray-400 text-sm font-mono">
          {dimensions.width}mm × {dimensions.height}mm
        </div>
      </div>
    </div>
  );
}

interface PreviewModalProps {
  design: SavedDesign;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ design, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const navigate = useNavigate();
  
  // ENHANCED: Enhanced rotation controls
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [rotationAxis, setRotationAxis] = useState<'y' | 'x'>('y');
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const productInfo = productSettings[design.productType];
  const variation = productInfo?.variations[design.color];

  const getPreviewImage = (): string => {
    if (design.customization?.originalImage) {
      const img = design.customization.originalImage;
      if (img.startsWith('data:image/')) {
        return img;
      }
    }
    
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    return `${baseUrl}/api/saved-designs/${design._id}/image`;
  };

  const previewImage = getPreviewImage();
  const is3DProduct = ['Mug', 'T-Shirt'].includes(design.productType);
  const is2DProduct = ['Mousepad', 'Sticker', 'Phone Case'].includes(design.productType);

  useEffect(() => {
    if (is3DProduct && previewImage) {
      const loader = new THREE.TextureLoader();
      loader.load(
        previewImage,
        (loadedTexture) => {
          loadedTexture.encoding = THREE.sRGBEncoding;
          loadedTexture.anisotropy = 16;
          setTexture(loadedTexture);
          setIsLoading(false);
        },
        undefined,
        (error) => {
          console.error('Error loading texture:', error);
          setImageError(true);
          setIsLoading(false);
        }
      );
    } else {
      setIsLoading(false);
    }
  }, [previewImage, is3DProduct]);

  const getDecalPosition = (): [number, number, number] => {
    if (!design.customization?.position) {
      return productInfo?.decalDefaults?.position || [0, 0, 0];
    }
    
    const position2D = [design.customization.position.x, design.customization.position.y] as [number, number];
    
    if (design.productType === 'Mug') {
      const x = (position2D[0] - 0.5) * 0.6;
      const y = 0.8 + (position2D[1] * 0.7);
      return [x, y, productInfo?.decalDefaults?.position[2] || 0.5];
    } else if (design.productType === 'T-Shirt') {
      const x = (position2D[0] - 0.5);
      const y = 0.3 + (position2D[1] * 0.5);
      return [x, y, productInfo?.decalDefaults?.position[2] || 0.5];
    }
    
    return productInfo?.decalDefaults?.position || [0, 0, 0];
  };

  const getProductTypeColor = (productType: string) => {
    switch (productType) {
      case 'Mug': return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
      case 'T-Shirt': return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
      case 'Mousepad': return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700';
      case 'Sticker': return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      case 'Phone Case': return 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700';
      default: return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const handleResetCamera = () => {
    // Reset all camera settings
    setAutoRotate(false);
    setRotationSpeed(1);
    setRotationAxis('y');
    setZoomLevel(1);
  };

  const handleOrderNow = () => {
    navigate(`/dashboard/customer/?designId=${design._id}`);
    onClose();
  };

  return (
    <div 
      className={`fixed inset-0 z-50 ${MODAL_OVERLAY} backdrop-blur-sm flex items-center justify-center p-4`}
      onClick={onClose}
    >
      <div 
        className={`${PANEL_SURFACE} w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{design.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getProductTypeColor(design.productType)}`}>
                {design.productType}
              </span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: design.color || '#ffffff' }}
                />
                <span className={`text-sm ${MUTED_TEXT}`}>{design.color}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-12rem)] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : imageError ? (
            <div className={`flex flex-col items-center justify-center h-96 ${MUTED_TEXT}`}>
              <p className="text-lg">Failed to load preview</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{design.name}</p>
            </div>
          ) : is3DProduct && variation && productInfo ? (
            <div className="h-[500px] rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 relative">
              <ErrorBoundary>
                <Canvas 
                  camera={{ position: [0, 0, 5 * zoomLevel], fov: 50 }}
                  onPointerDown={() => setIsDragging(true)}
                  onPointerUp={() => setIsDragging(false)}
                >
                  <ambientLight intensity={0.8} />
                  <Environment preset="city" />
                  <Suspense fallback={<Loader />}>
                    <ProductModel3D 
                      decalTexture={texture}
                      decalPosition={getDecalPosition()}
                      decalScale={design.customization?.scale || productInfo.decalDefaults.scale}
                      modelPath={variation.path}
                      scale={variation.scale}
                      position={variation.position}
                      rotation={variation.rotation}
                      targetMeshName={variation.targetMeshName}
                      baseColor={variation.colorCode}
                    />
                  </Suspense>
                  <OrbitControls 
                    enablePan={false}
                    minDistance={2 * zoomLevel}
                    maxDistance={10 * zoomLevel}
                    autoRotate={autoRotate && !isDragging}
                    autoRotateSpeed={rotationSpeed}
                  />
                </Canvas>
              </ErrorBoundary>
              
              {/* ENHANCED: Rotation & Camera Controls */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-3">
                {/* Auto Rotate Toggle */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoRotate}
                      onChange={(e) => setAutoRotate(e.target.checked)}
                      className="w-4 h-4 text-blue-600 dark:text-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-2 focus:ring-offset-2 cursor-pointer"
                    />
                    <div className="flex items-center gap-2">
                      <MdOutlineRotateRight className={`w-4 h-4 ${autoRotate ? 'text-blue-600 dark:text-blue-400 animate-spin' : 'text-gray-600 dark:text-gray-400'}`} />
                      <span className={`text-sm font-medium ${autoRotate ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        Auto Rotate
                      </span>
                    </div>
                  </label>
                  
                  {/* Rotation Speed Control */}
                  {autoRotate && (
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Speed</span>
                        <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-blue-600 dark:text-blue-300">
                          {rotationSpeed.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={rotationSpeed}
                        onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                      />
                    </div>
                  )}
                  
                  {/* Zoom Control */}
                  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Zoom</span>
                      <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-blue-600 dark:text-blue-300">
                        {zoomLevel.toFixed(1)}x
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.5))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <MdOutlineZoomOut className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      </button>
                      <input
                        type="range"
                        min="0.5"
                        max="3"
                        step="0.1"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                      />
                      <button
                        onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.5))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <MdOutlineZoomIn className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Reset Camera */}
                  <button
                    onClick={handleResetCamera}
                    className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  >
                    <TbRotate2 className="w-4 h-4" />
                    Reset View
                  </button>
                </div>
              </div>
              
              {/* Instructions */}
              <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <span className="text-blue-600 dark:text-blue-300 font-semibold">Drag</span> to rotate • 
                  <span className="text-blue-600 dark:text-blue-300 font-semibold ml-2">Scroll</span> to zoom
                </p>
              </div>
            </div>
          ) : is2DProduct && variation && productInfo ? (
            // UPDATED: Use the same 2D preview component as Customize
            <div className="h-[500px] rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
              <Product2DPreview
                decalImage={previewImage}
                position={[
                  design.customization?.position?.x || productInfo.decalDefaults.position[0],
                  design.customization?.position?.y || productInfo.decalDefaults.position[1]
                ]}
                scale={design.customization?.scale || productInfo.decalDefaults.scale}
                dimensions={productInfo.dimensions}
                backgroundColor={variation.colorCode}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className={`${IMAGE_BACKGROUND} rounded-xl p-8 border border-gray-300 dark:border-gray-700`}>
                <img
                  src={previewImage}
                  alt={design.name}
                  className="max-w-full max-h-[60vh] rounded-lg shadow-2xl"
                  onError={() => setImageError(true)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={handleOrderNow}
            className={`${BUTTON_PRIMARY} px-6 py-3 rounded-lg flex items-center gap-2 hover:shadow-lg font-medium`}
          >
            <FiShoppingCart /> Order Now
          </button>
        </div>
      </div>
    </div>
  );
};

const SavedDesigns: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [filteredDesigns, setFilteredDesigns] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<SavedDesign | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [designToDelete, setDesignToDelete] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showFilters, setShowFilters] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [dimensionFilter, setDimensionFilter] = useState<string>('all');

  const threeDProducts = ['Mug', 'T-Shirt'];
  const twoDProducts = ['Mousepad', 'Sticker', 'Phone Case'];

  const dimensionOptions = {
    'all': 'All Sizes',
    'mousepad': 'Mousepad (300x100mm)',
    'sticker': 'Sticker (100x100mm)',
    'phonecase': 'Phone Case (80x160mm)'
  };

  useEffect(() => {
    useGLTF.preload("/models/mug.glb");
    useGLTF.preload("/models/shirt.glb");
  }, []);

  useEffect(() => {
    fetchDesigns();
  }, []);

  useEffect(() => {
    filterDesigns();
  }, [designs, productTypeFilter, dimensionFilter]);

  const fetchDesigns = async () => {
    try {
      setLoading(true);
      const data = await getMyDesigns();
      
      console.log("=== IMAGE DEBUG ===");
      data.forEach((design, i) => {
        console.log(`${i+1}. ${design.name} (${design.productType})`);
        if (design.customization?.originalImage) {
          console.log('   Has original image:', design.customization.originalImage.substring(0, 100));
        } else {
          console.log('   NO original image in customization');
        }
      });
      
      setDesigns(data);
      setFilteredDesigns(data);
      
    } catch (error) {
      console.error("Error fetching designs:", error);
      toast.error("Failed to load saved designs");
    } finally {
      setLoading(false);
    }
  };

  const filterDesigns = () => {
    let filtered = [...designs];

    if (productTypeFilter !== 'all') {
      if (productTypeFilter === '3d') {
        filtered = filtered.filter(design => threeDProducts.includes(design.productType));
      } else if (productTypeFilter === '2d') {
        filtered = filtered.filter(design => twoDProducts.includes(design.productType));
      } else {
        filtered = filtered.filter(design => design.productType === productTypeFilter);
      }
    }

    if (dimensionFilter !== 'all' && (productTypeFilter === 'all' || productTypeFilter === '2d' || twoDProducts.includes(productTypeFilter))) {
      switch (dimensionFilter) {
        case 'mousepad':
          filtered = filtered.filter(design => design.productType === 'Mousepad');
          break;
        case 'sticker':
          filtered = filtered.filter(design => design.productType === 'Sticker');
          break;
        case 'phonecase':
          filtered = filtered.filter(design => design.productType === 'Phone Case');
          break;
      }
    }

    setFilteredDesigns(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDesign(id);
      setDesigns(designs.filter(design => design._id !== id));
      toast.success("Design deleted successfully");
    } catch (error) {
      console.error("Error deleting design:", error);
      toast.error("Failed to delete design");
    } finally {
      setShowDeleteDialog(false);
      setDesignToDelete(null);
    }
  };

  const handleDownload = async (design: SavedDesign) => {
    try {
      setDownloadingId(design._id);
      
      const imageUrl = getThumbnailUrl(design);
      console.log("📥 Downloading from:", imageUrl.substring(0, 100));
      
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${design.name.replace(/\s+/g, '_')}_${design.productType}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Design downloaded!");
    } catch (error) {
      console.error("Error downloading design:", error);
      toast.error("Failed to download design");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUseDesign = (design: SavedDesign) => {
    navigate("/dashboard/customer", { 
      state: { 
        designId: design._id,
        productType: design.productType,
        color: design.color,
        storeId: design.store._id
      }
    });
    toast.info(`Proceeding to order for ${design.productType}`);
  };

  const handleDuplicateDesign = (design: SavedDesign) => {
    navigate("/dashboard/customer/customize", {
      state: {
        designData: design,
        duplicate: true
      }
    });
    toast.info(`Duplicating "${design.name}"...`);
  };

  const handleRefreshDesigns = async () => {
    try {
      setRefreshing(true);
      await fetchDesigns();
      toast.success("Designs refreshed");
    } catch (error) {
      console.error("Error refreshing designs:", error);
      toast.error("Failed to refresh designs");
    } finally {
      setRefreshing(false);
    }
  };

  const getProductTypeColor = (productType: string) => {
    switch (productType) {
      case 'Mug': return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
      case 'T-Shirt': return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
      case 'Mousepad': return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700';
      case 'Sticker': return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      case 'Phone Case': return 'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-700';
      default: return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeOfDay = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const clearFilters = () => {
    setProductTypeFilter('all');
    setDimensionFilter('all');
  };

  if (loading) {
    return (
      <DashboardLayout role="customer">
        <div className={`${BACKGROUND_GRADIENT} min-h-screen`}>
          <div className="w-full max-w-7xl mx-auto p-6">
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
              </div>
              <p className={`mt-4 ${MUTED_TEXT} animate-pulse`}>Loading your designs...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="customer">
      <div className={`${BACKGROUND_GRADIENT} min-h-screen`}>
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
          <div className="mb-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  Design Gallery
                </h1>
                <p className={`${MUTED_TEXT} mt-2`}>
                  {filteredDesigns.length === 0 
                    ? "No designs match your filters" 
                    : `${filteredDesigns.length} design${filteredDesigns.length !== 1 ? 's' : ''} found`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                    showFilters || productTypeFilter !== 'all' || dimensionFilter !== 'all'
                      ? BUTTON_FILTER_ACTIVE
                      : BUTTON_FILTER_INACTIVE
                  }`}
                >
                  <FiFilter />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                  {(productTypeFilter !== 'all' || dimensionFilter !== 'all') && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  )}
                </button>
                
                <button
                  onClick={handleRefreshDesigns}
                  disabled={refreshing}
                  className={`inline-flex items-center gap-2 px-4 py-2 ${BUTTON_FILTER_INACTIVE} font-medium rounded-lg disabled:opacity-50`}
                >
                  <FiRefreshCw className={`${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                
                <a
                  href="/dashboard/customize"
                  className={`${BUTTON_PRIMARY} inline-flex items-center gap-2 px-6 py-2 font-medium rounded-lg shadow-lg hover:shadow-xl transform transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <span className="text-lg">+</span>
                  New Design
                </a>
              </div>
            </div>

            {showFilters && (
              <div className={`${SOFT_PANEL} backdrop-blur-sm p-6 animate-in slide-in-from-top mb-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Designs</h3>
                  {(productTypeFilter !== 'all' || dimensionFilter !== 'all') && (
                    <button
                      onClick={clearFilters}
                      className={`text-sm ${MUTED_TEXT_LIGHT} hover:text-gray-900 dark:hover:text-white flex items-center gap-1 font-medium`}
                    >
                      <FiX /> Clear Filters
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium ${MUTED_TEXT} mb-3`}>
                      Product Type
                    </label>
                    <div className="flex flex-wrap gap-4">
                      <button
                        onClick={() => setProductTypeFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          productTypeFilter === 'all'
                            ? BUTTON_FILTER_ACTIVE
                            : BUTTON_FILTER_INACTIVE
                        }`}
                      >
                        All Products
                      </button>
                      <button
                        onClick={() => setProductTypeFilter('3d')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                          productTypeFilter === '3d'
                            ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                            : BUTTON_FILTER_INACTIVE
                        }`}
                      >
                        <MdOutline3dRotation className="text-sm" />
                        3D Products
                      </button>
                      <button
                        onClick={() => setProductTypeFilter('2d')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                          productTypeFilter === '2d'
                            ? 'bg-green-100 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                            : BUTTON_FILTER_INACTIVE
                        }`}
                      >
                        <MdOutlineImage className="text-sm" />
                        2D Products
                      </button>
                      {['Mug', 'T-Shirt', 'Mousepad', 'Sticker', 'Phone Case'].map(type => (
                        <button
                          key={type}
                          onClick={() => setProductTypeFilter(type)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            productTypeFilter === type
                              ? getProductTypeColor(type)
                              : BUTTON_FILTER_INACTIVE
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(productTypeFilter === 'all' || productTypeFilter === '2d' || twoDProducts.includes(productTypeFilter)) && (
                    <div>
                      <label className={`block text-sm font-medium ${MUTED_TEXT} mb-3`}>
                        Product Size
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(dimensionOptions).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setDimensionFilter(key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${
                              dimensionFilter === key
                                ? BUTTON_FILTER_ACTIVE
                                : BUTTON_FILTER_INACTIVE
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {designs.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`${STATS_CARD} rounded-xl p-4 shadow-sm`}>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{designs.length}</div>
                  <div className={`text-sm ${MUTED_TEXT_LIGHT}`}>Total Designs</div>
                </div>
                <div className={`${STATS_CARD} rounded-xl p-4 shadow-sm`}>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {new Set(designs.map(d => d.productType)).size}
                  </div>
                  <div className={`text-sm ${MUTED_TEXT_LIGHT}`}>Product Types</div>
                </div>
              </div>
            )}
          </div>

          {filteredDesigns.length === 0 ? (
            <div className={`${SOFT_PANEL} backdrop-blur-sm p-12 text-center`}>
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/10 dark:to-blue-800/10 mb-6">
                <div className={`text-4xl ${MUTED_TEXT}`}>🔍</div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {designs.length === 0 ? 'No Designs Yet' : 'No Designs Found'}
              </h3>
              <p className={`${MUTED_TEXT} mb-6 max-w-md mx-auto`}>
                {designs.length === 0 
                  ? 'Create your first custom design' 
                  : 'Try changing your filters'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/dashboard/customize"
                  className={`${BUTTON_PRIMARY} px-8 py-3 font-medium rounded-lg shadow-lg hover:shadow-xl`}
                >
                  Create New Design
                </a>
                {designs.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className={`px-8 py-3 ${BUTTON_FILTER_INACTIVE} font-medium rounded-lg`}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDesigns.map((design) => (
                <div
                  key={design._id}
                  className={`${CARD_BACKGROUND} ${CARD_BORDER} backdrop-blur-sm rounded-2xl overflow-hidden ${CARD_HOVER}`}
                >
                  <div 
                    className={`h-56 relative overflow-hidden ${IMAGE_BACKGROUND} cursor-pointer group`}
                    onClick={() => setSelectedDesign(design)}
                  >
                    <div className="w-full h-full relative">
                      <img
                        src={getThumbnailUrl(design)}
                        alt={design.name}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          console.error('❌ Image failed:', design.name);
                          const target = e.target as HTMLImageElement;
                          target.style.opacity = '0.5';
                        }}
                        onLoad={() => {
                          console.log('✅ Image loaded:', design.name);
                        }}
                      />
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center p-4">
                        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 mb-2">
                          <div className="text-white text-sm font-medium flex items-center gap-2">
                            <FiEye className="w-4 h-4" />
                            View {['Mug', 'T-Shirt'].includes(design.productType) ? '3D' : '2D'} Preview
                          </div>
                        </div>
                      </div>
                      
                      <div className={`absolute top-3 left-3 px-3 py-1 rounded-full border text-xs font-semibold backdrop-blur-sm ${getProductTypeColor(design.productType)}`}>
                        {design.productType}
                      </div>
                      
                      <div className="absolute top-3 right-3">
                        {threeDProducts.includes(design.productType) ? (
                          <div className="flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                            <MdOutline3dRotation className="text-blue-600 dark:text-blue-400 text-xs" />
                            <span className="text-xs text-gray-700 dark:text-gray-300">3D</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                            <MdOutlineImage className="text-green-600 dark:text-green-400 text-xs" />
                            <span className="text-xs text-gray-700 dark:text-gray-300">2D</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                        <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                          {getTimeOfDay(design.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white truncate text-lg mb-1">
                          {design.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                            style={{ backgroundColor: design.color }}
                            title={design.color}
                          />
                          <span className={`text-sm ${MUTED_TEXT} capitalize`}>{design.color}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{formatDate(design.createdAt)}</span>
                          <span>•</span>
                          <span>{getTimeOfDay(design.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1">
                        <FiEye className="text-gray-600 dark:text-gray-400 text-sm" />
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{design.viewCount}</span>
                      </div>
                    </div>

                    <div className={`flex items-center gap-3 mb-5 p-3 ${STORE_INFO_BG} rounded-xl border border-gray-200 dark:border-gray-600/50`}>
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden border border-gray-300 dark:border-gray-500">
                          {design.store.logoFileId ? (
                            <img
                              src={`${import.meta.env.VITE_API_URL}/print-store/logo/${design.store.logoFileId}`}
                              alt={design.store.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs">🏪</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                          {design.store.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUseDesign(design)}
                        className={`${BUTTON_PRIMARY} flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium hover:shadow-lg active:scale-[0.98] group/order`}
                      >
                        <FiShoppingCart className="text-lg group-hover/order:scale-110 transition-transform" />
                        Order Now
                      </button>
                      <button
                        onClick={() => handleDownload(design)}
                        disabled={downloadingId === design._id}
                        className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500/50 disabled:opacity-50"
                        title="Download as PNG"
                      >
                        {downloadingId === design._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                        ) : (
                          <FiDownload />
                        )}
                      </button>
                      <button
                        onClick={() => handleDuplicateDesign(design)}
                        className="p-3 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 border border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500/50"
                        title="Duplicate Design"
                      >
                        <FiCopy />
                      </button>
                      <button
                        onClick={() => {
                          setDesignToDelete(design._id);
                          setShowDeleteDialog(true);
                        }}
                        className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 hover:border-red-400 dark:hover:border-red-500/50"
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setDesignToDelete(null);
          }}
          onConfirm={() => designToDelete && handleDelete(designToDelete)}
          title="Delete Design"
          message="Are you sure you want to delete this design? All customization data will be permanently removed."
          confirmText="Delete"
          confirmColor="red"
        />

        {selectedDesign && (
          <PreviewModal
            design={selectedDesign}
            onClose={() => setSelectedDesign(null)}
          />
        )}
        
        {/* Add custom slider styles */}
        <style>{`
          .slider-thumb::-webkit-slider-thumb {
            appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #1e40af;
            box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
          }
          .slider-thumb::-moz-range-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor = pointer;
            border: 2px solid #1e40af;
            box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
};

export default SavedDesigns;