import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { CiLocationArrow1 } from "react-icons/ci";
import PrintEaseLogo from '../../../assets/PrintEase-Logo.png';
import PrintEaseLogoMobile from '../../../assets/PrintEase-logo1.png';
import api from '../../../lib/api';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type PrintStore = {
  _id: string;
  name: string;
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
};

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
  const navigate = useNavigate();
  const [selectionNonce, setSelectionNonce] = useState<number>(0);
  const mapRef = useRef<L.Map | null>(null);

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
        // fitBounds will ensure both markers are visible; cap max zoom so it doesn't zoom too close
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
              <div className="border-2 border-white/90 rounded-lg p-6 bg-black h-full">
                <div className="rounded-md bg-black p-6 h-full flex flex-col">
                  <div className="mb-6 text-center">
                    <h1 className="text-xl lg:text-2xl uppercase tracking-wider font-medium" style={{ fontFamily: "'Open Sans', sans-serif" }}>
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
                          className="w-full h-10 text-sm rounded-full bg-transparent border border-white/30 px-4 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-0"
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
                                className={`flex items-center justify-between gap-x-6 py-3 px-3 hover:bg-white/5 rounded cursor-pointer ${selectedStore?._id === store._id ? 'bg-white/10' : ''}`}
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
                                        <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 bg-white/5 flex items-center justify-center">
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
                                    <p className="text-sm font-semibold">{store.name}</p>
                                    <p className="mt-1 text-xs text-gray-300 break-words">{addressParts || 'No address provided'}</p>
                                    {store.mobile && <p className="mt-1 text-xs text-gray-300">Contact Number: {store.mobile}</p>}
                                    {userLocation && store.address?.location && (
                                      <p className="mt-1 text-xs text-gray-300">{getStoreDistanceKm(store).toFixed(1)} km away</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex shrink-0 items-center">
                                  <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
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

  {/* store modal */}
  {selectedStore && isMobile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelectedStore(null)} />
          <div className="relative max-w-3xl w-full mx-4 bg-black border border-white/10 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
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
                    return <img src={src} alt={`${selectedStore.name} logo`} className="h-10 w-10 object-cover rounded" />;
                  }
                  return null;
                })()}
                <div>
                  <h3 className="text-base font-semibold">{selectedStore.name}</h3>
                  <p className="text-xs text-gray-300">{[
                    selectedStore.address?.addressLine,
                    selectedStore.address?.city,
                    selectedStore.address?.state,
                    selectedStore.address?.postal,
                  ].filter(Boolean).join(', ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {locating && <span className="text-sm text-gray-300">Requesting location…</span>}
                <button
                  type="button"
                  onClick={() => setSelectedStore(null)}
                  className="rounded-full bg-white/5 hover:bg-white/10 px-3 py-1 text-sm"
                  aria-label="Close store details"
                >
                  Close
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
                  className="rounded-full bg-white/5 hover:bg-white/10 px-3 py-1 text-sm"
                >
                  Select this store
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
