import React, { useState, useEffect, Suspense, useRef } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { getMyDesigns, deleteDesign, getThumbnailUrl, type SavedDesign } from "@/lib/savedDesigns";
import { FiTrash2, FiEdit, FiDownload, FiEye, FiShoppingCart, FiShare2, FiCopy, FiFilter, FiX } from "react-icons/fi";
import { MdOutlineAddShoppingCart, MdOutline3dRotation, MdOutlineImage, MdOutlineRotateRight } from "react-icons/md";
import { TbColorSwatch, TbPhotoEdit } from "react-icons/tb";
import { toast } from "react-toastify";
import ConfirmDialog from "../shared_components/ConfirmDialog";
import { useNavigate } from "react-router-dom";

// Import Three.js components for modal viewer
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Decal, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";

// --- Product Settings (from Customize.tsx) ---
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

// --- Error Boundary ---
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

// --- 2D Product Preview Component for modal ---
function Product2DPreviewModal({
  decalImage,
  backgroundColor,
  dimensions,
  position = [0.5, 0.5],
  scale = 0.5
}: {
  decalImage: string | null;
  backgroundColor: string;
  dimensions?: { width: number; height: number };
  position?: [number, number];
  scale?: number;
}) {
  const getDimensions = () => {
    if (dimensions) return dimensions;
    return { width: 200, height: 200 };
  };

  const dims = getDimensions();
  const aspectRatio = dims.width / dims.height;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div 
        className="relative border-2 border-gray-600 rounded-lg shadow-2xl"
        style={{
          width: 'min(90%, 400px)',
          height: 'min(90%, 400px)',
          backgroundColor,
          aspectRatio: aspectRatio,
          backgroundImage: `linear-gradient(to right, rgba(100,100,100,0.2) 1px, transparent 1px),
                           linear-gradient(to bottom, rgba(100,100,100,0.2) 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      >
        {/* Decal Image */}
        {decalImage && (
          <div 
            className="absolute rounded-lg overflow-hidden border-2 border-blue-400/30"
            style={{
              backgroundImage: `url(${decalImage})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              width: `${scale * 100}%`,
              height: `${scale * 100}%`,
              left: `${position[0] * 100}%`,
              top: `${position[1] * 100}%`,
              transform: `translate(-${position[0] * 100}%, -${position[1] * 100}%)`
            }}
          />
        )}
        
        {/* Dimensions Label */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm font-mono whitespace-nowrap bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded">
          {dims.width}mm × {dims.height}mm
        </div>
      </div>
    </div>
  );
}

// --- 3D Model Viewer for modal ---
function ThreeDModelViewerModal({ 
  design 
}: { 
  design: SavedDesign 
}) {
  const [autoRotate, setAutoRotate] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [actualMesh, setActualMesh] = useState<THREE.Mesh | null>(null);
  
  const productInfo = productSettings[design.productType];
  const variation = productInfo?.variations[design.color];
  
  // Get the ORIGINAL uploaded image from customization data (for interactive 3D preview)
  const decalImage = design.customization?.originalImage || design.thumbnail;

  useEffect(() => {
    if (decalImage) {
      console.log("🖼️ Loading design image for 3D preview:", decalImage.substring(0, 100));
      const loader = new THREE.TextureLoader();
      loader.load(
        decalImage,
        (loadedTexture) => {
          loadedTexture.encoding = THREE.sRGBEncoding;
          loadedTexture.anisotropy = 16;
          loadedTexture.needsUpdate = true;
          setTexture(loadedTexture);
          console.log("✅ Texture loaded for design preview");
        },
        undefined,
        (error) => {
          console.error('❌ Error loading design texture:', error);
          toast.error("Failed to load design image");
        }
      );
    }
  }, [decalImage]);

  if (!productInfo || !variation) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400">
        Unable to load 3D preview
      </div>
    );
  }

  const convertTo3DPosition = (): [number, number, number] => {
    if (!design.customization?.position) {
      return productInfo.decalDefaults.position;
    }
    
    const position2D = [design.customization.position.x, design.customization.position.y] as [number, number];
    
    if (design.productType === 'Mug') {
      const x = (position2D[0] - 0.5) * 0.6;
      const y = 0.8 + (position2D[1] * 0.7);
      return [x, y, productInfo.decalDefaults.position[2]];
    } else if (design.productType === 'T-Shirt') {
      const x = (position2D[0] - 0.5);
      const y = 0.3 + (position2D[1] * 0.5);
      return [x, y, productInfo.decalDefaults.position[2]];
    }
    
    return productInfo.decalDefaults.position;
  };

  const decalPosition = convertTo3DPosition();
  const decalScale = design.customization?.scale || productInfo.decalDefaults.scale;

  // Product Model Component
  const ProductModel = () => {
    const { nodes } = useGLTF(variation.path);
    const [textureAspect, setTextureAspect] = useState(1);

    useEffect(() => {
      // Find the target mesh
      const targetNode = nodes[variation.targetMeshName];
      if (targetNode) {
        if (targetNode.isMesh) {
          setActualMesh(targetNode as THREE.Mesh);
        } else {
          targetNode.traverse((child) => {
            if (child instanceof THREE.Mesh && !actualMesh) {
              setActualMesh(child);
            }
          });
        }
      }
    }, [nodes]);

    useEffect(() => {
      if (texture?.image) {
        const img = texture.image;
        if (img.width && img.height) {
          setTextureAspect(img.width / img.height);
        }
      }
    }, [texture]);

    if (!actualMesh) return <Loader />;

    const adjustedWidth = decalScale * textureAspect;
    const adjustedHeight = decalScale;

    return (
      <group scale={variation.scale} position={variation.position} rotation={variation.rotation}>
        <mesh ref={meshRef} geometry={actualMesh.geometry} castShadow receiveShadow>
          <meshStandardMaterial 
            color={variation.colorCode} 
            roughness={0.8} 
            metalness={0.1} 
          />
          
          {texture && (
            <Decal
              position={decalPosition}
              rotation={[0, 0, 0]}
              scale={[adjustedWidth, adjustedHeight, 1]}
              map={texture}
              mesh={meshRef}
            >
              <meshStandardMaterial
                map={texture}
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
  };

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden">
      <ErrorBoundary>
        <Canvas 
          camera={{ position: [0, 0, 5], fov: 50 }}
          onPointerDown={() => setIsDragging(true)} 
          onPointerUp={() => setIsDragging(false)}
        >
          <ambientLight intensity={0.8} />
          <Environment preset="city" />
          <Suspense fallback={<Loader />}>
            <ProductModel />
          </Suspense>
          <OrbitControls 
            enablePan={false} 
            minDistance={2} 
            maxDistance={10} 
            autoRotate={autoRotate && !isDragging} 
            autoRotateSpeed={1.5} 
          />
        </Canvas>
      </ErrorBoundary>
      
      {/* Rotate toggle */}
      <div className="absolute top-4 right-4 z-10">
        <label className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 cursor-pointer transition-all duration-200">
          <input
            type="checkbox"
            checked={autoRotate}
            onChange={(e) => setAutoRotate(e.target.checked)}
            className="w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-600 focus:ring-offset-gray-800 focus:ring-2 focus:ring-offset-2 cursor-pointer"
          />
          <div className="flex items-center gap-2">
            <MdOutlineRotateRight className={`w-4 h-4 ${autoRotate ? 'text-blue-400 animate-spin' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${autoRotate ? 'text-blue-300' : 'text-gray-300'}`}>
              Auto Rotate
            </span>
          </div>
        </label>
      </div>
      
      {/* Customization info overlay */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg">
        <div className="flex items-center gap-2">
          <span>Position: X: {design.customization?.position?.x?.toFixed(2) || '0.50'}, Y: {design.customization?.position?.y?.toFixed(2) || '0.50'}</span>
          <span>•</span>
          <span>Scale: {design.customization?.scale?.toFixed(2) || '1.00'}</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-lg">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}

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
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [dimensionFilter, setDimensionFilter] = useState<string>('all');

  // Product type options
  const threeDProducts = ['Mug', 'T-Shirt'];
  const twoDProducts = ['Mousepad', 'Sticker', 'Phone Case'];

  // Dimension options for 2D products
  const dimensionOptions = {
    'all': 'All Sizes',
    'mousepad': 'Mousepad (300x100mm)',
    'sticker': 'Sticker (100x100mm)',
    'phonecase': 'Phone Case (80x160mm)'
  };

  // Preload 3D models
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
    
    console.log("📦 Fetched designs:", data.map(d => ({
      name: d.name,
      productType: d.productType,
      hasThumbnailUrl: !!d.thumbnailUrl,
      thumbnailUrl: d.thumbnailUrl?.substring(0, 50),
      hasOriginalImage: !!d.customization?.originalImage
    })));
    
    // Process designs to ensure they have valid image URLs
    const processedDesigns = data.map(design => {
      const processed = { ...design };
      
      // If thumbnailUrl is not set, try to get it
      if (!processed.thumbnailUrl) {
        processed.thumbnailUrl = getThumbnailUrl(design);
      }
      
      // Ensure customization has originalImage
      if (!processed.customization?.originalImage && processed.thumbnailUrl) {
        if (!processed.customization) processed.customization = {};
        processed.customization.originalImage = processed.thumbnailUrl;
      }
      
      return processed;
    });
    
    setDesigns(processedDesigns);
    setFilteredDesigns(processedDesigns);
    
    // Store in cache with timestamp
    localStorage.setItem('savedDesignsCache', JSON.stringify({
      data: processedDesigns,
      timestamp: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error("Error fetching designs:", error);
    
    // Try to load from cache
    const cache = localStorage.getItem('savedDesignsCache');
    if (cache) {
      try {
        const { data, timestamp } = JSON.parse(cache);
        const cacheAge = new Date().getTime() - new Date(timestamp).getTime();
        
        if (cacheAge < 10 * 60 * 1000) { // 10 minute cache
          // Process cached designs to ensure URLs
          const processedCachedDesigns = data.map((design: SavedDesign) => {
            const processed = { ...design };
            
            if (!processed.thumbnailUrl) {
              processed.thumbnailUrl = getThumbnailUrl(design);
            }
            
            if (!processed.customization?.originalImage && processed.thumbnailUrl) {
              if (!processed.customization) processed.customization = {};
              processed.customization.originalImage = processed.thumbnailUrl;
            }
            
            return processed;
          });
          
          setDesigns(processedCachedDesigns);
          setFilteredDesigns(processedCachedDesigns);
          toast.info("Showing cached designs");
        } else {
          localStorage.removeItem('savedDesignsCache');
          toast.error("Failed to load designs. Please refresh.");
        }
      } catch (parseError) {
        console.error("Error parsing cache:", parseError);
        localStorage.removeItem('savedDesignsCache');
        toast.error("Failed to load designs.");
      }
    } else {
      toast.error("Failed to load saved designs");
    }
  } finally {
    setLoading(false);
  }
};

  const filterDesigns = () => {
    let filtered = [...designs];

    // Apply product type filter
    if (productTypeFilter !== 'all') {
      if (productTypeFilter === '3d') {
        filtered = filtered.filter(design => threeDProducts.includes(design.productType));
      } else if (productTypeFilter === '2d') {
        filtered = filtered.filter(design => twoDProducts.includes(design.productType));
      } else {
        filtered = filtered.filter(design => design.productType === productTypeFilter);
      }
    }

    // Apply dimension filter for 2D products
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
      
      // Update cache
      const cache = localStorage.getItem('savedDesignsCache');
      if (cache) {
        const { timestamp } = JSON.parse(cache);
        localStorage.setItem('savedDesignsCache', JSON.stringify({
          data: designs.filter(design => design._id !== id),
          timestamp: timestamp
        }));
      }
      
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
      
      // Use the thumbnail (captured snapshot) for download
      if (design.thumbnail) {
        console.log("📥 Downloading design thumbnail:", design.thumbnail.substring(0, 100));
        const response = await fetch(design.thumbnail);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${design.name.replace(/\s+/g, '_')}_${design.productType}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("Design downloaded as PNG!");
      } else {
        toast.error("No design image available for download");
      }
    } catch (error) {
      console.error("Error downloading design:", error);
      toast.error("Failed to download design");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUseDesign = (design: SavedDesign) => {
    navigate("/customer/order", { 
      state: { 
        designId: design._id,
        productType: design.productType,
        color: design.color,
        storeId: design.store._id
      }
    });
    toast.info(`Proceeding to order for ${design.productType}`);
  };

  const handleShareDesign = (design: SavedDesign) => {
    const shareUrl = `${window.location.origin}/share/design/${design._id}`;
    
    if (navigator.share) {
      navigator.share({
        title: design.name,
        text: `Check out my custom ${design.productType} design!`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDuplicateDesign = (design: SavedDesign) => {
    navigate("/dashboard/customize", {
      state: {
        designData: design,
        duplicate: true
      }
    });
    toast.info(`Duplicating "${design.name}"...`);
  };

  const getProductTypeColor = (productType: string) => {
    switch (productType) {
      case 'Mug': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'T-Shirt': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Mousepad': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Sticker': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Phone Case': return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
        <div className="w-full max-w-7xl mx-auto p-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-2xl">🎨</div>
              </div>
            </div>
            <p className="mt-4 text-gray-400 animate-pulse">Loading your creative designs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="customer">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Design Gallery
              </h1>
              <p className="text-gray-400 mt-2">
                {filteredDesigns.length === 0 
                  ? "No designs match your filters" 
                  : `${filteredDesigns.length} design${filteredDesigns.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 ${
                  showFilters || productTypeFilter !== 'all' || dimensionFilter !== 'all'
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/50'
                    : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:border-gray-600'
                }`}
              >
                <FiFilter />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
                {(productTypeFilter !== 'all' || dimensionFilter !== 'all') && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </button>
              <a
                href="/dashboard/customize"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="text-lg">+</span>
                New Design
              </a>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 animate-in slide-in-from-top duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Filter Designs</h3>
                {(productTypeFilter !== 'all' || dimensionFilter !== 'all') && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                  >
                    <FiX /> Clear Filters
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Product Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setProductTypeFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        productTypeFilter === 'all'
                          ? 'bg-gray-700 text-white border border-gray-600'
                          : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                      }`}
                    >
                      All Products
                    </button>
                    <button
                      onClick={() => setProductTypeFilter('3d')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        productTypeFilter === '3d'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                      }`}
                    >
                      <MdOutline3dRotation className="text-sm" />
                      3D Products
                    </button>
                    <button
                      onClick={() => setProductTypeFilter('2d')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        productTypeFilter === '2d'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                      }`}
                    >
                      <MdOutlineImage className="text-sm" />
                      2D Products
                    </button>
                    {['Mug', 'T-Shirt', 'Mousepad', 'Sticker', 'Phone Case'].map(type => (
                      <button
                        key={type}
                        onClick={() => setProductTypeFilter(type)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          productTypeFilter === type
                            ? getProductTypeColor(type)
                            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimension Filter (only for 2D products) */}
                {(productTypeFilter === 'all' || productTypeFilter === '2d' || twoDProducts.includes(productTypeFilter)) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Product Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(dimensionOptions).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setDimensionFilter(key)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            dimensionFilter === key
                              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50'
                              : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
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

          {/* Stats */}
          {designs.length > 0 && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="text-2xl font-bold text-white">{designs.length}</div>
                <div className="text-sm text-gray-400">Total Designs</div>
              </div>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                <div className="text-2xl font-bold text-white">
                  {new Set(designs.map(d => d.productType)).size}
                </div>
                <div className="text-sm text-gray-400">Product Types</div>
              </div>
            </div>
          )}
        </div>

        {/* Designs Grid */}
        {filteredDesigns.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-12 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 mb-6">
              <div className="text-4xl text-gray-400">🔍</div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              {designs.length === 0 ? 'No Designs Yet' : 'No Designs Found'}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {designs.length === 0 
                ? 'Create your first custom design and watch your collection grow.' 
                : 'Try changing your filters or clear them to see all designs.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/dashboard/customize"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Create New Design
              </a>
              {designs.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 border border-gray-600"
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
                className="group bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden hover:border-gray-600 transition-all duration-300 hover:shadow-2xl"
              >
                {/* Design Preview - SHOW THE EXACT FRONT VIEW CAPTURED THUMBNAIL (NO EMOJIS) */}
                <div 
                  className="h-56 relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 cursor-pointer group"
                  onClick={() => setSelectedDesign(design)}
                >
                  {design.thumbnail ? (
                    <div className="w-full h-full relative">
                      {/* THUMBNAIL IMAGE - This shows the exact front view captured from customize page */}
                      <img
                        src={getThumbnailUrl(design) || design.customization?.originalImage || design.thumbnail as string}
                        alt={design.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          console.error('❌ Thumbnail failed to load for:', design.name);
                          const target = e.target as HTMLImageElement;
                          
                          // Try fallback sources in order
                          const fallbackSources = [
                            design.customization?.originalImage,
                            design.thumbnail as string,
                            `${import.meta.env.VITE_API_URL}/saved-designs/${design._id}/image`
                          ];
                          
                          // Find current source index
                          const currentSrc = target.src;
                          const currentIndex = fallbackSources.findIndex(src => src === currentSrc);
                          
                          if (currentIndex < fallbackSources.length - 1) {
                            // Try next fallback
                            const nextSrc = fallbackSources[currentIndex + 1];
                            if (nextSrc && nextSrc !== currentSrc) {
                              target.src = nextSrc;
                              console.log('🔄 Trying fallback source:', nextSrc.substring(0, 50));
                              return;
                            }
                          }
                          
                          // All sources failed, show fallback UI
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const existingFallback = parent.querySelector('.thumbnail-fallback');
                            if (!existingFallback) {
                              const fallback = document.createElement('div');
                              fallback.className = 'thumbnail-fallback w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-4';
                              fallback.innerHTML = `
                                <div class="text-center">
                                  <div class="text-sm text-gray-300 font-medium mb-1">${design.productType}</div>
                                  <div class="text-xs text-gray-500 mb-2">${design.name}</div>
                                  <div class="text-xs text-gray-400">Design preview</div>
                                </div>
                              `;
                              parent.appendChild(fallback);
                            }
                          }
                        }}
                        onLoad={() => {
                          console.log('✅ Thumbnail loaded for:', design.name);
                        }}
                      />
                      
                      {/* Hover overlay with "View 3D" button */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-4">
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3 mb-2">
                          <div className="text-white text-sm font-semibold flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                            </svg>
                            View in 3D
                          </div>
                        </div>
                        <p className="text-white/80 text-xs text-center">
                          Click to interact with 3D model
                        </p>
                      </div>
                      
                      {/* Product Type Badge */}
                      <div className={`absolute top-3 left-3 px-3 py-1 rounded-full border text-xs font-semibold backdrop-blur-sm ${getProductTypeColor(design.productType)}`}>
                        {design.productType}
                      </div>
                      
                      {/* 3D/2D Badge */}
                      <div className="absolute top-3 right-3">
                        {threeDProducts.includes(design.productType) ? (
                          <div className="flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded-lg">
                            <MdOutline3dRotation className="text-blue-400 text-xs" />
                            <span className="text-xs text-gray-300">3D</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded-lg">
                            <MdOutlineImage className="text-green-400 text-xs" />
                            <span className="text-xs text-gray-300">2D</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Saved Time */}
                      <div className="absolute bottom-3 right-3 bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded-lg">
                        <div className="text-xs text-gray-300 font-medium">
                          {getTimeOfDay(design.createdAt)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // When there's NO thumbnail at all - show minimal preview (NO EMOJIS)
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 p-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-300 font-medium mb-1">{design.productType}</div>
                        <div className="text-xs text-gray-500 mb-2">No preview available</div>
                        <div className="text-xs text-gray-400">{design.name}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Design Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate text-lg mb-1">
                        {design.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-4 h-4 rounded-full border border-gray-600 shadow-sm"
                          style={{ backgroundColor: design.color }}
                          title={design.color}
                        />
                        <span className="text-sm text-gray-400 capitalize">{design.color}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatDate(design.createdAt)}</span>
                        <span>•</span>
                        <span>{getTimeOfDay(design.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg px-2 py-1">
                      <FiEye className="text-gray-400 text-sm" />
                      <span className="text-xs text-gray-300 font-medium">{design.viewCount}</span>
                    </div>
                  </div>

                  {/* Store Info */}
                  <div className="flex items-center gap-3 mb-5 p-3 bg-gray-700/30 rounded-xl border border-gray-600/50">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden border border-gray-500">
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
                      <div className="text-sm font-medium text-gray-200 truncate">
                        {design.store.name}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseDesign(design)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:shadow-lg active:scale-[0.98] group/order"
                    >
                      <FiShoppingCart className="text-lg group-hover/order:scale-110 transition-transform" />
                      Order Now
                    </button>
                    <button
                      onClick={() => handleDuplicateDesign(design)}
                      className="p-3 hover:bg-gray-700 rounded-xl text-gray-400 hover:text-white transition-all duration-200 border border-gray-600 hover:border-gray-500"
                      title="Duplicate Design"
                    >
                      <FiCopy />
                    </button>
                    <button
                      onClick={() => handleDownload(design)}
                      disabled={downloadingId === design._id}
                      className="p-3 hover:bg-blue-600/20 rounded-xl text-gray-400 hover:text-blue-400 transition-all duration-200 border border-gray-600 hover:border-blue-500/50 disabled:opacity-50"
                      title="Download as PNG"
                    >
                      {downloadingId === design._id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
                      ) : (
                        <FiDownload />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setDesignToDelete(design._id);
                        setShowDeleteDialog(true);
                      }}
                      className="p-3 hover:bg-red-600/20 rounded-xl text-gray-400 hover:text-red-400 transition-all duration-200 border border-gray-600 hover:border-red-500/50"
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

        {/* Design Preview Modal */}
        {selectedDesign && (
          <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setSelectedDesign(null)}
          >
            <div 
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 w-full max-w-6xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedDesign.name}</h3>
                  <p className="text-gray-400 text-sm">
                    {selectedDesign.productType} • {selectedDesign.color}
                    <span className="ml-3 text-xs bg-gray-700 px-2 py-1 rounded">
                      {formatDate(selectedDesign.createdAt)} at {getTimeOfDay(selectedDesign.createdAt)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDesign(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden p-6">
                <div className="h-[500px] rounded-xl overflow-hidden border border-gray-600">
                  {threeDProducts.includes(selectedDesign.productType) ? (
                    // 3D PREVIEW MODAL - Uses originalImage to recreate the design
                    <ThreeDModelViewerModal design={selectedDesign} />
                  ) : (
                    // 2D Preview
                    <Product2DPreviewModal
                      decalImage={selectedDesign.customization?.originalImage || selectedDesign.thumbnail || ''}
                      backgroundColor={selectedDesign.color}
                      dimensions={selectedDesign.customization?.productDimensions}
                      position={selectedDesign.customization?.position ? 
                        [selectedDesign.customization.position.x, selectedDesign.customization.position.y] as [number, number] : 
                        [0.5, 0.5]
                      }
                      scale={selectedDesign.customization?.scale || 0.5}
                    />
                  )}
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Position</div>
                    <div className="text-white font-medium">
                      X: {selectedDesign.customization?.position?.x?.toFixed(2) || '0.50'}, 
                      Y: {selectedDesign.customization?.position?.y?.toFixed(2) || '0.50'}
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Scale</div>
                    <div className="text-white font-medium">
                      {selectedDesign.customization?.scale?.toFixed(2) || '1.00'}x
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Saved</div>
                    <div className="text-white font-medium">
                      {formatDate(selectedDesign.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleUseDesign(selectedDesign)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-xl transition-all duration-200"
                  >
                    <FiShoppingCart className="inline mr-2" />
                    Order This Design
                  </button>
                  <button
                    onClick={() => handleDownload(selectedDesign)}
                    disabled={downloadingId === selectedDesign._id}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all duration-200 border border-gray-600 disabled:opacity-50"
                  >
                    {downloadingId === selectedDesign._id ? 'Downloading...' : 'Download PNG'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
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
    </DashboardLayout>
  );
};

export default SavedDesigns;