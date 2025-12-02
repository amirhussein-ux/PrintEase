import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CiLocationArrow1, 
  CiSearch, 
  CiStar 
} from "react-icons/ci";
import { 
  AiFillStar, 
  AiOutlineStar, 
  AiOutlineCamera, 
  AiOutlineCloseCircle,
  AiOutlineClockCircle,
  AiOutlinePhone
} from 'react-icons/ai';
import { 
  BsShop, 
  BsMap, 
  BsCheckCircleFill,
  BsArrowRight
} from 'react-icons/bs';
import { 
  FiNavigation, 
  FiMapPin,
  FiUsers
} from 'react-icons/fi';
import { 
  MdLocationOn, 
  MdOutlineRateReview,
  MdImage
} from 'react-icons/md';
import { 
  XMarkIcon,
  MapPinIcon,
  ClockIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import PrintEaseLogo from '../../../assets/PrintEase-Logo.png';
import PrintEaseLogoMobile from '../../../assets/PrintEase-logo1.png';
import api from '../../../lib/api';
import { isAxiosError } from 'axios';
import { useAuth } from "../../../context/AuthContext";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type PrintStore = {
  _id: string;
  name: string;
  tin?: string;
  mobile?: string;
  logoFileId?: unknown;
  address?: {
    addressLine?: string;
    city?: string;
    state?: string;
    country?: string;
    postal?: string;
    location?: { lat: number; lng: number };
  };
  createdAt?: string;
};

type Review = {
  _id: string;
  user: { firstName?: string; lastName?: string; _id?: string } | string;
  rating: number;
  comment?: string;
  imageFileId?: unknown;
  images?: Array<{ fileId: unknown; mime?: string | null; filename?: string | null }>;
  createdAt: string;
};

function isError(e: unknown): e is Error {
  return e instanceof Error;
}

function getReviewUserId(u: Review['user']): string | undefined {
  if (typeof u === 'string') return u;
  if (u && typeof u === 'object' && '_id' in u) {
    const id = (u as { _id?: unknown })._id;
    return typeof id === 'string' ? id : undefined;
  }
  return undefined;
}

export default function SelectShop() {
  const [stores, setStores] = useState<PrintStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [shouldPanToUser, setShouldPanToUser] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedStore, setSelectedStore] = useState<PrintStore | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [myRating, setMyRating] = useState<number>(0);
  const [myComment, setMyComment] = useState<string>('');
  const [initialRating, setInitialRating] = useState<number>(0);
  const [initialComment, setInitialComment] = useState<string>('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [closeTarget, setCloseTarget] = useState<'mobile' | 'desktop' | null>(null);
  const [myImages, setMyImages] = useState<Array<{ file: File; preview: string }>>([]);
  const navigate = useNavigate();
  const [selectionNonce, setSelectionNonce] = useState<number>(0);
  const mapRef = useRef<L.Map | null>(null);
  const { user } = useAuth();

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  // Image handling
  const removeImageAt = (idx: number) => {
    setMyImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      if (removed?.preview) {
        try { URL.revokeObjectURL(removed.preview); } catch { /* noop */ }
      }
      return next;
    });
  };

  const clearAllImages = () => {
    setMyImages((prev) => {
      for (const it of prev) {
        try { URL.revokeObjectURL(it.preview); } catch { /* noop */ }
      }
      return [];
    });
  };

  const pickImages = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/jpg,image/webp';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      setMyImages((prev) => {
        const remainingSlots = Math.max(0, 5 - prev.length);
        const selected = files
          .filter((f) => /image\/(png|jpe?g|webp)/i.test(f.type) && f.size <= 5 * 1024 * 1024)
          .slice(0, remainingSlots)
          .map((file) => ({ file, preview: URL.createObjectURL(file) }));
        return [...prev, ...selected];
      });
    };
    input.click();
  };

  // Unsaved changes guard
  const isDirty = myImages.length > 0 || myRating !== initialRating || (myComment.trim() || '') !== (initialComment.trim() || '');
  const requestClose = (which: 'mobile' | 'desktop') => {
    if (isDirty) {
      setCloseTarget(which);
      setShowDiscardConfirm(true);
    } else {
      if (which === 'mobile') setSelectedStore(null);
      if (which === 'desktop') setShowDetails(false);
    }
  };
  const confirmDiscard = () => {
    setMyRating(initialRating);
    setMyComment(initialComment);
    clearAllImages();
    if (closeTarget === 'mobile') setSelectedStore(null);
    if (closeTarget === 'desktop') setShowDetails(false);
    setShowDiscardConfirm(false);
    setCloseTarget(null);
  };
  const cancelDiscard = () => { setShowDiscardConfirm(false); setCloseTarget(null); };

  const userId = useMemo(() => user?._id, [user]);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true);
        const res = await api.get('/print-store/list');
        setStores(res.data || []);
      } catch (err: unknown) {
        let msg = 'Failed to load print stores';
        if (err instanceof Error) msg = err.message;
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, []);

  useEffect(() => {
    const load = async (storeId: string) => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const res = await api.get(`/reviews/store/${storeId}`);
        const { reviews, averageRating, count } = res.data || {};
        setReviews(reviews || []);
        setAvgRating(averageRating || 0);
        setReviewCount(count || 0);
        if (userId) {
          const mine = (reviews || []).find((r: Review) => getReviewUserId(r.user) === userId);
          setMyRating(mine?.rating || 0);
          setMyComment(mine?.comment || '');
          setInitialRating(mine?.rating || 0);
          setInitialComment(mine?.comment || '');
        } else {
          setMyRating(0);
          setMyComment('');
          setInitialRating(0);
          setInitialComment('');
        }
        clearAllImages();
      } catch (e: unknown) {
        if (isAxiosError(e)) {
          setReviewsError(e.response?.data?.message ?? e.message);
        } else if (isError(e)) {
          setReviewsError(e.message);
        } else {
          setReviewsError('Failed to load reviews');
        }
      } finally {
        setReviewsLoading(false);
      }
    };
    if (showDetails && selectedStore?._id) {
      load(selectedStore._id);
    }
  }, [showDetails, selectedStore?._id, userId]);

  useEffect(() => {
    const update = () => setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const filteredStores: PrintStore[] = stores.filter((store) => {
    if (!search) return true;
    const q = search.toLowerCase();
    if (store.name.toLowerCase().includes(q)) return true;
    const parts = [
      store.address?.addressLine,
      store.address?.city,
      store.address?.state,
      store.address?.country,
      store.address?.postal,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return parts.includes(q);
  });

  function getStoreDistanceKm(s: PrintStore) {
    if (!userLocation || !s.address?.location) return Infinity;
    return distanceKm(
      userLocation.lat,
      userLocation.lng,
      s.address.location.lat,
      s.address.location.lng
    );
  }

  function handleLocateClick() {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }
    setError(null);
    setLocating(true);
    setSelectedStore(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        setShouldPanToUser(true);
        setLocating(false);
      },
      () => {
        setError('Unable to get your location');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function MapAutoPan({
    userLocation,
    shouldPanToUser,
    setShouldPanToUser,
    selectedStore,
    selectionNonce,
  }: {
    userLocation: { lat: number; lng: number } | null;
    shouldPanToUser: boolean;
    setShouldPanToUser: (v: boolean) => void;
    selectedStore: PrintStore | null;
    selectionNonce?: number;
  }) {
    const map = useMap();

    useEffect(() => {
      if (!map) return;

      if (shouldPanToUser && userLocation) {
        map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 13));
        setShouldPanToUser(false);
        return;
      }

      if (userLocation && selectedStore?.address?.location) {
        const a = L.latLng(userLocation.lat, userLocation.lng);
        const b = L.latLng(selectedStore.address.location.lat, selectedStore.address.location.lng);
        const bounds = L.latLngBounds([a, b]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        return;
      }

      if (selectedStore?.address?.location) {
        const loc = selectedStore.address.location;
        map.flyTo([loc.lat, loc.lng], Math.max(map.getZoom(), 14));
      }
    }, [map, userLocation, shouldPanToUser, setShouldPanToUser, selectedStore, selectionNonce]);

    return null;
  }

  function MapRefSetter() {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
      return () => {
        if (mapRef.current === map) mapRef.current = null;
      };
    }, [map]);
    return null;
  }

  const userIcon = L.divIcon({
    className: '',
    html: `
      <div class="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 border-2 border-white shadow-2xl shadow-blue-500/30">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="white"/>
          <path d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20V22H4V20Z" fill="white"/>
        </svg>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 48],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-black text-white">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-700 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-800 rounded-full opacity-20 blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-lg shadow-sm border-b border-gray-100">
        <div className="max-w-8xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link to="/" className="flex items-center gap-3 group" aria-label="Go to landing page">
              <img 
                alt="PrintEase" 
                src={PrintEaseLogo} 
                className="h-10 w-auto transition-transform group-hover:scale-105" 
              />
              <div className="hidden lg:block">
                <h1 className="text-lg font-bold text-gray-900">Print Shop Selection</h1>
                <p className="text-xs text-gray-500">Find the perfect print shop near you</p>
              </div>
            </Link>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-3"
          >
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
              <FiUsers className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">
                {stores.length} {stores.length === 1 ? 'Shop' : 'Shops'} Available
              </span>
            </div>
            {user && (
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  {user.firstName?.[0] || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.firstName || 'User'}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="max-w-8xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Find Your <span className="text-blue-400">Perfect Print Shop</span>
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Browse and select from our network of trusted local print shops. 
              Check reviews, view locations, and choose the best fit for your needs.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Panel - Shop List */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="lg:col-span-2 space-y-6"
            >
              {/* Search and Filters */}
              <motion.div
                variants={fadeInUp}
                className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6"
              >
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <CiSearch className="h-5 w-5 text-blue-300" />
                    </div>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by shop name, address, or city..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-blue-200 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                    />
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLocateClick}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-500 transition-colors border border-blue-500"
                  >
                    {locating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Locating...</span>
                      </>
                    ) : (
                      <>
                        <CiLocationArrow1 className="h-5 w-5" />
                        <span>Use My Location</span>
                      </>
                    )}
                  </motion.button>
                </div>
                
                {userLocation && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 flex items-center gap-2 text-sm text-blue-300 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-400/20"
                  >
                    <FiMapPin className="h-4 w-4" />
                    <span>Showing shops near your location</span>
                  </motion.div>
                )}
              </motion.div>

              {/* Shop Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <motion.div
                      key={i}
                      variants={fadeInUp}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 animate-pulse"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl bg-white/10" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-white/10 rounded w-3/4" />
                            <div className="h-3 bg-white/10 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : error ? (
                  <motion.div
                    variants={fadeInUp}
                    className="col-span-2 bg-red-500/20 border border-red-400/30 rounded-2xl p-6 text-center backdrop-blur-sm"
                  >
                    <p className="text-red-200 font-medium">{error}</p>
                  </motion.div>
                ) : filteredStores.length === 0 ? (
                  <motion.div
                    variants={fadeInUp}
                    className="col-span-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center"
                  >
                    <BsShop className="h-12 w-12 text-blue-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No shops found</h3>
                    <p className="text-blue-200">Try adjusting your search or location</p>
                  </motion.div>
                ) : (
                  filteredStores.map((store, index) => (
                    <motion.div
                      key={store._id}
                      variants={fadeInUp}
                      whileHover={{ y: -5, scale: 1.02 }}
                      onClick={() => {
                        setSelectedStore(store);
                        setSelectionNonce(n => n + 1);
                        if (!isMobile) setShowDetails(true);
                      }}
                      className={`bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg border cursor-pointer transition-colors group ${
                        selectedStore?._id === store._id 
                          ? 'border-blue-400 ring-2 ring-blue-400/20' 
                          : 'border-white/20 hover:border-blue-300'
                      }`}
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Shop Logo/Initials */}
                          {(() => {
                            const raw = store.logoFileId as unknown;
                            let logoId: string | undefined;
                            if (typeof raw === 'string') {
                              logoId = raw;
                            } else if (raw && typeof raw === 'object') {
                              const maybe = raw as { _id?: unknown; toString?: () => string };
                              if (typeof maybe._id === 'string') logoId = maybe._id;
                              else if (typeof maybe.toString === 'function') logoId = maybe.toString();
                            }
                            
                            const initials = store.name
                              .split(' ')
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase();

                            return logoId ? (
                              <img
                                src={`${api.defaults.baseURL}/print-store/logo/${logoId}`}
                                alt={`${store.name} logo`}
                                className="w-16 h-16 rounded-xl object-cover border-2 border-white/20 group-hover:border-blue-300 transition-colors"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                                {initials}
                              </div>
                            );
                          })()}

                          {/* Shop Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h3 className="text-lg font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                                {store.name}
                              </h3>
                              {userLocation && store.address?.location && (
                                <div className="flex items-center gap-1 text-sm text-blue-300 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-400/20">
                                  <FiMapPin className="h-3 w-3" />
                                  <span>{getStoreDistanceKm(store).toFixed(1)} km</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-blue-200">
                                <MdLocationOn className="h-4 w-4 text-blue-300" />
                                <p className="text-sm truncate">
                                  {[store.address?.addressLine, store.address?.city].filter(Boolean).join(', ') || 'No address'}
                                </p>
                              </div>
                              
                              {store.mobile && (
                                <div className="flex items-center gap-2 text-blue-200">
                                  <AiOutlinePhone className="h-4 w-4 text-blue-300" />
                                  <p className="text-sm">{store.mobile}</p>
                                </div>
                              )}
                              
                              {store.createdAt && (
                                <div className="flex items-center gap-2 text-blue-200">
                                  <AiOutlineClockCircle className="h-4 w-4 text-blue-300" />
                                  <p className="text-sm">
                                    Since {new Date(store.createdAt).getFullYear()}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="mt-4 flex items-center justify-between">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // SAVE TO LOCALSTORAGE - CRITICAL FIX
                                  localStorage.setItem("customerStoreId", store._id);
                                  console.log("Saved store to localStorage:", store._id);
                                  navigate('/dashboard/customer', { state: { storeId: store._id } });
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors border border-blue-500"
                              >
                                <span>Select Shop</span>
                                <BsArrowRight className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStore(store);
                                  setShowDetails(true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors border border-blue-400/20 hover:border-blue-400/30"
                              >
                                <span className="text-sm font-medium">Details</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Right Panel - Map */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-24">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
                  <div className="p-4 border-b border-white/20">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <BsMap className="h-5 w-5 text-blue-400" />
                      Shop Locations
                    </h3>
                    <p className="text-sm text-blue-200 mt-1">
                      {stores.length} shops available on the map
                    </p>
                  </div>
                  
                  <div className="h-[400px] lg:h-[500px] relative">
                    <MapContainer 
                      center={[14.5995, 120.9842]} 
                      zoom={11} 
                      style={{ height: '100%', width: '100%' }}
                      className="rounded-b-2xl"
                    >
                      <TileLayer 
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <MapRefSetter />
                      <MapAutoPan
                        userLocation={userLocation}
                        shouldPanToUser={shouldPanToUser}
                        setShouldPanToUser={setShouldPanToUser}
                        selectedStore={selectedStore}
                        selectionNonce={selectionNonce}
                      />
                      
                      {/* User Marker */}
                      {userLocation && (
                        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                          <Popup>
                            <div className="p-2">
                              <p className="font-semibold text-gray-900">Your Location</p>
                              <p className="text-sm text-gray-600">You are here</p>
                            </div>
                          </Popup>
                        </Marker>
                      )}
                      
                      {/* Store Markers */}
                      {filteredStores
                        .map((s) => s.address?.location ? { loc: s.address.location, store: s } : null)
                        .filter(Boolean)
                        .map((item) => (
                          <Marker
                            key={item!.store._id}
                            position={[item!.loc.lat, item!.loc.lng]}
                            eventHandlers={{
                              click: () => {
                                setSelectedStore(item!.store);
                                setShowDetails(true);
                              }
                            }}
                          >
                            <Popup>
                              <div className="p-2 max-w-xs">
                                <h4 className="font-semibold text-gray-900">{item!.store.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                  {item!.store.address?.addressLine}
                                </p>
                                {userLocation && (
                                  <p className="text-sm text-blue-600 mt-2">
                                    {distanceKm(
                                      userLocation.lat,
                                      userLocation.lng,
                                      item!.loc.lat,
                                      item!.loc.lng
                                    ).toFixed(1)} km away
                                  </p>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                    </MapContainer>
                    
                    {/* Map Controls */}
                    <div className="absolute bottom-4 right-4 space-y-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={handleLocateClick}
                        className="p-3 bg-white/20 backdrop-blur-sm rounded-xl shadow-lg hover:bg-white/30 transition-colors border border-white/30 hover:border-white/40"
                        title="Find my location"
                      >
                        {locating ? (
                          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CiLocationArrow1 className="h-5 w-5 text-white" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Shop Details Modal */}
      <AnimatePresence>
        {selectedStore && (isMobile ? selectedStore : showDetails) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => requestClose(isMobile ? 'mobile' : 'desktop')}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-gray-900 border border-blue-400/30 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-blue-400/30 bg-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const raw = selectedStore.logoFileId as unknown;
                      let logoId: string | undefined;
                      if (typeof raw === 'string') {
                        logoId = raw;
                      } else if (raw && typeof raw === 'object') {
                        const maybe = raw as { _id?: unknown; toString?: () => string };
                        if (typeof maybe._id === 'string') logoId = maybe._id;
                        else if (typeof maybe.toString === 'function') logoId = maybe.toString();
                      }
                      
                      const initials = selectedStore.name
                        .split(' ')
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return logoId ? (
                        <img
                          src={`${api.defaults.baseURL}/print-store/logo/${logoId}`}
                          alt={`${selectedStore.name} logo`}
                          className="w-16 h-16 rounded-xl object-cover border-2 border-white/30"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-blue-600 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-bold">
                          {initials}
                        </div>
                      );
                    })()}
                    
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedStore.name}</h2>
                      <div className="flex items-center gap-3 mt-2">
                        {reviewCount > 0 && (
                          <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
                            <AiFillStar className="h-4 w-4 text-yellow-300" />
                            <span className="text-sm font-semibold text-white">
                              {avgRating.toFixed(1)} ({reviewCount})
                            </span>
                          </div>
                        )}
                        {selectedStore.createdAt && (
                          <div className="flex items-center gap-1 text-white/80">
                            <ClockIcon className="h-4 w-4" />
                            <span className="text-sm">Since {new Date(selectedStore.createdAt).getFullYear()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => requestClose(isMobile ? 'mobile' : 'desktop')}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors border border-white/20"
                  >
                    <XMarkIcon className="h-6 w-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column - Info & Map */}
                  <div className="space-y-6">
                    {/* Contact Info */}
                    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <FiMapPin className="h-5 w-5 text-blue-400" />
                        Contact Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <MapPinIcon className="h-5 w-5 text-blue-300" />
                          <div>
                            <p className="text-sm font-medium text-white">Address</p>
                            <p className="text-blue-200">
                              {[selectedStore.address?.addressLine, selectedStore.address?.city, selectedStore.address?.state, selectedStore.address?.postal]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          </div>
                        </div>
                        
                        {selectedStore.mobile && (
                          <div className="flex items-center gap-3">
                            <PhoneIcon className="h-5 w-5 text-blue-300" />
                            <div>
                              <p className="text-sm font-medium text-white">Contact Number</p>
                              <p className="text-blue-200">{selectedStore.mobile}</p>
                            </div>
                          </div>
                        )}
                        
                        {userLocation && selectedStore.address?.location && (
                          <div className="flex items-center gap-3">
                            <FiNavigation className="h-5 w-5 text-blue-300" />
                            <div>
                              <p className="text-sm font-medium text-white">Distance</p>
                              <p className="text-blue-400 font-semibold">
                                {distanceKm(
                                  userLocation.lat,
                                  userLocation.lng,
                                  selectedStore.address.location.lat,
                                  selectedStore.address.location.lng
                                ).toFixed(1)} km away
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Map Preview */}
                    {selectedStore.address?.location && (
                      <div className="rounded-2xl overflow-hidden border border-white/20 h-64">
                        <MapContainer
                          center={[selectedStore.address.location.lat, selectedStore.address.location.lng]}
                          zoom={15}
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={[selectedStore.address.location.lat, selectedStore.address.location.lng]} />
                          {userLocation && (
                            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon} />
                          )}
                        </MapContainer>
                      </div>
                    )}
                    
                    {/* Select Button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        // SAVE TO LOCALSTORAGE - CRITICAL FIX
                        localStorage.setItem("customerStoreId", selectedStore._id);
                        console.log("Saved store to localStorage from modal:", selectedStore._id);
                        navigate('/dashboard/customer', { state: { storeId: selectedStore._id } });
                      }}
                      className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-3 border border-blue-500"
                    >
                      <BsCheckCircleFill className="h-6 w-6" />
                      Select This Store
                    </motion.button>
                  </div>

                  {/* Right Column - Reviews */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <MdOutlineRateReview className="h-5 w-5 text-blue-400" />
                      Customer Reviews
                    </h3>
                    
                    {reviewsLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <p className="mt-2 text-blue-200">Loading reviews...</p>
                      </div>
                    ) : reviewsError ? (
                      <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4">
                        <p className="text-red-200">{reviewsError}</p>
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-8">
                        <CiStar className="h-12 w-12 text-blue-300 mx-auto" />
                        <p className="mt-2 text-blue-200">No reviews yet</p>
                        <p className="text-sm text-blue-300">Be the first to review this shop!</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {reviews.map((review) => (
                          <div key={review._id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                                  {typeof review.user === 'string' 
                                    ? review.user[0]?.toUpperCase() || 'U'
                                    : (review.user?.firstName?.[0] || review.user?.lastName?.[0] || 'U')}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-white">
                                    {typeof review.user === 'string' 
                                      ? 'User' 
                                      : `${review.user?.firstName || ''} ${review.user?.lastName || ''}`.trim() || 'Anonymous'}
                                  </p>
                                  <p className="text-xs text-blue-300">
                                    {new Date(review.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  i < review.rating 
                                    ? <AiFillStar key={i} className="h-4 w-4 text-yellow-400" />
                                    : <AiOutlineStar key={i} className="h-4 w-4 text-gray-400" />
                                ))}
                              </div>
                            </div>
                            
                            {review.comment && (
                              <p className="text-blue-100 text-sm mt-2">{review.comment}</p>
                            )}
                            
                            {/* Review Images */}
                            {(() => {
                              const imgs: string[] = [];
                              const raw = review.imageFileId as unknown;
                              let legacyId: string | undefined;
                              if (typeof raw === 'string') legacyId = raw;
                              else if (raw && typeof raw === 'object') {
                                const maybe = raw as { _id?: unknown; toString?: () => string };
                                if (typeof maybe._id === 'string') legacyId = maybe._id;
                                else if (typeof maybe.toString === 'function') legacyId = maybe.toString();
                              }
                              if (legacyId) imgs.push(`${api.defaults.baseURL}/reviews/image/${legacyId}`);
                              
                              if (Array.isArray(review.images)) {
                                for (const it of review.images) {
                                  let id: string | undefined;
                                  const rawId = it?.fileId as unknown;
                                  if (typeof rawId === 'string') id = rawId;
                                  else if (rawId && typeof rawId === 'object') {
                                    const maybe2 = rawId as { _id?: unknown; toString?: () => string };
                                    if (typeof maybe2._id === 'string') id = maybe2._id;
                                    else if (typeof maybe2.toString === 'function') id = maybe2.toString();
                                  }
                                  if (id) imgs.push(`${api.defaults.baseURL}/reviews/image/${id}`);
                                }
                              }
                              
                              if (imgs.length === 0) return null;
                              
                              return (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  {imgs.map((src, i) => (
                                    <img
                                      key={i}
                                      src={src}
                                      alt={`Review ${i + 1}`}
                                      className="h-20 w-full object-cover rounded-lg border border-white/20"
                                    />
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* My Review Form */}
                    {user && user.role !== 'guest' && (
                      <div className="mt-6 pt-6 border-t border-white/20">
                        <h4 className="text-lg font-semibold text-white mb-4">Leave a Review</h4>
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!selectedStore) return;
                            try {
                              const form = new FormData();
                              form.append('rating', String(myRating));
                              form.append('comment', myComment || '');
                              for (const { file } of myImages) form.append('images', file);
                              await api.post(`/reviews/store/${selectedStore._id}`, form, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                              });
                              const res = await api.get(`/reviews/store/${selectedStore._id}`);
                              setReviews(res.data.reviews || []);
                              setAvgRating(res.data.averageRating || 0);
                              setReviewCount(res.data.count || 0);
                              clearAllImages();
                              setInitialRating(myRating);
                              setInitialComment(myComment || '');
                            } catch (err: unknown) {
                              if (isAxiosError(err)) setReviewsError(err.response?.data?.message ?? err.message);
                              else if (isError(err)) setReviewsError(err.message);
                              else setReviewsError('Failed to submit review');
                            }
                          }}
                          className="space-y-4"
                        >
                          {/* Rating Stars */}
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">Your Rating</label>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <button
                                  type="button"
                                  key={i}
                                  onClick={() => setMyRating(i + 1)}
                                  className="hover:scale-110 transition-transform"
                                >
                                  {i < myRating 
                                    ? <AiFillStar className="h-8 w-8 text-yellow-400" />
                                    : <AiOutlineStar className="h-8 w-8 text-gray-400" />
                                  }
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          {/* Comment */}
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">Your Comment</label>
                            <textarea
                              value={myComment}
                              onChange={(e) => setMyComment(e.target.value)}
                              placeholder="Share your experience with this shop..."
                              className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/5 text-white placeholder:text-blue-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none transition-colors"
                              rows={3}
                            />
                          </div>
                          
                          {/* Images */}
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">Add Photos</label>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={pickImages}
                                disabled={myImages.length >= 5}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                                  myImages.length >= 5
                                    ? 'bg-white/10 text-blue-300 cursor-not-allowed'
                                    : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-400/30 hover:border-blue-400/40'
                                }`}
                              >
                                <AiOutlineCamera className="h-5 w-5" />
                                <span>{myImages.length >= 5 ? 'Max 5 photos' : 'Add Photo'}</span>
                              </button>
                              
                              <span className="text-sm text-blue-300">
                                {myImages.length}/5 photos
                              </span>
                            </div>
                            
                            {myImages.length > 0 && (
                              <div className="mt-3 grid grid-cols-5 gap-2">
                                {myImages.map((img, idx) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={img.preview}
                                      alt={`Selected ${idx + 1}`}
                                      className="h-20 w-full object-cover rounded-lg border border-white/20"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeImageAt(idx)}
                                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors border border-white/20"
                                    >
                                      <AiOutlineCloseCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Form Actions */}
                          <div className="flex items-center justify-between pt-4">
                            {myRating > 0 && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!selectedStore) return;
                                  try {
                                    await api.delete(`/reviews/store/${selectedStore._id}/me`);
                                    const res = await api.get(`/reviews/store/${selectedStore._id}`);
                                    setReviews(res.data.reviews || []);
                                    setAvgRating(res.data.averageRating || 0);
                                    setReviewCount(res.data.count || 0);
                                    setMyRating(0);
                                    setMyComment('');
                                    clearAllImages();
                                    setInitialRating(0);
                                    setInitialComment('');
                                  } catch (err: unknown) {
                                    if (isAxiosError(err)) setReviewsError(err.response?.data?.message ?? err.message);
                                    else if (isError(err)) setReviewsError(err.message);
                                    else setReviewsError('Failed to delete review');
                                  }
                                }}
                                className="px-4 py-2 text-red-300 hover:bg-red-500/20 rounded-xl transition-colors border border-red-500/30 hover:border-red-500/40"
                              >
                                Delete My Review
                              </button>
                            )}
                            
                            <div className="flex items-center gap-3">
                              <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 transition-colors border border-blue-500"
                              >
                                Submit Review
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discard Confirmation Modal */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={cancelDiscard}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-gray-900 border border-blue-400/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                  <AiOutlineCloseCircle className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Discard Changes?</h3>
                <p className="text-blue-200">
                  You have unsaved changes in your review. Are you sure you want to discard them?
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelDiscard}
                  className="flex-1 px-4 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDiscard}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium border border-red-500"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}