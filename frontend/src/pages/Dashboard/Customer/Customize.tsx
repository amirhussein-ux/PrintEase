import React, { useState, Suspense, useRef, useEffect, Component } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Decal, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

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
      return <div className="p-4 text-red-400 text-center">Something went wrong with the 3D viewer. Please reload.</div>;
    }
    return this.props.children;
  }
}

// --- Loader ---
function Loader() {
  return (
    <Html center>
      <div className="text-white text-lg">Loading Model...</div>
    </Html>
  );
}

// --- Product Model ---
function ProductModel({
  decalTexture, decalPosition, decalScale, modelPath, scale, position, rotation, targetMeshName, baseColor
}: {
  decalTexture: THREE.Texture | null;
  decalPosition: [number, number, number];
  decalScale: number;
  modelPath: string;
  scale: number;
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
    const targetNode = nodes[targetMeshName];
    if (!targetNode) {
      console.error(`Mesh "${targetMeshName}" not found in ${modelPath}. Available nodes are:`, Object.keys(nodes));
      return;
    }
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

      // ✅ Compute true aspect ratio from texture image
      const { image } = decalTexture;
      if (image && image.width && image.height) {
        setTextureAspect(image.width / image.height);
      }
    }
  }, [decalTexture]);

  if (!actualMesh) return null;

  // ✅ Preserve the true proportions of the uploaded image
  const adjustedWidth = decalScale * textureAspect;
  const adjustedHeight = decalScale;

  return (
    <group scale={scale} position={position} rotation={rotation}>
      <mesh ref={meshRef} geometry={actualMesh.geometry} castShadow receiveShadow>
        <meshStandardMaterial color={baseColor} roughness={0.8} metalness={0.1} />
        {decalTexture && (
          <Decal
            position={decalPosition}
            rotation={[0, 0, 0]}
            scale={[adjustedWidth, adjustedHeight, 1]}
            map={decalTexture}
            mesh={meshRef}
            depthTest={true}
            depthWrite={false}
            flatShading
          >
            <meshStandardMaterial
              map={decalTexture}
              polygonOffset
              polygonOffsetFactor={-10}
              transparent
              alphaTest={0.5}
              toneMapped={false}
            />
          </Decal>
        )}
      </mesh>
    </group>
  );
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
  const [decalPosition, setDecalPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [decalScale, setDecalScale] = useState(0.15);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productSettings: Record<string, any> = {
    Mug: {
      decalDefaults: { position: [0, 1, 0.5], scale: 0.4, minScale: 0.1, maxScale: 1.0 },
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
      decalDefaults: { position: [0, -0.1, 0.15], scale: 0.35, minScale: 0.1, maxScale: 0.8 },
      variations: {
        White: { path: "/models/shirt.glb", colorCode: "#f2f2f2", scale: 3, position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], targetMeshName: "Object_2" },
        Black: { path: "/models/shirt.glb", colorCode: "#1a1a1a", scale: 3, position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], targetMeshName: "Object_2" },
        Red: { path: "/models/shirt.glb", colorCode: "#D93434", scale: 3, position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], targetMeshName: "Object_2" },
        Orange: { path: "/models/shirt.glb", colorCode: "#E87C24", scale: 3, position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], targetMeshName: "Object_2" },
        Blue: { path: "/models/shirt.glb", colorCode: "#347CD9", scale: 3, position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], targetMeshName: "Object_2" },
        Green: { path: "/models/shirt.glb", colorCode: "#34A853", scale: 3, position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], targetMeshName: "Object_2" },
        Yellow: { path: "/models/shirt.glb", colorCode: "#F0DB4F", scale: 3, position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], targetMeshName: "Object_2" },
        Purple: { path: "/models/shirt.glb", colorCode: "#6A0DAD", scale: 3, position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], targetMeshName: "Object_2" },
        Gray: { path: "/models/shirt.glb", colorCode: "#808080", scale: 3, position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], targetMeshName: "Object_2" },
        Pink: { path: "/models/shirt.glb", colorCode: "#FFC0CB", scale: 3, position: [0, 0, 0], rotation: [-Math.PI / 2, 0, 0], targetMeshName: "Object_2" },
      },
    },
  };

  const availableProducts = Object.keys(productSettings);
  const currentProductInfo = selectedProduct ? productSettings[selectedProduct] : null;
  const currentVariation = selectedProduct && selectedColor ? currentProductInfo?.variations[selectedColor] : null;
  const decalScaleRange = currentProductInfo ? currentProductInfo.decalDefaults : { minScale: 0, maxScale: 1 };

  const resetDecalSettings = (productName: string | null) => {
    if (productName && productSettings[productName]) {
      const defaults = productSettings[productName].decalDefaults;
      setDecalPosition(defaults.position);
      setDecalScale(defaults.scale);
    }
  };

  const processFile = (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
        setNotification("Please upload a valid image file (PNG, JPG).");
        return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    
    resetDecalSettings(selectedProduct); 

    const loader = new THREE.TextureLoader();
    loader.load(
      url, 
      (loadedTexture) => {
        loadedTexture.encoding = THREE.sRGBEncoding;
        if (loadedTexture.image) {
          const { width, height } = loadedTexture.image;
          setAspectRatio(width / height);
        }
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.error('Error loading texture:', error);
        setNotification('Failed to load image. Please try another file.');
      }
    );
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
    setPreview(null); setTexture(null); setAspectRatio(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleColorSelect = (colorName: string) => setSelectedColor(colorName);

  const handleReset = () => {
    setPreview(null);
    setTexture(null);
    setAspectRatio(1);
    setSelectedProduct(null);
    setSelectedColor(null);
    setDecalPosition([0, 0, 0]);
    setDecalScale(0.15);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setNotification(null);
  };

  const handleBuy = () => {
    if (!selectedProduct) { setNotification("Please select a product first."); return; }
    setNotification(null); setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setModalClosing(true);
    setTimeout(() => { setShowModal(false); setModalClosing(false); }, 300);
  };

  useEffect(() => {
    useGLTF.preload("/models/mug.glb");
    useGLTF.preload("/models/shirt.glb");
  }, []);

  return (
    <DashboardLayout role="customer">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mt-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-wide">
            Customize your Product
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">Design your perfect product with real-time 3D preview</p>
        </div>

        {/* Main Content */}
        <div className="mt-8 flex flex-col lg:flex-row gap-6 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 shadow-2xl border border-gray-700">
          
          {/* Sidebar - Enhanced Design */}
          <aside className="w-full lg:w-96 bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700 p-6 flex flex-col gap-6 shadow-lg">
            {/* Product Selection */}
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
                {availableProducts.map((product) => (
                  <option key={product} value={product} className="bg-gray-800">{product}</option>
                ))}
              </select>
            </div>

            {selectedProduct && currentProductInfo && (
              <>
                {/* File Upload - Enhanced */}
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
                    <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                  </div>
                </div>

                {/* Customization Options */}
                <div className="space-y-6 pt-4 border-t border-gray-700">
                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                      </svg>
                      PRODUCT COLOR
                    </label>
                    <div className="flex gap-2 flex-wrap"> 
                      {Object.entries(currentProductInfo.variations).map(([colorName, colorData]) => (
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

                  {/* Design Controls */}
                  {texture && (
                    <div className="space-y-4">
                      {/* Scale Control */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-semibold text-gray-200">DESIGN SCALE</label>
                          <span className="text-xs font-mono bg-gray-700 px-2 py-1 rounded text-blue-300">
                            {decalScale.toFixed(2)}
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min={decalScaleRange.minScale} 
                          max={decalScaleRange.maxScale} 
                          step="0.01" 
                          value={decalScale}
                          onChange={(e) => setDecalScale(parseFloat(e.target.value))} 
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                        />
                      </div>

                      {/* Position Control */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-3">DESIGN POSITION</label>
                        <div className="bg-gray-700/50 rounded-xl p-4">
                          <div className="grid grid-cols-3 grid-rows-3 gap-3 w-40 mx-auto">
                            <div className="col-start-2 row-start-1 flex justify-center">
                              <button 
                                onClick={() => setDecalPosition(p => [p[0], p[1] + 0.02, p[2]])} 
                                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transform transition-all duration-200 hover:scale-110 shadow-md flex items-center justify-center"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                            </div>
                            <div className="col-start-1 row-start-2 flex justify-center">
                              <button 
                                onClick={() => setDecalPosition(p => [p[0] - 0.02, p[1], p[2]])} 
                                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transform transition-all duration-200 hover:scale-110 shadow-md flex items-center justify-center"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                            </div>
                            <div className="col-start-2 row-start-2 flex justify-center">
                              <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center text-xs text-gray-400 font-mono">
                                POS
                              </div>
                            </div>
                            <div className="col-start-3 row-start-2 flex justify-center">
                              <button 
                                onClick={() => setDecalPosition(p => [p[0] + 0.02, p[1], p[2]])} 
                                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transform transition-all duration-200 hover:scale-110 shadow-md flex items-center justify-center"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                            <div className="col-start-2 row-start-3 flex justify-center">
                              <button 
                                onClick={() => setDecalPosition(p => [p[0], p[1] - 0.02, p[2]])} 
                                className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transform transition-all duration-200 hover:scale-110 shadow-md flex items-center justify-center"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Notification */}
            {notification && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="text-red-400 text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {notification}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-auto flex gap-3 pt-4 border-t border-gray-700">
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
          </aside>

          {/* 3D Preview Area - Fixed to stay at top */}
          <main className="flex-1 flex items-start justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 p-6 shadow-2xl">
            <div className="w-full h-[600px] rounded-xl border-2 border-gray-700 overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 shadow-inner">
              <ErrorBoundary>
                {selectedProduct && selectedColor && currentVariation ? (
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
                      <ProductModel 
                        decalTexture={texture} 
                        decalPosition={decalPosition} 
                        decalScale={decalScale} 
                        modelPath={currentVariation.path}
                        scale={currentVariation.scale} 
                        position={currentVariation.position} 
                        rotation={currentVariation.rotation}
                        targetMeshName={currentVariation.targetMeshName} 
                        baseColor={currentVariation.colorCode} 
                      />
                    </Suspense>
                    <OrbitControls enablePan={false} minDistance={2} maxDistance={10} autoRotate={!isDragging} autoRotateSpeed={1.5} />
                  </Canvas>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-16 h-16 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p className="text-xl font-medium text-gray-300 mb-2">Ready to Create?</p>
                    <p className="text-sm text-gray-500 text-center max-w-sm">
                      Select a product and start customizing with your own design
                    </p>
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      {/* Modal */}
      {(showModal || modalClosing) && createPortal(
        <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 ${modalClosing ? "animate-fadeOut" : "animate-fadeIn"}`}>
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl w-96 border border-gray-700 shadow-2xl transform transition-all duration-300 scale-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ready to Order?</h3>
              <p className="text-gray-300 text-sm">Your customized product is looking amazing!</p>
            </div>
            <div className="flex justify-center gap-3">
              <button 
                className="flex-1 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold text-white text-sm transition-all duration-200"
                onClick={handleCloseModal}
              >
                Continue Editing
              </button>
              <button 
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 font-semibold text-white text-sm shadow-lg transition-all duration-200"
                onClick={() => navigate("/dashboard/customer")}
              >
                Proceed to Order
              </button>
            </div>
          </div>
        </div>, 
        document.body
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } } .animate-fadeIn { animation: fadeIn 0.3s ease forwards; }
        @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } } .animate-fadeOut { animation: fadeOut 0.3s ease forwards; }
        
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
          box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Customize;