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
      <div className="w-full">
        <div className="mt-6 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-widest text-white">
            CUSTOMIZE YOUR PRODUCT
          </h1>
        </div>
        <div className="mt-8 flex flex-1 min-h-[70vh] rounded-xl border border-white/10 bg-gray-900 shadow-lg overflow-hidden">
          {/* Sidebar */}
          <aside className="w-96 border-r border-white/10 bg-gray-800/80 p-6 flex flex-col gap-6">
            <div>
              <label htmlFor="product-select" className="block text-sm text-gray-300 font-bold mb-2">Select Product</label>
              <select id="product-select" value={selectedProduct || ""} onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full p-2.5 bg-gray-700 border border-white/10 rounded-lg text-white appearance-none focus:ring-blue-500 focus:border-blue-500">
                <option value="" disabled>Choose a product</option>
                {availableProducts.map((product) => (<option key={product} value={product}>{product}</option>))}
              </select>
            </div>
            {selectedProduct && currentProductInfo && (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-4 flex items-center justify-center text-gray-300 cursor-pointer transition-colors h-24 ${isDraggingOver ? 'border-blue-500 bg-blue-900/50' : 'border-white/20 hover:border-blue-500'}`}
                >
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <span className="text-sm font-semibold">Upload or Drag your Design</span>
                  </div>
                  <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                </div>

                {preview && (
                  <div className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-2">
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                  </div>
                )}

                <div className="space-y-6 pt-4 border-t border-white/20">
                    <div>
                      <label className="block text-white text-sm font-bold mb-2">Select Color</label>
                      <div className="flex gap-3 flex-wrap"> 
                        {Object.entries(currentProductInfo.variations).map(([colorName, colorData]) => (
                            <button key={colorName} onClick={() => handleColorSelect(colorName)}
                                className={`w-8 h-8 rounded-full border-2 transition-transform transform hover:scale-110 ${selectedColor === colorName ? 'border-blue-400 scale-110' : 'border-white/30'}`}
                                style={{ backgroundColor: colorData.colorCode }} title={colorName} />
                        ))}
                      </div>
                    </div>

                  {texture && (
                    <>
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">Image Scale: {decalScale.toFixed(2)}</label>
                        <input type="range" min={decalScaleRange.minScale} max={decalScaleRange.maxScale} step="0.01" value={decalScale}
                            onChange={(e) => setDecalScale(parseFloat(e.target.value))} className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-bold mb-2">Image Position</label>
                        <div className="grid grid-cols-3 grid-rows-2 gap-2 w-32 mx-auto">
                            <div className="col-start-2 row-start-1 flex justify-center">
                                <button onClick={() => setDecalPosition(p => [p[0], p[1] + 0.02, p[2]])} className="bg-blue-600/50 hover:bg-blue-600/80 text-white p-2 rounded transform transition hover:scale-110">↑</button>
                            </div>
                            <div className="col-start-1 row-start-2 flex justify-center">
                                <button onClick={() => setDecalPosition(p => [p[0] - 0.02, p[1], p[2]])} className="bg-blue-600/50 hover:bg-blue-600/80 text-white p-2 rounded transform transition hover:scale-110">←</button>
                            </div>
                            <div className="col-start-3 row-start-2 flex justify-center">
                                <button onClick={() => setDecalPosition(p => [p[0] + 0.02, p[1], p[2]])} className="bg-blue-600/50 hover:bg-blue-600/80 text-white p-2 rounded transform transition hover:scale-110">→</button>
                            </div>
                            <div className="col-start-2 row-start-2 flex justify-center">
                                <button onClick={() => setDecalPosition(p => [p[0], p[1] - 0.02, p[2]])} className="bg-blue-600/50 hover:bg-blue-600/80 text-white p-2 rounded transform transition hover:scale-110">↓</button>
                            </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {notification && <div className="text-red-400 text-xs mt-1">{notification}</div>}

            <div className="mt-auto flex gap-3">
              <button type="button" onClick={handleReset} 
                className="flex-1 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 font-semibold text-white text-sm border border-white/10 shadow-sm transition">
                Reset
              </button>
              <button type="button" onClick={handleBuy} disabled={!selectedProduct}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-white text-sm shadow-md disabled:opacity-50 transition">
                Buy
              </button>
            </div>
          </aside>
          <main className="flex-1 flex items-center justify-center bg-gray-900 p-4">
            <div className="w-full h-full border border-white/20 rounded-lg overflow-hidden">
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
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-medium">
                    Please select a product to begin customizing.
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </main>
        </div>
        {(showModal || modalClosing) && createPortal(
            <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${modalClosing ? "animate-fadeOut" : "animate-fadeIn"}`}>
              <div className="bg-gray-800 p-6 rounded-lg w-80 text-white flex flex-col gap-4 shadow-xl">
                <p className="text-center text-lg font-bold">Proceed to Order?</p>
                <p className="text-center text-sm text-gray-300">Your customized product is ready!</p>
                <div className="flex justify-center gap-4 mt-2">
                  <button className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 font-bold text-sm" onClick={handleCloseModal}>No, thanks</button>
                  <button className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-500 font-bold text-sm" onClick={() => navigate("/dashboard/customer")}>Yes, Proceed</button>
                </div>
              </div>
            </div>, document.body
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } } .animate-fadeIn { animation: fadeIn 0.3s ease forwards; }
        @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } } .animate-fadeOut { animation: fadeOut 0.3s ease forwards; }
      `}</style>
    </DashboardLayout>
  );
};

export default Customize;