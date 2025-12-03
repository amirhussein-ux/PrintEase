import api from "./api";

export interface SavedDesign {
  _id: string;
  user: string;
  store: {
    _id: string;
    name: string;
    logoFileId?: string;
  };
  name: string;
  productType: string;
  color: string;
  designFile: {
    fileId: string;
    filename: string;
    mimeType: string;
    size: number;
  };
  customization: {
    position: { x: number; y: number };
    scale: number;
    rotation?: number;
    decalPosition3D?: { x: number; y: number; z: number };
    productDimensions?: { width: number; height: number };
    originalImage?: string;
  };
  thumbnail?: string | any;
  thumbnailUrl?: string;
  designUrl?: string;
  tags: string[];
  viewCount: number;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveDesignData {
  productType: string;
  color: string;
  name?: string;
  storeId: string;
  customization: {
    position: { x: number; y: number };
    scale: number;
    rotation?: number;
    decalPosition3D?: { x: number; y: number; z: number };
    productDimensions?: { width: number; height: number };
    originalImage?: string;
  };
  thumbnail?: string;
  tags?: string[];
}

// Helper to clean URLs - prevent double /api/
const cleanApiUrl = (url: string): string => {
  if (!url) return url;
  // Remove double /api/ if present
  return url.replace(/\/api\/api\//g, '/api/');
};

// Get the base URL without duplicate /api/
const getBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  // Ensure base URL doesn't end with /api/ if we're going to add it manually
  if (baseUrl.endsWith('/api')) {
    return baseUrl.slice(0, -4);
  }
  return baseUrl;
};

// ENHANCED thumbnail URL resolver - FIXED
export const getThumbnailUrl = (design: SavedDesign): string | null => {
  if (!design) return null;
  
  console.log("🔍 Getting thumbnail for:", design.name, {
    hasDesignFile: !!design.designFile?.fileId,
    hasThumbnail: !!design.thumbnail,
    thumbnailType: typeof design.thumbnail,
    hasThumbnailUrl: !!design.thumbnailUrl,
    hasOriginalImage: !!design.customization?.originalImage
  });
  
  const baseUrl = getBaseUrl();
  
  // Priority 1: Already resolved thumbnailUrl (backend URL)
  if (design.thumbnailUrl && design.thumbnailUrl !== 'null') {
    return cleanApiUrl(design.thumbnailUrl);
  }
  
  // Priority 2: Direct thumbnail field - check if it's a data URL
  if (design.thumbnail) {
    if (typeof design.thumbnail === 'string') {
      // If it's a data URL (uploaded image) - return as-is
      if (design.thumbnail.startsWith('data:image/')) {
        return design.thumbnail;
      }
      
      // If it's already a full URL - clean it
      if (design.thumbnail.startsWith('http')) {
        return cleanApiUrl(design.thumbnail);
      }
      
      // If it looks like an ObjectId (24 character hex string)
      if (/^[0-9a-fA-F]{24}$/.test(design.thumbnail)) {
        // Construct proper URL
        return `${baseUrl}/api/saved-designs/${design.user}/thumbnail/${design.thumbnail}`;
      }
    }
    
    // If thumbnail is an object (MongoDB ObjectId)
    if (typeof design.thumbnail === 'object') {
      const thumbnailStr = design.thumbnail.toString();
      if (thumbnailStr !== '[object Object]' && /^[0-9a-fA-F]{24}$/.test(thumbnailStr)) {
        return `${baseUrl}/api/saved-designs/${design.user}/thumbnail/${thumbnailStr}`;
      }
    }
  }
  
  // Priority 3: Original image from customization
  if (design.customization?.originalImage) {
    if (design.customization.originalImage.startsWith('data:image/') || 
        design.customization.originalImage.startsWith('http')) {
      return cleanApiUrl(design.customization.originalImage);
    }
  }
  
  // Priority 4: Design image file as fallback (THIS IS THE UPLOADED IMAGE)
  if (design.designFile?.fileId) {
    return `${baseUrl}/api/saved-designs/${design._id}/image`;
  }
  
  console.log("❌ No valid thumbnail source found for:", design.name);
  return null;
};

// Helper to get the ORIGINAL UPLOADED image
export const getOriginalImageUrl = (design: SavedDesign): string | null => {
  if (!design) return null;
  
  const baseUrl = getBaseUrl();
  
  // Get the actual uploaded design file
  if (design.designFile?.fileId) {
    return `${baseUrl}/api/saved-designs/${design._id}/image`;
  }
  
  return null;
};

// Helper to convert data URL to Blob
function dataURLtoBlob(dataURL: string): Blob {
  try {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    for (let i = 0; i < n; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }
    
    return new Blob([u8arr], { type: mime });
  } catch (error) {
    console.error('Error converting data URL to blob:', error);
    throw error;
  }
}

// Save a new design
export const saveDesign = async (
  designData: SaveDesignData,
  designFile: File,
  thumbnailFile?: File
): Promise<SavedDesign> => {
  console.log("🖼️ SAVE DESIGN - Starting...");
  
  const formData = new FormData();
  
  // Add design data
  formData.append("productType", designData.productType);
  formData.append("color", designData.color);
  formData.append("storeId", designData.storeId);
  
  if (designData.name) formData.append("name", designData.name);
  
  // Ensure originalImage is in customization
  if (designData.customization) {
    if (!designData.customization.originalImage && designData.thumbnail) {
      designData.customization.originalImage = designData.thumbnail;
    }
    formData.append("customization", JSON.stringify(designData.customization));
  }
  
  // Add design file (required)
  formData.append("designFile", designFile);
  
  // Handle thumbnail
  if (thumbnailFile) {
    formData.append("thumbnail", thumbnailFile);
  } else if (designData.thumbnail && designData.thumbnail.startsWith('data:image/')) {
    // Convert thumbnail data URL to blob if not provided as file
    const thumbnailBlob = dataURLtoBlob(designData.thumbnail);
    const thumbnailFilename = `thumbnail-${Date.now()}.png`;
    const thumbnailFileFromBlob = new File([thumbnailBlob], thumbnailFilename, { type: 'image/png' });
    formData.append("thumbnail", thumbnailFileFromBlob);
  }
  
  if (designData.tags && designData.tags.length > 0) {
    formData.append("tags", JSON.stringify(designData.tags));
  }

  try {
    const response = await api.post("/saved-designs", formData, {
      headers: { 
        "Content-Type": "multipart/form-data",
      },
    });
    
    console.log("✅ Design saved successfully!", response.data);
    
    const savedDesign = response.data;
    
    // Ensure the saved design has a thumbnail URL
    if (!savedDesign.thumbnailUrl) {
      savedDesign.thumbnailUrl = getThumbnailUrl(savedDesign);
    }
    
    return savedDesign;
  } catch (error: any) {
    console.error("❌ ERROR SAVING DESIGN:", error);
    
    if (error.response) {
      console.error("Backend response:", error.response.data);
    }
    
    throw error;
  }
};

// Get all designs for current user
export const getMyDesigns = async (): Promise<SavedDesign[]> => {
  try {
    const response = await api.get("/saved-designs");
    const designs = response.data;
    
    console.log("📦 Raw designs from API:", designs.map((d: SavedDesign) => ({
      name: d.name,
      productType: d.productType,
      hasDesignFile: !!d.designFile?.fileId,
      thumbnailType: typeof d.thumbnail,
      thumbnail: typeof d.thumbnail === 'string' ? d.thumbnail.substring(0, 50) : 'Object',
      customization: !!d.customization?.originalImage
    })));
    
    // Process designs to ensure they have proper thumbnail URLs
    const processedDesigns = designs.map((design: SavedDesign) => {
      const processedDesign = { ...design };
      
      // Get thumbnail URL using our enhanced resolver
      const thumbnailUrl = getThumbnailUrl(processedDesign);
      if (thumbnailUrl) {
        processedDesign.thumbnailUrl = thumbnailUrl;
      }
      
      return processedDesign;
    });
    
    return processedDesigns;
  } catch (error) {
    console.error("Error fetching designs:", error);
    throw error;
  }
};

// Get single design by ID
export const getDesignById = async (id: string): Promise<SavedDesign> => {
  const response = await api.get(`/saved-designs/${id}`);
  const design = response.data;
  
  if (!design.thumbnailUrl) {
    design.thumbnailUrl = getThumbnailUrl(design);
  }
  
  return design;
};

// Update design metadata
export const updateDesign = async (
  id: string, 
  data: { name?: string; tags?: string[] }
): Promise<SavedDesign> => {
  const response = await api.patch(`/saved-designs/${id}`, data);
  return response.data;
};

// Delete design
export const deleteDesign = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/saved-designs/${id}`);
  return response.data;
};

// Download design image
export const downloadDesignImage = async (id: string): Promise<string> => {
  const response = await api.get(`/saved-designs/${id}/image`, {
    responseType: "blob",
  });
  
  return URL.createObjectURL(response.data);
};

// Convert design to order
export const convertDesignToOrder = async (
  id: string, 
  data: { serviceId: string; quantity: number; notes?: string }
): Promise<any> => {
  const response = await api.post(`/saved-designs/${id}/convert-to-order`, data);
  return response.data;
};