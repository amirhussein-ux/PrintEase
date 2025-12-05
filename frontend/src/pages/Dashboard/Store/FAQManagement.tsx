import React, { useState, useEffect } from "react";
import { 
  Plus, Edit, Trash2, Search, Filter, CheckCircle, 
  XCircle, ArrowUpDown, MessageSquare, Tag, 
  Eye, EyeOff, Copy, BarChart3, RefreshCw, 
  XCircle as XCircleIcon, Filter as FilterIcon,
} from "lucide-react";
import DashboardLayout from "../shared_components/DashboardLayout";
import api from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";

interface FAQ {
  _id: string;
  storeId: string;
  question: string;
  answer: string;
  keywords: string[];
  triggers: string[];
  category: string;
  order: number;
  isActive: boolean;
  usageCount: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

interface FAQStats {
  totalFAQs: number;
  activeFAQs: number;
  categories: string[];
}

const FAQManagement: React.FC = () => {
  const { user } = useAuth();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [stats, setStats] = useState<FAQStats>({ totalFAQs: 0, activeFAQs: 0, categories: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    keywords: "",
    triggers: "",
    category: "general",
    order: 0,
    isActive: true
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<"question" | "category" | "usageCount" | "createdAt">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // CSS Classes (same as before)
  const PANEL_SURFACE = "rounded-2xl border border-gray-200/80 dark:border-gray-600 bg-white/90 dark:bg-gray-800/60 backdrop-blur-sm shadow-sm dark:shadow-none";
  const INPUT_SURFACE = "rounded-xl border border-gray-300 dark:border-gray-600 bg-white/95 dark:bg-gray-800/80 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 hover:shadow-sm dark:hover:border-blue-400";
  const MUTED_TEXT = "text-gray-600 dark:text-gray-300";
  const MODAL_PANEL = "rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-white backdrop-blur-md";
  const MODAL_HEADER = "flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700";
  const MODAL_LABEL = "block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300";
  const MODAL_INPUT = "w-full rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-blue-300 hover:shadow-sm dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder-gray-400 dark:hover:border-blue-400";

  // Load store ID and FAQs
  useEffect(() => {
    const loadStore = async () => {
      try {
        const res = await api.get('/print-store/mine');
        if (res.data?._id) {
          setStoreId(res.data._id);
          loadFAQs(res.data._id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load store:', error);
        setLoading(false);
      }
    };
    loadStore();
  }, []);

  const loadFAQs = async (storeId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/faq/store/${storeId}`, {
        params: {
          category: selectedCategory === 'all' ? undefined : selectedCategory,
          activeOnly: showActiveOnly
        }
      });
      
      if (res.data.success) {
        setFaqs(res.data.faqs || []);
        setStats({
          totalFAQs: res.data.totalFAQs || 0,
          activeFAQs: res.data.activeFAQs || 0,
          categories: res.data.categories || []
        });
      } else {
        console.error('Failed to load FAQs:', res.data.message);
        setFaqs([]);
      }
    } catch (error: any) {
      console.error('Failed to load FAQs:', error);
      setFaqs([]);
      // Try fallback endpoint
      try {
        const fallbackRes = await api.get(`/faq?storeId=${storeId}`);
        setFaqs(fallbackRes.data || []);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      loadFAQs(storeId);
    }
  }, [storeId, selectedCategory, showActiveOnly]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    if (formError) setFormError(null);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      question: "",
      answer: "",
      keywords: "",
      triggers: "",
      category: "general",
      order: 0,
      isActive: true
    });
    setFormError(null);
  };

  // Add new FAQ
  const handleAddFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) {
      setFormError('Store ID is missing');
      return;
    }
    
    // Validation
    if (!formData.question.trim()) {
      setFormError('Question is required');
      return;
    }
    if (!formData.answer.trim()) {
      setFormError('Answer is required');
      return;
    }
    
    setSaving(true);
    setFormError(null);
    
    try {
      await api.post('/faq', {
        storeId,
        question: formData.question,
        answer: formData.answer,
        keywords: formData.keywords,
        triggers: formData.triggers,
        category: formData.category,
        order: parseInt(formData.order.toString()) || 0,
        isActive: formData.isActive
      });
      
      setShowAddModal(false);
      resetForm();
      loadFAQs(storeId);
    } catch (error: any) {
      console.error('Failed to add FAQ:', error);
      setFormError(error.response?.data?.message || 'Failed to add FAQ. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Edit FAQ
  const handleEditFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFAQ || !storeId) return;
    
    setSaving(true);
    setFormError(null);
    
    try {
      await api.put(`/faq/${selectedFAQ._id}`, {
        question: formData.question,
        answer: formData.answer,
        keywords: formData.keywords,
        triggers: formData.triggers,
        category: formData.category,
        order: parseInt(formData.order.toString()) || 0,
        isActive: formData.isActive
      });
      
      setShowEditModal(false);
      setSelectedFAQ(null);
      resetForm();
      loadFAQs(storeId);
    } catch (error: any) {
      console.error('Failed to edit FAQ:', error);
      setFormError(error.response?.data?.message || 'Failed to edit FAQ. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Delete FAQ
  const handleDeleteFAQ = async () => {
    if (!selectedFAQ || !storeId) return;
    
    try {
      await api.delete(`/faq/${selectedFAQ._id}`);
      setShowDeleteModal(false);
      setSelectedFAQ(null);
      loadFAQs(storeId);
    } catch (error: any) {
      console.error('Failed to delete FAQ:', error);
      alert(error.response?.data?.message || 'Failed to delete FAQ. Please try again.');
    }
  };

  // Toggle FAQ active status
  const toggleFAQActive = async (faq: FAQ) => {
    try {
      await api.patch(`/faq/${faq._id}/toggle`);
      loadFAQs(storeId!);
    } catch (error: any) {
      console.error('Failed to toggle FAQ:', error);
      alert(error.response?.data?.message || 'Failed to toggle FAQ status.');
    }
  };

  // Prepare for editing
  const prepareEdit = (faq: FAQ) => {
    setSelectedFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      keywords: faq.keywords.join(', '),
      triggers: faq.triggers.join(', '),
      category: faq.category,
      order: faq.order,
      isActive: faq.isActive
    });
    setShowEditModal(true);
  };

  // Prepare for deletion
  const prepareDelete = (faq: FAQ) => {
    setSelectedFAQ(faq);
    setShowDeleteModal(true);
  };

  // Duplicate FAQ
  const duplicateFAQ = async (faq: FAQ) => {
    if (!storeId) return;
    
    try {
      await api.post('/faq', {
        storeId,
        question: faq.question + " (Copy)",
        answer: faq.answer,
        keywords: faq.keywords,
        triggers: faq.triggers,
        category: faq.category,
        order: faq.order + 1,
        isActive: false // Start as inactive
      });
      loadFAQs(storeId);
    } catch (error) {
      console.error('Failed to duplicate FAQ:', error);
    }
  };

  // Filter and sort FAQs
  const filteredFAQs = faqs
    .filter(faq => {
      const matchesSearch = searchQuery === "" || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.keywords.some(keyword => 
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        );
      
      const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
      const matchesActive = !showActiveOnly || faq.isActive;
      
      return matchesSearch && matchesCategory && matchesActive;
    })
    .sort((a, b) => {
      if (sortKey === "question") {
        const cmp = a.question.localeCompare(b.question);
        return sortDir === "asc" ? cmp : -cmp;
      } else if (sortKey === "category") {
        const cmp = a.category.localeCompare(b.category);
        return sortDir === "asc" ? cmp : -cmp;
      } else if (sortKey === "usageCount") {
        const cmp = (a.usageCount || 0) - (b.usageCount || 0);
        return sortDir === "asc" ? cmp : -cmp;
      } else {
        // createdAt
        const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortDir === "asc" ? cmp : -cmp;
      }
    });

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      order: { 
        bg: "bg-blue-50 border-blue-200 group-hover:bg-blue-100 dark:bg-blue-500/10 dark:border-blue-500/30", 
        text: "text-blue-700 dark:text-blue-300" 
      },
      payment: { 
        bg: "bg-green-50 border-green-200 group-hover:bg-green-100 dark:bg-green-500/10 dark:border-green-500/30", 
        text: "text-green-700 dark:text-green-300" 
      },
      delivery: { 
        bg: "bg-purple-50 border-purple-200 group-hover:bg-purple-100 dark:bg-purple-500/10 dark:border-purple-500/30", 
        text: "text-purple-700 dark:text-purple-300" 
      },
      design: { 
        bg: "bg-pink-50 border-pink-200 group-hover:bg-pink-100 dark:bg-pink-500/10 dark:border-pink-500/30", 
        text: "text-pink-700 dark:text-pink-300" 
      },
      cancellation: { 
        bg: "bg-red-50 border-red-200 group-hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/30", 
        text: "text-red-700 dark:text-red-300" 
      },
      refund: { 
        bg: "bg-orange-50 border-orange-200 group-hover:bg-orange-100 dark:bg-orange-500/10 dark:border-orange-500/30", 
        text: "text-orange-700 dark:text-orange-300" 
      },
      general: { 
        bg: "bg-gray-50 border-gray-200 group-hover:bg-gray-100 dark:bg-gray-500/10 dark:border-gray-500/30", 
        text: "text-gray-700 dark:text-gray-300" 
      }
    };
    return colors[category] || colors.general;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format keywords/triggers for display
  const formatList = (items: string[], maxDisplay: number = 3) => {
    if (items.length === 0) return "None";
    if (items.length <= maxDisplay) return items.join(", ");
    return `${items.slice(0, maxDisplay).join(", ")} +${items.length - maxDisplay}`;
  };

  if (loading && faqs.length === 0) {
    return (
      <DashboardLayout role="owner">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="owner">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            FAQ Management
          </h1>
          <p className={`text-lg mt-2 ${MUTED_TEXT}`}>Manage automated responses for customer inquiries</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className={`${PANEL_SURFACE} p-6 transition-transform duration-200 hover:scale-[1.02]`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total FAQs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.totalFAQs}
                </p>
              </div>
              <MessageSquare className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className={`${PANEL_SURFACE} p-6 transition-transform duration-200 hover:scale-[1.02]`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active FAQs</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {stats.activeFAQs}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className={`${PANEL_SURFACE} p-6 transition-transform duration-200 hover:scale-[1.02]`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {stats.categories.length}
                </p>
              </div>
              <Tag className="w-10 h-10 text-purple-500" />
            </div>
          </div>

          <div className={`${PANEL_SURFACE} p-6 transition-transform duration-200 hover:scale-[1.02]`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Most Used</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400 mt-2 truncate">
                  {faqs.length > 0 
                    ? faqs.reduce((a, b) => (a.usageCount || 0) > (b.usageCount || 0) ? a : b).question
                    : "No data"}
                </p>
              </div>
              <BarChart3 className="w-10 h-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className={`${PANEL_SURFACE} p-6 mb-6`}>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            {/* Search */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300" />
                  <input
                    type="text"
                    placeholder="Search FAQs by question, answer, or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 ${INPUT_SURFACE}`}
                  />
                </div>

                {/* Filters Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilters((v) => !v)}
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-xl border border-gray-200 transition-transform duration-200 hover:bg-gray-50 hover:border-gray-300 hover:scale-105 active:scale-95 dark:bg-gray-700/80 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600/80 dark:hover:border-gray-500`}
                    aria-haspopup="true"
                    aria-expanded={showFilters}
                  >
                    <FilterIcon className="h-5 w-5" /> 
                    <span>Filter & Sort</span>
                  </button>

                  {showFilters && (
                    <div className="absolute right-0 top-full mt-3 w-80 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800/95 backdrop-blur-lg p-4 z-20 shadow-2xl animate-fadeIn">
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">Filters & Sort</div>
                        <button
                          className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 transition-transform duration-200 hover:bg-gray-100 hover:scale-105 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
                          onClick={() => setShowFilters(false)}
                        >
                          Close
                        </button>
                      </div>
                      
                      {/* Category Filter */}
                      <div className="mb-6">
                        <div className={`text-sm font-medium mb-3 ${MUTED_TEXT}`}>Category</div>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className={`w-full ${INPUT_SURFACE}`}
                        >
                          <option value="all">All Categories</option>
                          {stats.categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Active Filter */}
                      <div className="mb-6">
                        <div className={`text-sm font-medium mb-3 ${MUTED_TEXT}`}>Status</div>
                        <button
                          onClick={() => setShowActiveOnly(!showActiveOnly)}
                          className={`w-full px-4 py-3 rounded-xl border flex items-center justify-center gap-2 transition-transform duration-200 hover:scale-105 ${
                            showActiveOnly
                              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30'
                              : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {showActiveOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          {showActiveOnly ? 'Active Only' : 'Show All'}
                        </button>
                      </div>

                      {/* Sort Options */}
                      <div className="mb-6">
                        <div className={`text-sm font-medium mb-3 ${MUTED_TEXT}`}>Sort by</div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              setSortKey("createdAt");
                              setSortDir("desc");
                            }}
                            className={`text-sm px-4 py-3 rounded-xl border transition-transform duration-200 hover:scale-105 ${
                              sortKey === "createdAt" && sortDir === "desc"
                                ? "border-blue-500 text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-500/20 scale-105"
                                : "border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            Newest
                          </button>
                          <button
                            onClick={() => {
                              setSortKey("createdAt");
                              setSortDir("asc");
                            }}
                            className={`text-sm px-4 py-3 rounded-xl border transition-transform duration-200 hover:scale-105 ${
                              sortKey === "createdAt" && sortDir === "asc"
                                ? "border-blue-500 text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-500/20 scale-105"
                                : "border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            Oldest
                          </button>
                          <button
                            onClick={() => {
                              setSortKey("question");
                              setSortDir("asc");
                            }}
                            className={`text-sm px-4 py-3 rounded-xl border transition-transform duration-200 hover:scale-105 ${
                              sortKey === "question" && sortDir === "asc"
                                ? "border-blue-500 text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-500/20 scale-105"
                                : "border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            Name A-Z
                          </button>
                          <button
                            onClick={() => {
                              setSortKey("usageCount");
                              setSortDir("desc");
                            }}
                            className={`text-sm px-4 py-3 rounded-xl border transition-transform duration-200 hover:scale-105 ${
                              sortKey === "usageCount" && sortDir === "desc"
                                ? "border-blue-500 text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-500/20 scale-105"
                                : "border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            Most Used
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 transition-transform duration-200 hover:bg-gray-100 hover:scale-105 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
                          onClick={() => {
                            setSelectedCategory("all");
                            setShowActiveOnly(true);
                            setSortKey("createdAt");
                            setSortDir("desc");
                          }}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add FAQ Button */}
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl border border-blue-500 transition-transform duration-200 hover:from-blue-600 hover:to-blue-700 hover:scale-105 active:scale-95 shadow-lg hover:shadow-blue-500/25 flex items-center gap-2 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
              Add FAQ
            </button>
          </div>
        </div>

        {/* FAQ List */}
        {filteredFAQs.length === 0 ? (
          <div className={`${PANEL_SURFACE} p-12 text-center`}>
            <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No FAQs Found
            </h3>
            <p className={`${MUTED_TEXT} mb-6`}>
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Start by adding your first FAQ'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl border border-blue-500 transition-transform duration-200 hover:from-blue-600 hover:to-blue-700 hover:scale-105"
              >
                Create Your First FAQ
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredFAQs.map((faq) => {
              const categoryColor = getCategoryColor(faq.category);
              return (
                <div
                  key={faq._id}
                  className={`${PANEL_SURFACE} p-6 transition-transform duration-200 hover:scale-[1.05] hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 group`}
                >
                  <div className="flex-1">
                    {/* Question & Status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-200">
                          {faq.question}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${categoryColor.bg} ${categoryColor.text}`}>
                            {faq.category.charAt(0).toUpperCase() + faq.category.slice(1)}
                          </span>
                          <button
                            onClick={() => toggleFAQActive(faq)}
                            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-transform duration-200 hover:scale-110 ${
                              faq.isActive
                                ? 'bg-green-50 text-green-700 border border-green-200 group-hover:bg-green-100 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30'
                                : 'bg-red-50 text-red-700 border border-red-200 group-hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30'
                            }`}
                          >
                            {faq.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                Inactive
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Answer Preview */}
                    <p className={`${MUTED_TEXT} text-sm mb-4 line-clamp-3 group-hover:text-gray-800 dark:group-hover:text-gray-200`}>
                      {faq.answer}
                    </p>

                    {/* Keywords & Triggers */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className={`text-xs mb-1 font-medium ${MUTED_TEXT}`}>Keywords:</div>
                        <div className="text-sm text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-200">
                          {formatList(faq.keywords)}
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs mb-1 font-medium ${MUTED_TEXT}`}>Triggers:</div>
                        <div className="text-sm text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-200">
                          {formatList(faq.triggers)}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm mb-6">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700 dark:text-gray-300">
                          Used <span className="font-semibold">{faq.usageCount || 0}</span> times
                        </span>
                      </div>
                      <div className="text-gray-500 dark:text-gray-400">
                        {formatDate(faq.lastUsed)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => prepareEdit(faq)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-4 py-3 text-sm font-medium transition-transform duration-200 hover:scale-105 active:scale-95 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30 dark:hover:bg-blue-500/20"
                      >
                        <Edit className="w-4 h-4" /> Edit
                      </button>
                      <button
                        onClick={() => duplicateFAQ(faq)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 px-4 py-3 text-sm font-medium transition-transform duration-200 hover:scale-105 active:scale-95 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30 dark:hover:bg-purple-500/20"
                      >
                        <Copy className="w-4 h-4" /> Duplicate
                      </button>
                      <button
                        onClick={() => prepareDelete(faq)}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-4 py-3 text-sm font-medium transition-transform duration-200 hover:scale-105 active:scale-95 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30 dark:hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add FAQ Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
            <div className={`${MODAL_PANEL} w-full max-w-2xl max-h-[90vh] overflow-hidden transition-all duration-200 hover:scale-[1.01]`}>
              <div className={`${MODAL_HEADER}`}>
                <div>
                  <h2 className="text-xl font-semibold">Add New FAQ</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Create an automated response for customer inquiries
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 transform hover:scale-110 hover:rotate-90 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddFAQ}>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  <div className="space-y-6">
                    {/* Question */}
                    <div>
                      <label className={MODAL_LABEL}>Question *</label>
                      <input
                        type="text"
                        name="question"
                        value={formData.question}
                        onChange={handleInputChange}
                        placeholder="How to cancel my order?"
                        required
                        className={`${MODAL_INPUT} transition-all duration-200 hover:scale-[1.01]`}
                      />
                    </div>

                    {/* Answer */}
                    <div>
                      <label className={MODAL_LABEL}>Answer *</label>
                      <textarea
                        name="answer"
                        value={formData.answer}
                        onChange={handleInputChange}
                        placeholder="You can cancel your order within 24 hours of placement..."
                        rows={4}
                        required
                        className={`${MODAL_INPUT} resize-none transition-all duration-200 hover:scale-[1.01]`}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Category */}
                      <div>
                        <label className={MODAL_LABEL}>Category</label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className={`${MODAL_INPUT} transition-all duration-200 hover:scale-[1.01]`}
                        >
                          <option value="general">General</option>
                          <option value="order">Order</option>
                          <option value="payment">Payment</option>
                          <option value="delivery">Delivery</option>
                          <option value="design">Design</option>
                          <option value="cancellation">Cancellation</option>
                          <option value="refund">Refund</option>
                        </select>
                      </div>

                      {/* Order */}
                      <div>
                        <label className={MODAL_LABEL}>Display Order</label>
                        <input
                          type="number"
                          name="order"
                          value={formData.order}
                          onChange={handleInputChange}
                          min="0"
                          className={`${MODAL_INPUT} transition-all duration-200 hover:scale-[1.01]`}
                        />
                      </div>
                    </div>

                    {/* Keywords */}
                    <div>
                      <label className={MODAL_LABEL}>
                        Keywords (comma separated)
                        <span className="text-xs text-gray-500 ml-2">e.g., cancel, cancellation, refund</span>
                      </label>
                      <input
                        type="text"
                        name="keywords"
                        value={formData.keywords}
                        onChange={handleInputChange}
                        placeholder="cancel, cancellation, refund, order cancellation"
                        className={`${MODAL_INPUT} transition-all duration-200 hover:scale-[1.01]`}
                      />
                    </div>

                    {/* Triggers */}
                    <div>
                      <label className={MODAL_LABEL}>
                        Exact Triggers (comma separated)
                        <span className="text-xs text-gray-500 ml-2">Exact phrases that trigger this response</span>
                      </label>
                      <input
                        type="text"
                        name="triggers"
                        value={formData.triggers}
                        onChange={handleInputChange}
                        placeholder="how to cancel, cancel order, order cancellation"
                        className={`${MODAL_INPUT} transition-all duration-200 hover:scale-[1.01]`}
                      />
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        id="isActive"
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600"
                      />
                      <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Active (will be used for auto-replies)
                      </label>
                    </div>

                    {/* Form Error */}
                    {formError && (
                      <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-300">{formError}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Adding...
                      </>
                    ) : (
                      'Add FAQ'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit FAQ Modal */}
        {showEditModal && selectedFAQ && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
            <div className={`${MODAL_PANEL} w-full max-w-2xl max-h-[90vh] overflow-hidden transition-all duration-200 hover:scale-[1.01]`}>
              <div className={`${MODAL_HEADER}`}>
                <div>
                  <h2 className="text-xl font-semibold">Edit FAQ</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Update automated response
                  </p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 transform hover:scale-110 hover:rotate-90 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleEditFAQ}>
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  <div className="space-y-6">
                    {/* Question */}
                    <div>
                      <label className={MODAL_LABEL}>Question *</label>
                      <input
                        type="text"
                        name="question"
                        value={formData.question}
                        onChange={handleInputChange}
                        placeholder="How to cancel my order?"
                        required
                        className={`${MODAL_INPUT} transition-all duration-200 hover:scale-[1.01]`}
                      />
                    </div>

                    {/* Answer */}
                    <div>
                      <label className={MODAL_LABEL}>Answer *</label>
                      <textarea
                        name="answer"
                        value={formData.answer}
                        onChange={handleInputChange}
                        placeholder="You can cancel your order within 24 hours of placement..."
                        rows={4}
                        required
                        className={`${MODAL_INPUT} resize-none transition-all duration-200 hover:scale-[1.01]`}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Category */}
                      <div>
                        <label className={MODAL_LABEL}>Category</label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className={`${MODAL_INPUT} transition-all duration-200 hover:scale-[1.01]`}
                        >
                          <option value="general">General</option>
                          <option value="order">Order</option>
                          <option value="payment">Payment</option>
                          <option value="delivery">Delivery</option>
                          <option value="design">Design</option>
                          <option value="cancellation">Cancellation</option>
                          <option value="refund">Refund</option>
                        </select>
                      </div>

                      {/* Order */}
                      <div>
                        <label className={MODAL_LABEL}>Display Order</label>
                        <input
                          type="number"
                          name="order"
                          value={formData.order}
                          onChange={handleInputChange}
                          min="0"
                          className={`${MODAL_INPUT} transition-all duration-200 hover:scale-[1.01]`}
                        />
                      </div>
                    </div>

                    {/* Keywords */}
                    <div>
                      <label className={MODAL_LABEL}>
                        Keywords (comma separated)
                        <span className="text-xs text-gray-500 ml-2">e.g., cancel, cancellation, refund</span>
                      </label>
                      <input
                        type="text"
                        name="keywords"
                        value={formData.keywords}
                        onChange={handleInputChange}
                        placeholder="cancel, cancellation, refund, order cancellation"
                        className={`${MODAL_INPUT} transition-all duration-200 hover:scale-[1.01]`}
                      />
                    </div>

                    {/* Triggers */}
                    <div>
                      <label className={MODAL_LABEL}>
                        Exact Triggers (comma separated)
                        <span className="text-xs text-gray-500 ml-2">Exact phrases that trigger this response</span>
                      </label>
                      <input
                        type="text"
                        name="triggers"
                        value={formData.triggers}
                        onChange={handleInputChange}
                        placeholder="how to cancel, cancel order, order cancellation"
                        className={`${MODAL_INPUT} transition-all duration-200 hover:scale-[1.01]`}
                      />
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        id="isActiveEdit"
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600"
                      />
                      <label htmlFor="isActiveEdit" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Active (will be used for auto-replies)
                      </label>
                    </div>

                    {/* Form Error */}
                    {formError && (
                      <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-300">{formError}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 font-semibold transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : (
                      'Update FAQ'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedFAQ && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${MODAL_PANEL} w-full max-w-md overflow-hidden transition-all duration-200 hover:scale-[1.02]`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delete FAQ</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Are you sure you want to delete the FAQ: 
                  <span className="font-semibold text-gray-900 dark:text-white ml-1">
                    "{selectedFAQ.question}"
                  </span>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This FAQ has been used <span className="font-semibold">{selectedFAQ.usageCount || 0}</span> times.
                </p>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-200 hover:scale-105 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteFAQ}
                  className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-500 font-semibold transition-all duration-200 hover:scale-105"
                >
                  Delete FAQ
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from {opacity: 0} to {opacity:1} }
          .animate-fadeIn { animation: fadeIn 0.2s ease forwards; }
        `}</style>
      </div>
    </DashboardLayout>
  );
};

export default FAQManagement;