import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import './CustomizePage.css';

// Simple error boundary for 3D viewer
class ModelErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <div style={{color: 'red', textAlign: 'center', padding: 40}}>Failed to load 3D model.</div>;
    }
    return this.props.children;
  }
}

const productList = [
  'Stickers',
  'T-shirts',
  'Motorplate',
  'Notepad',
  'PVC ID',
  'Ref Magnets',
  'Cards',
  'Tarpaulin',
  'Mouse Pads',
  'Mugs',
];

const productImages: Record<string, any> = {
  'Mugs': {
    white: '/products/mug white.png',
    black: '/products/mug black.png',
  },
  'T-shirts': {
    white: {
      front: '/products/tshirt white front.png',
      back: '/products/tshirt white back.png',
    },
    black: {
      front: '/products/tshirt black front.png',
      back: '/products/tshirt black back.png',
    },
  },
  'Tarpaulin': '/products/tarpaulin.png',
  'Stickers': '/products/sticker.png',
  'Motorplate': '/products/motorplate.png',
  'Notepad': '/products/notepads.png',
  'PVC ID': '/products/pvcid.png',
  'Ref Magnets': '/products/refmagnet.png',
  'Cards': '/products/cards.png',
  'Mouse Pads': '/products/mousepad.png',
};

const CustomizePage: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState('Stickers');
  const [elements, setElements] = useState<any[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [productColor, setProductColor] = useState<'white' | 'black'>('white');
  const [tshirtSide, setTshirtSide] = useState<'front' | 'back'>('front');
  const [canvasSize, setCanvasSize] = useState(700);
  const [uploadedImage, setUploadedImage] = useState<any>(null);
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const [imgScale, setImgScale] = useState(1);
  const [draggingImg, setDraggingImg] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [minimapRect, setMinimapRect] = useState({ x: 40, y: 40, w: 120, h: 80 });
  const [draggingMinimap, setDraggingMinimap] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  
  // Add missing refs
  const middlePanelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (middlePanelRef.current) {
        const size = Math.min(
          middlePanelRef.current.offsetWidth,
          middlePanelRef.current.offsetHeight
        );
        setCanvasSize(size - 40);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle minimap dragging
  const handleMinimapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    setDraggingMinimap(true);
    setDragOffset({
      x: e.clientX - minimapRect.x,
      y: e.clientY - minimapRect.y,
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: minimapRect.w,
      h: minimapRect.h,
    });
  };

  useEffect(() => {
    if (!draggingMinimap) return;
    const handleMouseMove = (e: MouseEvent) => {
      setMinimapRect((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(200 - prev.w, e.clientX - dragOffset.x)),
        y: Math.max(0, Math.min(200 - prev.h, e.clientY - dragOffset.y)),
      }));
    };
    const handleMouseUp = () => setDraggingMinimap(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingMinimap, dragOffset]);

  // Handle resizing overlay
  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStart) return;
      let newW = Math.max(20, Math.min(200 - minimapRect.x, resizeStart.w + (e.clientX - resizeStart.x)));
      let newH = Math.max(20, Math.min(200 - minimapRect.y, resizeStart.h + (e.clientY - resizeStart.y)));
      setMinimapRect((prev) => ({
        ...prev,
        w: newW,
        h: newH,
      }));
    };
    const handleMouseUp = () => {
      setResizing(false);
      setResizeStart(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, resizeStart, minimapRect.x, minimapRect.y]);

  // Handle canvas elements
  const handleDrag = (e: React.MouseEvent<HTMLDivElement>, id: number) => {
    e.preventDefault();
    setDraggingId(id);
    setSelectedElementId(id);

    const bounds = (e.currentTarget.parentElement)?.getBoundingClientRect();
    if (!bounds) return;

    const moveAt = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - bounds.left;
      const newY = moveEvent.clientY - bounds.top;
      setElements((prev) =>
        prev.map((el) =>
          el.id === id ? { ...el, x: newX, y: newY } : el
        )
      );
    };

    const onMouseMove = (moveEvent: MouseEvent) => moveAt(moveEvent);

    const onMouseUp = () => {
      setDraggingId(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    let imgSrc = '';
    if (selectedProduct === 'T-shirts') {
      imgSrc = productImages['T-shirts'][productColor][tshirtSide];
    } else {
      imgSrc = productImages[selectedProduct][productColor] || productImages[selectedProduct];
    }

    const img = new window.Image();
    img.src = imgSrc;
    img.onload = () => {
      const scale = Math.min(canvasSize / img.width, canvasSize / img.height);
      const imgW = img.width * scale;
      const imgH = img.height * scale;
      const imgX = (canvasSize - imgW) / 2;
      const imgY = (canvasSize - imgH) / 2;
      ctx.drawImage(img, imgX, imgY, imgW, imgH);

      if (uploadedImage) {
        const planeX = imgX + (minimapRect.x / 200) * imgW;
        const planeY = imgY + (minimapRect.y / 200) * imgH;
        const planeW = (minimapRect.w / 200) * imgW;
        const planeH = (minimapRect.h / 200) * imgH;
        const overlayImg = new window.Image();
        overlayImg.src = uploadedImage.src;
        overlayImg.onload = () => {
          ctx.drawImage(overlayImg, planeX, planeY, planeW, planeH);
        };
      }
    };
  }, [uploadedImage, selectedProduct, productColor, tshirtSide, canvasSize, minimapRect]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "image/png") {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage({
          src: reader.result,
          id: Date.now(),
        });
        setImgPos({ x: 40, y: 40 });
        setImgScale(1);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please upload a PNG file only.");
    }
  };

  const handleReset = () => {
    setElements([]);
    setSelectedElementId(null);
    setUploadedImage(null);
    setMinimapRect({ x: 40, y: 40, w: 120, h: 80 });
  };

  const handleSave = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `${selectedProduct}_${productColor}_design.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fileList = {
        target: { files },
      } as React.ChangeEvent<HTMLInputElement>;
      handleImageUpload(fileList);
    }
  };

  const showColorSelection = selectedProduct === 'T-shirts' || selectedProduct === 'Mugs';

  // 3D Mug component with dynamic canvas texture
  function MugModel() {
    const gltf = useGLTF('/models/Mug.glb');
    const canvasSize = 1024;
    const printArea = { x: 180, y: 180, w: 664, h: 380 };
    const [canvasUrl, setCanvasUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvasSize, canvasSize);
      if (uploadedImage) {
        const img = new window.Image();
        img.src = uploadedImage.src;
        img.onload = () => {
          ctx.drawImage(
            img,
            printArea.x + imgPos.x,
            printArea.y + imgPos.y,
            printArea.w * imgScale,
            printArea.h * imgScale
          );
          setCanvasUrl(canvas.toDataURL());
        };
      } else {
        setCanvasUrl(canvas.toDataURL());
      }
    }, [uploadedImage, imgPos, imgScale]);

    const texture = canvasUrl ? useLoader(THREE.TextureLoader as any, canvasUrl) : null;

    React.useEffect(() => {
      if (texture && gltf.scene) {
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
            const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            material.map = texture;
            material.needsUpdate = true;
          }
        });
      }
    }, [texture, gltf.scene]);

    return <primitive object={gltf.scene} scale={20} />;
  }

  // 3D T-Shirt component
  function TShirtModel() {
    const possibleFiles = [
      '/models/T-Shirt.glb',
      '/models/TShirt.glb',
      '/models/tshirt.glb',
      '/models/t-shirt.glb',
      '/models/Tshirt.glb',
      '/models/tShirt.glb',
    ];
    let gltf, foundPath;
    for (let path of possibleFiles) {
      try {
        gltf = useGLTF(path);
        foundPath = path;
        break;
      } catch (e) {}
    }
    if (!gltf) return null;
    return (
      <group position={[0, -2, 0]}>
        <primitive object={gltf.scene} scale={25} />
      </group>
    );
  }

  return (
    <div className="customize-container">
      <div className="left-panel">
        <h3 className="mt-4" style={{ fontWeight: 'bold', color: '#162e72' }}>Choose Product</h3>
        {productList.map((product) => (
          <button
            key={product}
            className={`product-btn ${selectedProduct === product ? 'active' : ''}`}
            style={{
              background: selectedProduct === product ? '#162e72' : '#1e3a8a',
              color: '#fff',
              marginBottom: 8,
              border: 'none',
              borderRadius: 4,
              padding: '10px 0',
              fontWeight: 'bold',
              width: '100%',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onClick={() => {
              setSelectedProduct(product);
              if (product === 'T-shirts') setTshirtSide('front');
            }}
          >
            {product}
          </button>
        ))}
        {showColorSelection && (
          <div style={{ marginTop: 24 }}>
            <h4 style={{ fontWeight: 'bold', color: '#1e3a8a' }}>Product Color</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setProductColor('white')}
                style={{
                  background: productColor === 'white' ? '#162e72' : '#1e3a8a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 0',
                  fontWeight: 'bold',
                  width: '50%',
                  cursor: 'pointer'
                }}
              >
                White
              </button>
              <button
                onClick={() => setProductColor('black')}
                style={{
                  background: productColor === 'black' ? '#162e72' : '#1e3a8a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 0',
                  fontWeight: 'bold',
                  width: '50%',
                  cursor: 'pointer'
                }}
              >
                Black
              </button>
            </div>
          </div>
        )}
        <div style={{ margin: '24px 0 0 0', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 220 }}>
          <div
            style={{
              width: 200,
              height: 200,
              border: '2px dashed #1e3a8a',
              borderRadius: 8,
              background: '#f3f3f3',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {uploadedImage && (
              <img
                src={uploadedImage.src}
                alt="Uploaded"
                style={{
                  position: 'absolute',
                  left: 18 + imgPos.x,
                  top: 18 + imgPos.y,
                  width: 164 * imgScale,
                  height: 95 * imgScale,
                  objectFit: 'contain',
                  cursor: draggingImg ? 'grabbing' : 'grab',
                  zIndex: 2,
                  userSelect: 'none',
                }}
                draggable={false}
                onMouseDown={(e) => {
                  setDraggingImg(true);
                  setDragStart({ x: e.clientX - imgPos.x, y: e.clientY - imgPos.y });
                }}
              />
            )}
            {uploadedImage && (
              <div
                style={{
                  position: 'absolute',
                  left: imgPos.x + 164 * imgScale - 12,
                  top: 18 + imgPos.y + 95 * imgScale - 12,
                  width: 16,
                  height: 16,
                  background: '#162e72',
                  borderRadius: 4,
                  cursor: 'nwse-resize',
                  zIndex: 3,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingImg(false);
                  setDragStart({ x: e.clientX, y: e.clientY });
                  const startScale = imgScale;
                  const startX = imgPos.x;
                  const startY = imgPos.y;
                  function onMove(ev: MouseEvent) {
                    const dx = ev.clientX - (dragStart ? dragStart.x : 0);
                    const dy = ev.clientY - (dragStart ? dragStart.y : 0);
                    let newScale = Math.max(0.2, Math.min(2, startScale + (dx + dy) / 200));
                    setImgScale(newScale);
                  }
                  function onUp() {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                  }
                  window.addEventListener('mousemove', onMove);
                  window.addEventListener('mouseup', onUp);
                }}
              />
            )}
          </div>
        </div>

        {/* Drag overlay for image */}
        {draggingImg && dragStart && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
              cursor: 'grabbing'
            }}
            onMouseMove={(e) => {
              const newX = e.clientX - dragStart.x;
              const newY = e.clientY - dragStart.y;
              setImgPos({ x: newX, y: newY });
            }}
            onMouseUp={() => {
              setDraggingImg(false);
              setDragStart(null);
            }}
          />
        )}

        <div
          className="upload-box"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-input-img')?.click()}
          title="Drag & Drop or Click to Upload"
          style={{ marginTop: 16 }}
        >
          <input
            id="file-input-img"
            type="file"
            accept="image/png"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
            disabled={!!uploadedImage}
          />
          <span>{uploadedImage ? "PNG uploaded" : "Drag & Drop or Click to Upload PNG"}</span>
        </div>
      </div>
      <div
        className="middle-panel"
        ref={middlePanelRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          position: 'relative',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 12,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSave}
              style={{
                background: '#162e72',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '10px 24px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Save
            </button>
            <button
              onClick={handleReset}
              style={{
                background: '#fff',
                color: '#162e72',
                border: '2px solid #162e72',
                borderRadius: 4,
                padding: '10px 24px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </div>
          {selectedProduct === 'T-shirts' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setTshirtSide('front')}
                style={{
                  background: tshirtSide === 'front' ? '#162e72' : '#1e3a8a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Front
              </button>
              <button
                onClick={() => setTshirtSide('back')}
                style={{
                  background: tshirtSide === 'back' ? '#162e72' : '#1e3a8a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Back
              </button>
            </div>
          )}
        </div>
        {/* 3D Product Viewer */}
        {(selectedProduct === 'Mugs' || selectedProduct === 'T-shirts') ? (
          <div style={{ width: canvasSize, height: canvasSize, background: '#fff', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #ccc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ModelErrorBoundary>
              <Canvas camera={{ position: [0, 0, 5] }} style={{ width: '100%', height: '100%' }}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[5, 5, 5]} intensity={0.7} />
                <Suspense fallback={null}>
                  {selectedProduct === 'Mugs' ? <MugModel /> : <TShirtModel />}
                </Suspense>
                <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
              </Canvas>
            </ModelErrorBoundary>
          </div>
        ) : (
          <div
            className="canvas-plane"
            style={{
              position: 'relative',
              width: canvasSize,
              height: canvasSize,
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
            }}
          >
            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              style={{ width: '100%', height: '100%' }}
            />
            {elements.map((el) => (
              <div
                key={el.id}
                className="canvas-element"
                onMouseDown={(e) => handleDrag(e, el.id)}
                onClick={() => setSelectedElementId(el.id)}
                style={{
                  position: 'absolute',
                  top: el.y,
                  left: el.x,
                  cursor: 'move',
                  pointerEvents: 'auto',
                  background: selectedElementId === el.id ? 'rgba(22,46,114,0.08)' : 'transparent',
                  border: selectedElementId === el.id ? '2px solid #162e72' : 'none',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  zIndex: selectedElementId === el.id ? 2 : 1
                }}
              >
                {el.type === 'text' ? (
                  <span
                    style={{
                      fontFamily: el.font,
                      fontSize: `${el.size}px`,
                      color: el.color,
                      userSelect: 'none',
                      pointerEvents: 'none',
                      transform: `scale(${el.scale ? el.scale / 100 : 1})`,
                    }}
                  >
                    {el.text}
                  </span>
                ) : (
                  <img
                    src={el.src}
                    alt="Uploaded"
                    style={{
                      opacity: el.opacity / 100,
                      transform: `scale(${el.scale / 100})`,
                      width: '100px',
                      userSelect: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomizePage;
