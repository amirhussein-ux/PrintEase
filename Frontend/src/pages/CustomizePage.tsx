import React, { useState, useRef, useEffect } from 'react';
import 'react-quill/dist/quill.snow.css';
import './CustomizePage.css';

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
  const [minimapRect, setMinimapRect] = useState({ x: 40, y: 40, w: 120, h: 80 });
  const [draggingMinimap, setDraggingMinimap] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const middlePanelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);

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
        setMinimapRect({ x: 40, y: 40, w: 120, h: 80 });
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
                  left: minimapRect.x,
                  top: minimapRect.y,
                  width: minimapRect.w,
                  height: minimapRect.h,
                  objectFit: 'contain',
                  pointerEvents: 'none',
                  border: '2px solid #162e72',
                  borderRadius: 4,
                  background: '#fff'
                }}
              />
            )}
            {uploadedImage && (
              <div
                ref={minimapRef}
                style={{
                  position: 'absolute',
                  left: minimapRect.x,
                  top: minimapRect.y,
                  width: minimapRect.w,
                  height: minimapRect.h,
                  border: '2px solid #162e72',
                  borderRadius: 4,
                  cursor: resizing ? 'nwse-resize' : 'move',
                  background: 'rgba(22,46,114,0.08)',
                  zIndex: 2,
                  boxSizing: 'border-box',
                }}
                onMouseDown={handleMinimapMouseDown}
              >
                <div
                  className="resize-handle"
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 16,
                    height: 16,
                    background: '#162e72',
                    borderRadius: '0 0 4px 0',
                    cursor: 'nwse-resize',
                    zIndex: 3,
                  }}
                  onMouseDown={handleResizeMouseDown}
                />
              </div>
            )}
          </div>
        </div>
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
      </div>
    </div>
  );
};

export default CustomizePage;
