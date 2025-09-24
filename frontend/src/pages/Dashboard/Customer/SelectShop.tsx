import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { CiLocationArrow1 } from "react-icons/ci";
import { AiFillStar, AiOutlineStar, AiOutlineCamera, AiOutlineCloseCircle } from 'react-icons/ai';
import { XMarkIcon } from '@heroicons/react/24/outline';
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
  imageFileId?: unknown; // legacy single image
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

  // helpers for image picking and cleanup (multiple up to 5)
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

  // Unsaved-changes guard (both modals)
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
    // revert to initial values and close
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

  // Load reviews when opening details for a store
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
        // set my review if exists
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
        // reset staged images on load
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

  // mobile/desktop
  useEffect(() => {
    const update = () => setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
    update();
    const onResize = () => update();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // haversine (km)
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

  // filter stores
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

  // store distance (or Infinity)
  function getStoreDistanceKm(s: PrintStore) {
    if (!userLocation || !s.address?.location) return Infinity;
    return distanceKm(
      userLocation.lat,
      userLocation.lng,
      s.address.location.lat,
      s.address.location.lng
    );
  }

  // locate user & pan
  function handleLocateClick() {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }
    setError(null);
    setLocating(true);
    // Ensure no store pans after we pan to user
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

  // Auto-pan logic
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

      // pan to user
      if (shouldPanToUser && userLocation) {
        map.flyTo([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 13));
        // Reset the flag so we don't re-trigger; store is already cleared on click.
        setShouldPanToUser(false);
        return;
      }

      // fit bounds for user+store
      if (userLocation && selectedStore?.address?.location) {
        const a = L.latLng(userLocation.lat, userLocation.lng);
        const b = L.latLng(selectedStore.address.location.lat, selectedStore.address.location.lng);
        const bounds = L.latLngBounds([a, b]);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        return;
      }

      // center on store
      if (selectedStore?.address?.location) {
        const loc = selectedStore.address.location;
        map.flyTo([loc.lat, loc.lng], Math.max(map.getZoom(), 14));
      }
    }, [map, userLocation, shouldPanToUser, setShouldPanToUser, selectedStore, selectionNonce]);

    return null;
  }

  // set mapRef
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

  // user icon (svg)
  const userIcon = L.divIcon({
    className: '',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;background:#1e293b;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12c2.761 0 5-2.238 5-5s-2.239-5-5-5-5 2.238-5 5 2.239 5 5 5z" fill="#fff"/>
          <path d="M4 20c0-3.313 2.687-6 6-6h4c3.313 0 6 2.687 6 6v1H4v-1z" fill="#fff"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

  return (
  <div className="min-h-screen bg-gradient-to-r from-blue-900 via-indigo-900 to-black text-white">
      {/* header */}
      <header className="w-full bg-white">
        <div className="max-w-8xl mx-auto px-6 py-4 flex items-center gap-4 justify-center lg:justify-start">
          <Link to="/" aria-label="Go to landing page">
            <img alt="PrintEase" src={PrintEaseLogoMobile} className="block lg:hidden h-10 w-auto" />
            <img alt="PrintEase" src={PrintEaseLogo} className="hidden lg:block h-10 w-auto" />
          </Link>
        </div>
      </header>

      <main className="px-6 py-16 lg:px-10">
        <div className="max-w-7xl mx-auto mt-20">
          <div className="lg:flex lg:items-stretch lg:gap-6 lg:justify-center">
            {/* Left: list/card */}
            <div className="flex-1 lg:w-auto lg:h-[640px]">
              <div className="border border-white/10 rounded-xl p-0 bg-gray-900 h-full">
                <div className="rounded-xl bg-gray-900 p-6 h-full flex flex-col">
                  <div className="mb-6 text-center">
                    <h1 className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: "'Open Sans', sans-serif" }}>
                      Select Your Store
                    </h1>
                  </div>

                  {/* search */}
                  <div className="mb-4">
                    <label htmlFor="search" className="sr-only">Search stores</label>
                    <div className="flex flex-col lg:flex-row items-center gap-2">
                      <div className="w-full lg:flex-1 relative">
                        <input
                          id="search"
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search print shops or address"
                          className="w-full h-11 text-sm rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* shop list */}
                  <div className="mt-4 border-t border-white/10 pt-4 flex-1 overflow-auto">
                    <div className="h-72 md:h-auto">
                      {loading && <p className="text-gray-300">Loading shops...</p>}
                      {error && <p className="text-red-400">{error}</p>}

                      {!loading && !error && (
                        <ul role="list" className="space-y-4">
                          {filteredStores.map((store) => {
                            const addressParts = [
                              store.address?.addressLine,
                              store.address?.city,
                              store.address?.state,
                              store.address?.postal,
                            ].filter(Boolean).join(', ');

                            const initials = store.name
                              .split(' ')
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase();

                            const handleSelect = () => {
                              setSelectedStore(store);
                              setSelectionNonce((n) => n + 1);
                              setError(null);
                              // Desktop: pan/zoom map to show store + user (if available)
                              if (!isMobile && store.address?.location && mapRef.current) {
                                if (userLocation) {
                                  const a = L.latLng(userLocation.lat, userLocation.lng);
                                  const b = L.latLng(store.address.location.lat, store.address.location.lng);
                                  const bounds = L.latLngBounds([a, b]);
                                  mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
                                } else {
                                  // No user location; center on the store
                                  mapRef.current.flyTo([store.address.location.lat, store.address.location.lng], Math.max(mapRef.current.getZoom(), 14));
                                }
                              }
                              // Mobile: request location permission when a store is selected
                              if (!isMobile) return;
                              // Request the user's location immediately so the modal can show distance
                              if (!navigator.geolocation) {
                                setError('Geolocation not supported by your browser');
                                return;
                              }
                              setLocating(true);
                              navigator.geolocation.getCurrentPosition(
                                (pos) => {
                                  const { latitude: lat, longitude: lng } = pos.coords;
                                  setUserLocation({ lat, lng });
                                  setLocating(false);
                                },
                                () => {
                                  setError('Unable to get your location');
                                  setLocating(false);
                                },
                                { enableHighAccuracy: true, timeout: 10000 }
                              );
                            };

                            return (
                              <li
                                key={store._id}
                                className={`flex items-center justify-between gap-x-6 py-3 px-3 rounded-lg cursor-pointer border transition ${selectedStore?._id === store._id ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                role="button"
                                tabIndex={0}
                                onClick={handleSelect}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(); }
                                }}
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  {/* show logo if available, otherwise initials */}
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
                                    if (logoId) {
                                      const src = `${api.defaults.baseURL}/print-store/logo/${logoId}`;
                                      return (
                                        <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 bg-white flex items-center justify-center border border-white/10">
                                          <img src={src} alt={`${store.name} logo`} className="h-full w-full object-cover" />
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-600 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white font-semibold overflow-hidden">
                                        <span className="text-sm font-semibold">{initials}</span>
                                      </div>
                                    );
                                  })()}
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white">{store.name}</p>
                                    <p className="mt-1 text-xs text-gray-300 break-words">{addressParts || 'No address provided'}</p>
                                    {store.mobile && <p className="mt-1 text-xs text-gray-300">Contact Number: {store.mobile}</p>}
                                    {userLocation && store.address?.location && (
                                      <p className="mt-1 text-xs text-gray-300">{getStoreDistanceKm(store).toFixed(1)} km away</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center">
                                  <button
                                    type="button"
                                    aria-label="View store details"
                                    className="p-1 rounded-lg hover:bg-white/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStore(store);
                                      setShowDetails(true);
                                    }}
                                  >
                                    <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* desktop map */}
            <div className="hidden lg:flex lg:flex-col lg:w-[420px] lg:h-[640px] flex-shrink-0">
              <div className="flex-1 rounded-4xl overflow-hidden border border-white/10">
                <MapContainer center={[14.5995, 120.9842]} zoom={11} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapRefSetter />
                  <MapAutoPan
                    userLocation={userLocation}
                    shouldPanToUser={shouldPanToUser}
                    setShouldPanToUser={setShouldPanToUser}
                    selectedStore={selectedStore}
                    selectionNonce={selectionNonce}
                  />
                  {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                      <Popup>You are here</Popup>
                    </Marker>
                  )}
                  {filteredStores
                    .map((s) => s.address?.location ? { loc: s.address.location, store: s } : null)
                    .filter(Boolean)
                    .map((item) => (
                      <Marker
                        key={`${item!.store._id}`}
                        position={[item!.loc.lat, item!.loc.lng]}
                        eventHandlers={{ click: () => setSelectedStore(item!.store) }}
                      />
                    ))}
                </MapContainer>
              </div>

              {/* desktop controls */}
              <div className="mt-4 lg:mt-6">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLocateClick}
                    className="flex-1 rounded-full bg-white/10 hover:bg-white/20 px-4 h-10 text-sm flex items-center justify-center"
                    aria-label="Find stores near me"
                  >
                    {locating ? (
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <CiLocationArrow1 className="animate-spin" />
                        <span>Locating…</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <CiLocationArrow1 />
                        <span>Use My Location</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* store modal (mobile) */}
      {selectedStore && isMobile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => requestClose('mobile')} />
          <div className="relative max-w-3xl w-full mx-4 bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                {(() => {
                  const raw = selectedStore?.logoFileId as unknown;
                  let logoId: string | undefined;
                  if (typeof raw === 'string') {
                    logoId = raw;
                  } else if (raw && typeof raw === 'object') {
                    const maybe = raw as { _id?: unknown; toString?: () => string };
                    if (typeof maybe._id === 'string') logoId = maybe._id;
                    else if (typeof maybe.toString === 'function') logoId = maybe.toString();
                  }
                  if (logoId) {
                    const src = `${api.defaults.baseURL}/print-store/logo/${logoId}`;
                    return <img src={src} alt={`${selectedStore.name} logo`} className="h-10 w-10 object-cover rounded bg-white border border-white/10" />;
                  }
                  return null;
                })()}
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    {selectedStore.name}
                    {reviewCount > 0 && (
                      <span className="text-xs text-yellow-400 flex items-center gap-1">
                        <AiFillStar /> {avgRating.toFixed(1)} ({reviewCount})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-300">{[
                    selectedStore.address?.addressLine,
                    selectedStore.address?.city,
                    selectedStore.address?.state,
                    selectedStore.address?.postal,
                  ].filter(Boolean).join(', ')}</p>
                  <div className="flex flex-col gap-0.5">
                    {selectedStore.mobile && (
                      <p className="text-xs text-gray-300">{selectedStore.mobile}</p>
                    )}
                    {selectedStore.createdAt && (
                      <p className="text-xs text-gray-400">Since {new Date(selectedStore.createdAt).getFullYear()}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {locating && <span className="text-sm text-gray-300">Requesting location…</span>}
                <button
                  type="button"
                  onClick={() => requestClose('mobile')}
                  className="p-2 hover:bg-white/10 rounded-lg"
                  aria-label="Close store details"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              {selectedStore.address?.location ? (
                <div className="w-full h-[56vh] rounded overflow-hidden border border-white/10">
                  <MapContainer
                    center={[selectedStore.address.location.lat, selectedStore.address.location.lng]}
                    zoom={15}
                    zoomControl={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <MapRefSetter />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapAutoPan
                      userLocation={userLocation}
                      shouldPanToUser={shouldPanToUser}
                      setShouldPanToUser={setShouldPanToUser}
                      selectedStore={selectedStore}
                      selectionNonce={selectionNonce}
                    />
                    {/* store marker */}
                    <Marker position={[selectedStore.address.location.lat, selectedStore.address.location.lng]}>
                      <Popup>{selectedStore.name}</Popup>
                    </Marker>
                    {/* user marker */}
                    {userLocation && (
                      <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                        <Popup>You are here</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              ) : (
                <div className="text-sm text-gray-300">No geolocation available for this store.</div>
              )}

              {/* distance & actions */}
              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-gray-300">
                  {userLocation && selectedStore.address?.location ? (
                    <span>{distanceKm(userLocation.lat, userLocation.lng, selectedStore.address.location.lat, selectedStore.address.location.lng).toFixed(1)} km away</span>
                  ) : (
                    <span>Distance not available until you allow location access.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                </div>
              </div>
              {/* mobile action */}
        <div className="m-auto flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedStore) return;
                    // navigate to customer dashboard and include selected store id in state
                    navigate('/dashboard/customer', { state: { storeId: selectedStore._id } });
                  }}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white border border-blue-600 px-3 py-2 text-sm"
                >
                  Select this store
                </button>
              </div>

              {/* Reviews (mobile) */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3">Reviews</h4>
                {reviewsLoading && <p className="text-sm text-gray-300">Loading reviews…</p>}
                {reviewsError && <p className="text-sm text-red-400">{reviewsError}</p>}
                {!reviewsLoading && !reviewsError && (
                  <div className="space-y-4">
                    {reviews.length === 0 && <p className="text-sm text-gray-300">No reviews yet.</p>}
                    {reviews.map((r) => (
                      <div key={r._id} className="border border-white/10 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-300">
                            {typeof r.user === 'string' ? 'User' : `${r.user?.firstName || ''} ${r.user?.lastName || ''}`}
                          </div>
                          <div className="flex items-center gap-1 text-yellow-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              i < r.rating ? <AiFillStar key={i} /> : <AiOutlineStar key={i} />
                            ))}
                          </div>
                        </div>
                        {/* Review images (mobile) */}
                        {(() => {
                          const imgs: string[] = [];
                          // legacy single image first
                          const raw = r.imageFileId as unknown;
                          let legacyId: string | undefined;
                          if (typeof raw === 'string') legacyId = raw;
                          else if (raw && typeof raw === 'object') {
                            const maybe = raw as { _id?: unknown; toString?: () => string };
                            if (typeof maybe._id === 'string') legacyId = maybe._id;
                            else if (typeof maybe.toString === 'function') legacyId = maybe.toString();
                          }
                          if (legacyId) imgs.push(`${api.defaults.baseURL}/reviews/image/${legacyId}`);
                          // new multiple images
                          if (Array.isArray(r.images)) {
                            for (const it of r.images) {
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
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {imgs.map((src, i) => (
                                <img key={i} src={src} alt={`Review attachment ${i + 1}`} className="max-h-56 rounded border border-white/10 object-contain" />
                              ))}
                            </div>
                          );
                        })()}
                        {r.comment && <p className="text-sm mt-2 text-gray-200">{r.comment}</p>}
                        <p className="text-[11px] text-gray-400 mt-2">{new Date(r.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* My review form */}
                <div className="mt-4 border-t border-white/10 pt-4">
                  {!user || user.role === 'guest' ? (
                    <p className="text-xs text-gray-300">Log in to leave a review.</p>
                  ) : (
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
                          // mark clean
                          setInitialRating(myRating);
                          setInitialComment(myComment || '');
                        } catch (err: unknown) {
                          if (isAxiosError(err)) setReviewsError(err.response?.data?.message ?? err.message);
                          else if (isError(err)) setReviewsError(err.message);
                          else setReviewsError('Failed to submit review');
                        }
                      }}
                      className="space-y-2"
                    >
                      <h4 className="text-sm font-semibold mb-2">Ratings</h4>
                      <div className="flex items-center gap-2 text-yellow-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button type="button" key={i} onClick={() => setMyRating(i + 1)} aria-label={`Rate ${i + 1} star`} className="hover:scale-105">
                            {i < myRating ? <AiFillStar /> : <AiOutlineStar />}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={myComment}
                        onChange={(e) => setMyComment(e.target.value)}
                        placeholder="Leave a comment (optional)"
                        className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        rows={3}
                      />
                      {/* Add photos (mobile) */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={pickImages}
                          disabled={myImages.length >= 5}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${myImages.length >= 5 ? 'bg-white/5 text-gray-400 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}
                        >
                          <AiOutlineCamera />
                          <span>{myImages.length >= 5 ? 'Max 5 photos' : 'Add photo'}</span>
                        </button>
                      </div>
                      {myImages.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {myImages.map((it, idx) => (
                            <div key={idx} className="relative group">
                              <img src={it.preview} alt={`Selected ${idx + 1}`} className="h-24 w-full object-cover rounded border border-white/10" />
                              <button
                                type="button"
                                className="absolute -top-2 -right-2 p-0.5 rounded-full bg-black/70 text-red-400 hover:text-red-500"
                                onClick={() => removeImageAt(idx)}
                                aria-label="Remove image"
                              >
                                <AiOutlineCloseCircle size={22} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-end items-center gap-2">
                        <button type="submit" className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white border border-blue-600 px-3 py-1.5 text-sm">Submit</button>
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
                                setInitialRating(0);
                                setInitialComment('');
                              } catch (err: unknown) {
                                if (isAxiosError(err)) setReviewsError(err.response?.data?.message ?? err.message);
                                else if (isError(err)) setReviewsError(err.message);
                                else setReviewsError('Failed to delete review');
                              }
                            }}
                            className="rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm border border-white/10"
                          >
                            Delete my review
                          </button>
                        )}
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details pop-up (desktop)*/}
    {selectedStore && showDetails && !isMobile && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => requestClose('desktop')} />
          <div className="relative w-full max-w-3xl mx-4 bg-gray-900 border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {(() => {
                  const raw = selectedStore?.logoFileId as unknown;
                  let logoId: string | undefined;
                  if (typeof raw === 'string') logoId = raw;
                  else if (raw && typeof raw === 'object') {
                    const maybe = raw as { _id?: unknown; toString?: () => string };
                    if (typeof maybe._id === 'string') logoId = maybe._id;
                    else if (typeof maybe.toString === 'function') logoId = maybe.toString();
                  }
                  if (logoId) {
                    const src = `${api.defaults.baseURL}/print-store/logo/${logoId}`;
                    return <img src={src} alt={`${selectedStore.name} logo`} className="h-10 w-10 rounded object-cover bg-white border border-white/10" />;
                  }
                  return null;
                })()}
                <div className="min-w-0">
                  <div className="text-base font-semibold flex items-center gap-2 truncate">
                    <span className="truncate">{selectedStore.name}</span>
                    {reviewCount > 0 && (
                      <span className="text-xs text-yellow-400 flex items-center gap-1 flex-shrink-0">
                        <AiFillStar /> {avgRating.toFixed(1)} ({reviewCount})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-300 truncate">
                    {selectedStore.address?.addressLine}, {selectedStore.address?.city}, {selectedStore.address?.state}, {selectedStore.address?.postal}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {selectedStore.mobile && <div className="text-xs text-gray-300">{selectedStore.mobile}</div>}
                    {selectedStore.createdAt && <div className="text-xs text-gray-400">Since {new Date(selectedStore.createdAt).getFullYear()}</div>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/10 rounded-lg" onClick={() => requestClose('desktop')} aria-label="Close">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {selectedStore.address?.location && (
                <div className="rounded overflow-hidden border border-white/10 h-48">
                  <MapContainer
                    center={[selectedStore.address.location.lat, selectedStore.address.location.lng]}
                    zoom={14}
                    zoomControl={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[selectedStore.address.location.lat, selectedStore.address.location.lng]} />
                  </MapContainer>
                </div>
              )}

              <div className="text-sm text-gray-300">
                {userLocation && selectedStore.address?.location ? (
                  <span>{distanceKm(userLocation.lat, userLocation.lng, selectedStore.address.location.lat, selectedStore.address.location.lng).toFixed(1)} km away</span>
                ) : (
                  <span>Distance unknown. Use "Use My Location" to enable.</span>
                )}
              </div>

        <div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/customer', { state: { storeId: selectedStore._id } })}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm text-white border border-blue-600"
                >
                  Select this store
                </button>
              </div>

              {/* Reviews */}
              <div className="pt-2 border-t border-white/10">
                <h4 className="text-sm font-semibold mb-3">Reviews</h4>
                {reviewsLoading && <p className="text-sm text-gray-300">Loading reviews…</p>}
                {reviewsError && <p className="text-sm text-red-400">{reviewsError}</p>}
                {!reviewsLoading && !reviewsError && (
                  <div className="space-y-3">
                    {reviews.length === 0 && <p className="text-sm text-gray-300">No reviews yet.</p>}
                    {reviews.map((r) => (
                      <div key={r._id} className="border border-white/10 rounded p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-300">
                            {typeof r.user === 'string' ? 'User' : `${r.user?.firstName || ''} ${r.user?.lastName || ''}`}
                          </div>
                          <div className="flex items-center gap-1 text-yellow-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              i < r.rating ? <AiFillStar key={i} /> : <AiOutlineStar key={i} />
                            ))}
                          </div>
                        </div>
                        {/* Review images (desktop) */}
                        {(() => {
                          const imgs: string[] = [];
                          // legacy
                          const raw = r.imageFileId as unknown;
                          let legacyId: string | undefined;
                          if (typeof raw === 'string') legacyId = raw;
                          else if (raw && typeof raw === 'object') {
                            const maybe = raw as { _id?: unknown; toString?: () => string };
                            if (typeof maybe._id === 'string') legacyId = maybe._id;
                            else if (typeof maybe.toString === 'function') legacyId = maybe.toString();
                          }
                          if (legacyId) imgs.push(`${api.defaults.baseURL}/reviews/image/${legacyId}`);
                          // new array
                          if (Array.isArray(r.images)) {
                            for (const it of r.images) {
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
                            <div className="mt-2 grid grid-cols-3 gap-2">
                              {imgs.map((src, i) => (
                                <img key={i} src={src} alt={`Review attachment ${i + 1}`} className="max-h-56 rounded border border-white/10 object-contain" />
                              ))}
                            </div>
                          );
                        })()}
                        {r.comment && <p className="text-sm mt-2 text-gray-200">{r.comment}</p>}
                        <p className="text-[11px] text-gray-400 mt-2">{new Date(r.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* My review form */}
                <div className="mt-4 border-t border-white/10 pt-4">
                  {!user || user.role === 'guest' ? (
                    <p className="text-xs text-gray-300">Log in to leave a review.</p>
                  ) : (
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
                      className="space-y-2"
                    >
                      <h4 className="text-sm font-semibold mb-2">Ratings</h4>
                      <div className="flex items-center gap-2 text-yellow-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            type="button"
                            key={i}
                            onClick={() => setMyRating(i + 1)}
                            aria-label={`Rate ${i + 1} star`}
                            className="hover:scale-105"
                          >
                            {i < myRating ? <AiFillStar /> : <AiOutlineStar />}
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={myComment}
                        onChange={(e) => setMyComment(e.target.value)}
                        placeholder="Leave a comment (optional)"
                        className="w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        rows={3}
                      />

                      {/* Combined Add photo and Submit buttons container */}
                      <div className="flex justify-between items-center gap-2">
                        {/* Add photo button on the left */}
                        <button
                          type="button"
                          onClick={pickImages}
                          disabled={myImages.length >= 5}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                            myImages.length >= 5 ? 'bg-white/5 text-gray-400 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          <AiOutlineCamera />
                          <span>{myImages.length >= 5 ? 'Max 5 photos' : 'Add photo'}</span>
                        </button>

                        {/* Submit and Delete buttons on the right */}
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-sm border border-blue-600"
                          >
                            Submit
                          </button>
                          {myRating > 0 && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!selectedStore) return;
                                try {
                                  await api.delete(`/reviews/store/${selectedStore._id}/me`);
                                  const res = await api.get(`/reviews/store/${selectedStore._id}`);
                                  setReviews(res.data.reviews || []);
                                  clearAllImages();
                                  setAvgRating(res.data.averageRating || 0);
                                  setReviewCount(res.data.count || 0);
                                  setMyRating(0);
                                  setMyComment('');
                                  setInitialRating(0);
                                  setInitialComment('');
                                } catch (err: unknown) {
                                  if (isAxiosError(err)) setReviewsError(err.response?.data?.message ?? err.message);
                                  else if (isError(err)) setReviewsError(err.message);
                                  else setReviewsError('Failed to delete review');
                                }
                              }}
                              className="rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm border border-white/10"
                            >
                              Delete my review
                            </button>
                          )}
                        </div>
                      </div>

                      {myImages.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 md:grid-cols-5 gap-2">
                          {myImages.map((it, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={it.preview}
                                alt={`Selected ${idx + 1}`}
                                className="h-20 w-full object-cover rounded border border-white/10"
                              />
                              <button
                                type="button"
                                className="absolute -top-2 -right-2 p-0.5 rounded-full bg-black/70 text-red-400 hover:text-red-500"
                                onClick={() => removeImageAt(idx)}
                                aria-label="Remove image"
                              >
                                <AiOutlineCloseCircle size={22} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global discard confirmation (covers both mobile & desktop) */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={cancelDiscard} />
          <div className="relative w-full max-w-sm mx-4 bg-gray-900 border border-white/10 rounded-xl p-4 shadow-xl">
            <h5 className="text-sm font-semibold mb-2">Discard changes?</h5>
            <p className="text-xs text-gray-300 mb-4">You have unsaved changes in your review. Are you sure you want to discard them?</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={cancelDiscard} className="px-3 py-1.5 text-sm rounded-lg border border-white/10 hover:bg-white/10">Cancel</button>
              <button type="button" onClick={confirmDiscard} className="px-3 py-1.5 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white border border-red-600">Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
