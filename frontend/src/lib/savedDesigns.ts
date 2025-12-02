// frontend/src/lib/savedDesigns.ts - COMPLETE FIXED VERSION
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
    originalImage?: string; // Store original uploaded image
  };
  thumbnail?: string;
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
    originalImage?: string; // Include original uploaded image
  };
  thumbnail?: string; // Captured snapshot as data URL
  tags?: string[];
}

// Save a new design - FIXED VERSION
export const saveDesign = async (
  designData: SaveDesignData,
  designFile: File,
  thumbnailFile?: File // Optional thumbnail file
): Promise<SavedDesign> => {
  console.log("🖼️ SAVE DESIGN - Starting...");
  console.log("📁 Design file:", {
    name: designFile.name,
    size: designFile.size,
    type: designFile.type
  });
  
  console.log("📊 Design data:", {
    productType: designData.productType,
    color: designData.color,
    storeId: designData.storeId,
    name: designData.name,
    hasThumbnail: !!designData.thumbnail,
    hasCustomization: !!designData.customization,
    hasOriginalImage: !!designData.customization?.originalImage
  });

  const formData = new FormData();
  
  // Add design data as individual fields
  formData.append("productType", designData.productType);
  formData.append("color", designData.color);
  formData.append("storeId", designData.storeId);
  
  // Add JSON fields
  if (designData.customization) {
    // Ensure originalImage is in customization
    if (!designData.customization.originalImage && designData.thumbnail) {
      designData.customization.originalImage = designData.thumbnail;
    }
    formData.append("customization", JSON.stringify(designData.customization));
  }
  
  if (designData.name) formData.append("name", designData.name);
  
  // Add design file (required)
  formData.append("designFile", designFile);
  
  // Add thumbnail file if provided
  if (thumbnailFile) {
    formData.append("thumbnail", thumbnailFile);
    console.log("✅ Added thumbnail file:", thumbnailFile.name, thumbnailFile.size, "bytes");
  } else if (designData.thumbnail && designData.thumbnail.startsWith('data:image/')) {
    // Convert data URL to file
    try {
      const thumbnailBlob = dataURLtoBlob(designData.thumbnail);
      const thumbnailFile = new File([thumbnailBlob], "design-thumbnail.png", { 
        type: "image/png" 
      });
      formData.append("thumbnail", thumbnailFile);
      console.log("✅ Converted thumbnail to file:", thumbnailFile.name, thumbnailFile.size, "bytes");
    } catch (error) {
      console.error("❌ Failed to convert thumbnail to file:", error);
      // If conversion fails, thumbnail will be in customization.originalImage
    }
  }
  
  if (designData.tags && designData.tags.length > 0) {
    formData.append("tags", JSON.stringify(designData.tags));
  }

  // Log FormData contents for debugging
  console.log("🔍 FormData entries:");
  for (let [key, value] of (formData as any).entries()) {
    if (value instanceof File) {
      console.log(`  ${key}: File {name: ${value.name}, size: ${value.size}, type: ${value.type}}`);
    } else if (key === 'customization' || key === 'tags') {
      console.log(`  ${key}: ${value.substring(0, 100)}...`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }

  try {
    console.log("🚀 Sending request to /saved-designs...");
    const response = await api.post("/saved-designs", formData, {
      headers: { 
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000,
    });
    
    console.log("✅ Design saved successfully!");
    console.log("📦 Response:", {
      id: response.data._id,
      name: response.data.name,
      hasThumbnail: !!response.data.thumbnail,
      hasOriginalImage: !!response.data.customization?.originalImage
    });
    
    return response.data;
  } catch (error: any) {
    console.error("❌ ERROR SAVING DESIGN:");
    console.error("Error:", error);
    
    if (error.response) {
      console.error("Backend response:", {
        status: error.response.status,
        data: error.response.data
      });
    }
    
    throw error;
  }
};

// Helper function to convert data URL to Blob
function dataURLtoBlob(dataURL: string): Blob {
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
}

// Get all designs for current user
export const getMyDesigns = async (): Promise<SavedDesign[]> => {
  try {
    console.log("📦 Fetching saved designs...");
    const response = await api.get("/saved-designs");
    console.log(`✅ Retrieved ${response.data.length} designs`);
    return response.data;
  } catch (error) {
    console.error("Error fetching designs:", error);
    throw error;
  }
};

// Get single design by ID
export const getDesignById = async (id: string): Promise<SavedDesign> => {
  const response = await api.get(`/saved-designs/${id}`);
  return response.data;
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

// Helper to get thumbnail URL
export const getThumbnailUrl = (design: SavedDesign): string => {
  if (!design.thumbnail) return '';
  
  if (design.thumbnail.startsWith('data:') || design.thumbnail.startsWith('http')) {
    return design.thumbnail;
  }
  
  return design.thumbnail;
};

// Helper to get the original design image for recreation
export const getOriginalDesignImage = (design: SavedDesign): string | null => {
  return design.customization?.originalImage || design.thumbnail || null;
};