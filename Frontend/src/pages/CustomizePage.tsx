import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import 'react-quill/dist/quill.snow.css';
import './CustomizePage.css';

const productList = [
  'Mugs',
  'T-shirts',
  'Eco Bags',
  'Pens',
  'Tarpaulin',
  'Documents',
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
  'Eco Bags': {
    white: '/products/ecobag white.png',
    black: '/products/ecobag black.png',
  },
  'Pens': {
    white: '/products/pen white.png',
    black: '/products/pen black.png',
  },
  'Tarpaulin': '/products/tarpaulin.png',
};

const CustomizePage: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState('Mugs');
  const [elements, setElements] = useState<any[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<number | null>(null);
  const [docContent, setDocContent] = useState('');
  const [docFileName, setDocFileName] = useState('');
  const [docFileType, setDocFileType] = useState('');
  const [productColor, setProductColor] = useState<'white' | 'black'>('white');
  const [tshirtSide, setTshirtSide] = useState<'front' | 'back'>('front');
  const [canvasSize, setCanvasSize] = useState(700);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const [uploadedImage, setUploadedImage] = useState<any>(null);
  const [minimapRect, setMinimapRect] = useState({ x: 40, y: 40, w: 120, h: 80 });
  const [draggingMinimap, setDraggingMinimap] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // For resizing overlay
  const [resizing, setResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

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

  // Allow minimap drag in both x and y
  const handleMinimapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent drag if resizing
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    setDraggingMinimap(true);
    setDragOffset({
      x: e.clientX - minimapRect.x,
      y: e.clientY - minimapRect.y,
    });
  };

  // Handle mouse down on resize handle
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

  useEffect(() => {
    if (selectedProduct === 'Documents') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    let imgSrc = '';
    if (selectedProduct === 'Tarpaulin') {
      imgSrc = productImages['Tarpaulin'] as string;
    } else if (selectedProduct === 'T-shirts') {
      imgSrc = productImages['T-shirts'][productColor][tshirtSide];
    } else {
      imgSrc = productImages[selectedProduct][productColor];
    }
    const img = new window.Image();
    img.src = imgSrc;
    img.onload = () => {
      const imgW = canvasSize * 0.8;
      const imgH = canvasSize * 0.8;
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
      elements.forEach((el) => {
        if (el.type === 'text') {
          ctx.font = `${el.size}px ${el.font}`;
          ctx.fillStyle = el.color;
          ctx.save();
          ctx.translate(el.x, el.y + el.size);
          ctx.scale(el.scale ? el.scale / 100 : 1, el.scale ? el.scale / 100 : 1);
          ctx.fillText(el.text, 0, 0);
          ctx.restore();
        }
      });
    };
  }, [uploadedImage, minimapRect, selectedProduct, productColor, tshirtSide, canvasSize, elements]);

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

  // Remove handleAddText and Add Text UI

  const handleDeleteElement = () => {
    if (selectedElementId !== null) {
      setElements((prev) => prev.filter((el) => el.id !== selectedElementId));
      setSelectedElementId(null);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFileName(file.name);
    setDocFileType(file.type);

    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = () => {
        setDocContent(reader.result as string);
      };
      reader.readAsText(file);
    } else if (
      file.type === 'application/pdf' ||
      file.name.endsWith('.pdf')
    ) {
      const reader = new FileReader();
      reader.onload = async () => {
        const typedarray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        setDocContent(text);
      };
      reader.readAsArrayBuffer(file);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocContent(result.value);
      };
      reader.readAsArrayBuffer(file);
    } else if (
      file.type === 'application/msword' ||
      file.name.endsWith('.doc')
    ) {
      alert('DOC (old Word format) is not supported for editing. Please use DOCX, PDF, or TXT.');
    } else {
      alert('Only TXT, PDF, or DOCX files are allowed.');
    }
  };

  const handleDeleteDocument = () => {
    setDocContent('');
    setDocFileName('');
    setDocFileType('');
  };

  const handlePropertyChange = (prop: string, value: any) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === selectedElementId ? { ...el, [prop]: value } : el
      )
    );
  };

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

  const selectedElement = elements.find((el) => el.id === selectedElementId);

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

  const quillModules = {
    toolbar: [
      [{ font: [] }, { size: [] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ header: 1 }, { header: 2 }, 'blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
      [{ direction: 'rtl' }, { align: [] }],
      ['link', 'image', 'video'],
      ['clean'],
    ],
  };

  const quillFormats = [
    'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'header', 'blockquote', 'code-block',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'link', 'image', 'video'
  ];

  const showColorSelection = !['Tarpaulin', 'Documents'].includes(selectedProduct);

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
        {/* Move Product Color selection here */}
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
                alt="minimap"
                style={{
                  position: 'absolute',
                  left: minimapRect.x,
                  top: minimapRect.y,
                  width: minimapRect.w,
                  height: minimapRect.h,
                  objectFit: 'cover',
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
                title="Drag to move"
              >
                {/* Resize handle at bottom right */}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseDown={handleResizeMouseDown}
                  title="Resize"
                >
                  <span style={{ color: '#fff', fontSize: 12, userSelect: 'none' }}>↘</span>
                </div>
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
        {/* Save and Reset buttons at upper right */}
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
          {/* Front/Back buttons for T-shirts */}
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
        {selectedProduct === 'Documents' ? (
          <div style={{
            width: '90%',
            minHeight: 700,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 8,
            padding: 24,
            margin: '0 auto',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
          }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <button
                onClick={() => document.getElementById('file-input')?.click()}
                style={{
                  background: '#1e3a8a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '8px 16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginRight: 8
                }}
              >
                Upload Document
              </button>
              {docFileName && (
                <>
                  <span style={{ marginLeft: 8, color: '#1e3a8a', fontWeight: 'bold' }}>
                    {docFileName}
                  </span>
                  <button
                    onClick={handleDeleteDocument}
                    style={{
                      marginLeft: 16,
                      background: '#e11d48',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '4px 12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
            <ReactQuill
              theme="snow"
              value={docContent}
              onChange={setDocContent}
              modules={quillModules}
              formats={quillFormats}
              style={{ height: 500 }}
            />
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
      {/* Remove right-panel (Add Elements) */}
    </div>
  );
};

export default CustomizePage;