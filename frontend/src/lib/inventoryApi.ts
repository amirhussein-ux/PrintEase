import api from './api';

// Types for stock information
export interface ServiceStockInfo {
  serviceId: string;
  serviceName: string;
  hasStockLimit: boolean;
  availableStock: number | null;
  maxAllowedQuantity: number;
  inventoryItemId: string | null;
  inventoryItemName: string | null;
  inventoryPerUnit: number;
}

export interface StockCheckRequest {
  storeId: string;
  serviceId: string;
  quantity: number;
  selectedOptions?: Array<{
    label: string;
    optionIndex: number;
  }>;
}

export interface StockCheckResponse {
  success: boolean;
  canFulfill: boolean;
  serviceId: string;
  serviceName: string;
  requestedQuantity: number;
  requiredInventoryQuantity: number;
  availableStock: number | null;
  stockItemName: string | null;
  hasStockLimit: boolean;
  maxAllowedQuantity: number | null;
  inventoryPerUnit: number;
  variantStockIssues?: Array<{
    variant: string;
    option: string;
    required: number;
    available: number;
    stockItemName: string;
  }>;
  message: string;
}

// Get stock information for all services in a store
export const getServiceStockInfo = async (storeId: string): Promise<{
  success: boolean;
  storeId: string;
  stockInfo: ServiceStockInfo[];
}> => {
  try {
    const response = await api.get(`/orders/store/${storeId}/stock-info`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching service stock info:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch stock information');
  }
};

// Get stock information for services from inventory endpoint
export const getInventoryStockForServices = async (storeId: string, serviceIds?: string[]): Promise<{
  success: boolean;
  storeId: string;
  stockInfo: Array<{
    serviceId: string;
    serviceName: string;
    availableStock: number | null;
    stockItemName: string | null;
    stockItemId: string | null;
    hasStockLimit: boolean;
    variantStockInfo?: Array<{
      variantLabel: string;
      optionName: string;
      availableStock: number;
      stockItemName: string;
      stockItemId: string;
    }>;
    inventoryQuantityPerUnit: number;
  }>;
}> => {
  try {
    const params: any = {};
    if (serviceIds && serviceIds.length > 0) {
      params.serviceIds = serviceIds.join(',');
    }
    
    const response = await api.get(`/inventory/store/${storeId}/stock-for-services`, { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching inventory stock for services:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch inventory stock');
  }
};

// Check stock availability before ordering
export const checkStockAvailability = async (data: StockCheckRequest): Promise<StockCheckResponse> => {
  try {
    const response = await api.post('/inventory/check-stock-availability', data);
    return response.data;
  } catch (error: any) {
    console.error('Error checking stock availability:', error);
    throw new Error(error.response?.data?.message || 'Failed to check stock availability');
  }
};

// Get current stock for a specific inventory item
export const getInventoryItemStock = async (storeId: string, itemId: string): Promise<{
  success: boolean;
  item: {
    _id: string;
    name: string;
    amount: number;
    minAmount: number;
    price: number;
    currency: string;
    category?: string;
  };
}> => {
  try {
    const response = await api.get(`/inventory/store/${storeId}`);
    const items = response.data;
    const item = items.find((item: any) => item._id === itemId);
    
    if (!item) {
      throw new Error('Inventory item not found');
    }
    
    return {
      success: true,
      item
    };
  } catch (error: any) {
    console.error('Error fetching inventory item stock:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch inventory item stock');
  }
};

// Export a utility to get stock for a specific service
export const getStockForService = async (storeId: string, serviceId: string): Promise<ServiceStockInfo | null> => {
  try {
    const stockInfo = await getServiceStockInfo(storeId);
    const serviceStock = stockInfo.stockInfo.find(item => item.serviceId === serviceId);
    return serviceStock || null;
  } catch (error) {
    console.error('Error getting stock for service:', error);
    return null;
  }
};

// Check if a service has stock limit
export const serviceHasStockLimit = async (storeId: string, serviceId: string): Promise<boolean> => {
  try {
    const stockInfo = await getStockForService(storeId, serviceId);
    return stockInfo ? stockInfo.hasStockLimit : false;
  } catch (error) {
    console.error('Error checking if service has stock limit:', error);
    return false;
  }
};

// Get maximum allowed quantity for a service
export const getMaxAllowedQuantity = async (storeId: string, serviceId: string): Promise<number> => {
  try {
    const stockInfo = await getStockForService(storeId, serviceId);
    if (stockInfo && stockInfo.hasStockLimit) {
      return Math.max(0, stockInfo.maxAllowedQuantity);
    }
    return 9999; // Default high value for unlimited
  } catch (error) {
    console.error('Error getting max allowed quantity:', error);
    return 9999;
  }
};

export default {
  getServiceStockInfo,
  getInventoryStockForServices,
  checkStockAvailability,
  getInventoryItemStock,
  getStockForService,
  serviceHasStockLimit,
  getMaxAllowedQuantity,
};