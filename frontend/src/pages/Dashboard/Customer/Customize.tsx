import React, { useState, Suspense, useRef, useEffect } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

// Generic ProductModel to handle all products
function ProductModel({
  texture,
  dragPos,
  modelPath,
  scale,
  position,
  selectedProduct,
}: {
  texture: THREE.Texture | null;
  dragPos: { x: number; y: number };
  modelPath: string;
  scale: number;
  position: [number, number, number];
  selectedProduct: string | null;
}) {
  const { scene } = useGLTF(modelPath);
  const meshRef = useRef<THREE.Object3D>(null);
  const bodyMeshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        if (texture) {
          if (
            selectedProduct === "Mug" ||
            (selectedProduct === "Shirt" &&
              (child.name.includes("Front") || child.name.includes("Material")))
          ) {
            child.material = new THREE.MeshStandardMaterial({
              map: texture,
              metalness: 0,
              roughness: 1,
            });
            bodyMeshRef.current = child;
          } else {
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color("white"),
              metalness: 0,
              roughness: 1,
            });
          }
        } else {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("white"),
            metalness: 0,
            roughness: 1,
          });
        }
      }
    });
  }, [texture, scene, selectedProduct]);

  useEffect(() => {
    if (!texture || !bodyMeshRef.current) return;
    const mat = bodyMeshRef.current.material as THREE.MeshStandardMaterial;
    const scaleValue = 200;
    let offsetX = dragPos.x / scaleValue;
    let offsetY = dragPos.y / scaleValue;
    const normalize = (v: number) => ((v % 1) + 1) % 1;
    offsetX = normalize(offsetX);
    offsetY = normalize(offsetY);
    texture.offset.set(offsetX, offsetY);
    texture.needsUpdate = true;
    mat.needsUpdate = true;
  }, [dragPos, texture]);

  return <primitive ref={meshRef} object={scene} scale={scale} position={position} />;
}

const Customize: React.FC = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [dragPos, setDragPos] = useState({ x: 96, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productSettings: Record<string, { path: string; scale: number; position: [number, number, number] }> = {
    Mug: { path: "/models/mug.glb", scale: 0.8, position: [0, -0.8, 0] },
    Shirt: { path: "/models/shirt.glb", scale: 2.8, position: [0, -3.5, 0] },
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProduct) {
      setNotification("Select Product first");
      setTimeout(() => setNotification(null), 3000); // auto-clear after 3s
      return;
    }
    setNotification(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);

    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.offset.set(96 / 200, 16 / 200);
      setTexture(tex);
    });
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragPos({ x: dragPos.x + e.movementX, y: dragPos.y + e.movementY });
  };

  const handleReset = () => {
    setPreview(null);
    setTexture(null);
    setDragPos({ x: 96, y: 16 });
  };

  const handleBuy = () => setShowModal(true);

  const handleCloseModal = () => {
    setModalClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setModalClosing(false);
    }, 300);
  };

  return (
    <DashboardLayout role="customer">
      <div className="w-full">
        {/* Header */}
        <div className="mt-6 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-widest text-white">
            CUSTOMIZE YOUR PRODUCT
          </h1>
        </div>

        {/* Main Layout */}
        <div className="mt-8 flex flex-1 min-h-[70vh] rounded-xl border border-white/10 bg-gray-900 shadow-lg overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-72 border-r border-white/10 bg-gray-800/80 p-6 flex flex-col gap-4 relative">
            <div
              className="border-2 border-dashed border-white/20 rounded-lg p-4 flex flex-col items-center justify-center text-gray-300 cursor-pointer hover:border-blue-500 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="text-sm">Upload or Drag files here</span>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div
              className="relative w-full h-32 bg-black/40 border border-white/10 rounded-lg overflow-hidden"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {preview ? (
                <div
                  style={{
                    position: "absolute",
                    top: dragPos.y,
                    left: dragPos.x,
                    cursor: isDragging ? "grabbing" : "grab",
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <img src={preview} alt="Preview" className="w-24 h-24 object-contain" draggable={false} />
                </div>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                  Preview Area
                </span>
              )}
            </div>

            <span className="text-sm text-gray-300 mt-2 font-bold">Select Product</span>

            <select
              className="w-full p-2 rounded-lg bg-gray-700 text-white border border-white/20 focus:outline-none"
              value={selectedProduct || ""}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                handleReset();
              }}
            >
              <option value="" disabled>
                - -
              </option>
              <option value="Mug">Mug</option>
              <option value="Shirt">Shirt</option>
            </select>

            {notification && <div className="text-red-400 text-xs mt-1">{notification}</div>}

            {/* Buttons aligned left */}
            <div className="absolute bottom-4 flex gap-2">
              <button
                type="button"
                className="w-28 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 font-semibold text-white text-sm border border-white/10"
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                type="button"
                className="w-28 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold text-white text-sm"
                onClick={handleBuy}
              >
                Buy
              </button>
            </div>
          </aside>

          {/* Right 3D Viewer */}
          <main className="flex-1 flex items-center justify-center bg-gray-900 p-4">
            <div className="w-full h-full border border-white/20 rounded-lg overflow-hidden">
              {selectedProduct ? (
                <Canvas camera={{ position: [0, 0.5, 5], fov: 45 }}>
                  <ambientLight intensity={0.6} />
                  <directionalLight position={[5, 5, 5]} intensity={1} />
                  <Suspense fallback={null}>
                    <ProductModel
                      texture={texture}
                      dragPos={dragPos}
                      modelPath={productSettings[selectedProduct].path}
                      scale={productSettings[selectedProduct].scale}
                      position={productSettings[selectedProduct].position}
                      selectedProduct={selectedProduct}
                    />
                    <Environment preset="studio" />
                  </Suspense>
                  <OrbitControls enablePan enableZoom minDistance={2} maxDistance={10} target={[0, 0, 0]} />
                </Canvas>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-center text-sm">
                  Select Product first, then upload your image.
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Modal with fade in/out */}
        {(showModal || modalClosing) &&
          createPortal(
            <div
              className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${
                modalClosing ? "animate-fadeOut" : "animate-fadeIn"
              }`}
            >
              <div className="bg-gray-800 p-6 rounded-lg w-80 text-white flex flex-col gap-4 shadow-lg transform transition-transform duration-300 scale-100 relative">
                <p className="text-center text-sm font-bold">
                  Want to proceed in our Order Page?
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    className="bg-gray-700 px-4 py-1 rounded hover:bg-gray-600 font-bold text-sm"
                    onClick={handleCloseModal}
                  >
                    No
                  </button>
                  <button
                    className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-500 font-bold text-sm"
                    onClick={() => navigate("/dashboard/customer")}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .animate-fadeIn { animation: fadeIn 0.3s ease forwards; }

        @keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } }
        .animate-fadeOut { animation: fadeOut 0.3s ease forwards; }
      `}</style>
    </DashboardLayout>
  );
};

export default Customize;
