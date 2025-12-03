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
  thumbnail?: string;
  thumbnailUrl?: string;
  designUrl?: string;
  originalImageUrl?: string;
  is3DProduct?: boolean;
  is2DProduct?: boolean;
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

const getBaseUrl = (): string => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return baseUrl.replace(/\/$/, '');
};

export const getThumbnailUrl = (design: SavedDesign): string => {
  if (!design || !design._id) return '';
  
  console.log(`🖼️ Getting thumbnail for: ${design.name}`);
  
  // 1. FIRST: Use original uploaded image (data URL) if available
  if (design.customization?.originalImage) {
    const img = design.customization.originalImage;
    if (img.startsWith('data:image/')) {
      console.log('✅ Using original image data URL');
      return img;
    }
  }
  
  // 2. SECOND: Try backend image endpoint
  const baseUrl = getBaseUrl();
  
  // Try multiple endpoint formats
  const endpoints = [
    `${baseUrl}/api/saved-designs/${design._id}/image`,
    `${baseUrl}/api/saved-designs/${design._id}/image/download`,
    design.designFile?.fileId ? `${baseUrl}/api/uploads/${design.designFile.fileId}` : ''
  ];
  
  for (const endpoint of endpoints) {
    if (endpoint && endpoint.includes('http')) {
      console.log(`🔄 Trying endpoint: ${endpoint}`);
      return endpoint;
    }
  }
  
  // 3. FALLBACK: Default endpoint
  return `${baseUrl}/api/saved-designs/${design._id}/image`;
};

export const getOriginalImageUrl = (design: SavedDesign): string => {
  if (!design) return '';
  
  if (design.customization?.originalImage) {
    return design.customization.originalImage;
  }
  
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/saved-designs/${design._id}/image`;
};

export const saveDesign = async (
  designData: SaveDesignData,
  designFile: File,
  thumbnailFile?: File
): Promise<SavedDesign> => {
  console.log("🖼️ SAVE DESIGN - Starting...");
  console.log("📸 Original image size:", designData.customization?.originalImage?.length || 0);
  
  const formData = new FormData();
  
  // Basic design data
  formData.append("productType", designData.productType);
  formData.append("color", designData.color);
  formData.append("storeId", designData.storeId);
  
  if (designData.name) formData.append("name", designData.name);
  
  // IMPORTANT: Send customization WITH originalImage (data URL)
  // Backend now has fieldSize limit to handle it
  if (designData.customization) {
    console.log("💾 Saving customization WITH originalImage");
    console.log("📏 Original image preview:", designData.customization.originalImage?.substring(0, 100) || 'none');
    formData.append("customization", JSON.stringify(designData.customization));
  }
  
  // Add design file
  formData.append("designFile", designFile);
  console.log("📁 Design file:", designFile.name, designFile.size, "bytes");
  
  // Add thumbnail if provided
  if (thumbnailFile) {
    formData.append("thumbnail", thumbnailFile);
    console.log("🖼️ Thumbnail file:", thumbnailFile.name, thumbnailFile.size, "bytes");
  }
  
  if (designData.tags && designData.tags.length > 0) {
    formData.append("tags", JSON.stringify(designData.tags));
  }

  try {
    const response = await api.post("/saved-designs", formData, {
      headers: { 
        "Content-Type": "multipart/form-data",
      },
      // Increase timeout for large data URLs
      timeout: 30000,
    });
    
    console.log("✅ Design saved successfully!");
    console.log("📦 Response:", {
      id: response.data._id,
      name: response.data.name,
      hasCustomization: !!response.data.customization,
      hasOriginalImage: !!response.data.customization?.originalImage
    });
    
    const savedDesign = response.data;
    
    // Set thumbnail URL
    savedDesign.thumbnailUrl = getThumbnailUrl(savedDesign);
    
    return savedDesign;
  } catch (error: any) {
    console.error("❌ ERROR SAVING DESIGN:", error);
    
    if (error.response) {
      console.error("Backend response status:", error.response.status);
      console.error("Backend response data:", error.response.data);
      
      if (error.response.status === 500) {
        throw new Error("Server error: " + (error.response.data.message || "Please try again"));
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error("Request timeout. The image might be too large. Try a smaller image.");
    }
    
    throw error;
  }
};

export const getMyDesigns = async (): Promise<SavedDesign[]> => {
  try {
    const response = await api.get("/saved-designs");
    const designs = response.data;
    
    console.log(`📦 Received ${designs.length} designs from API`);
    
    // Debug each design
    designs.forEach((design: SavedDesign, index: number) => {
      console.log(`${index + 1}. ${design.name} (${design.productType})`, {
        hasOriginalImage: !!design.customization?.originalImage,
        originalImageLength: design.customization?.originalImage?.length || 0,
        designFile: design.designFile?.fileId ? 'Yes' : 'No',
        thumbnailUrl: getThumbnailUrl(design)
      });
    });
    
    // Process designs
    const processedDesigns = designs.map((design: SavedDesign) => {
      const processed = { ...design };
      processed.thumbnailUrl = getThumbnailUrl(processed);
      return processed;
    });
    
    return processedDesigns;
  } catch (error) {
    console.error("Error fetching designs:", error);
    throw error;
  }
};

export const getDesignById = async (id: string): Promise<SavedDesign> => {
  const response = await api.get(`/saved-designs/${id}`);
  const design = response.data;
  design.thumbnailUrl = getThumbnailUrl(design);
  return design;
};

export const updateDesign = async (
  id: string, 
  data: { name?: string; tags?: string[] }
): Promise<SavedDesign> => {
  const response = await api.patch(`/saved-designs/${id}`, data);
  return response.data;
};

export const deleteDesign = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/saved-designs/${id}`);
  return response.data;
};

export const downloadDesignImage = async (id: string): Promise<string> => {
  const response = await api.get(`/saved-designs/${id}/image`, {
    responseType: "blob",
  });
  
  return URL.createObjectURL(response.data);
};

export const convertDesignToOrder = async (
  id: string, 
  data: { serviceId: string; quantity: number; notes?: string }
): Promise<any> => {
  const response = await api.post(`/saved-designs/${id}/convert-to-order`, data);
  return response.data;
};