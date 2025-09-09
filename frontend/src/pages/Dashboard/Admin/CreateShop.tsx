import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../../lib/api";
import CropperModal from '../../../components/CropperModal';
import PrintEaseLogo from "../../../assets/PrintEase-Logo.png";

/* map imports */
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
//leaflet icon URLs
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
// explicit default icon
const DefaultMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
// set default marker icon
L.Marker.prototype.options.icon = DefaultMarkerIcon;

export default function CreateShop() {
  // verification input removed
  const [storeName, setStoreName] = useState("");
  const [tin, setTin] = useState("");
  const [mobile, setMobile] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [stateField, setStateField] = useState("");
  const [postal, setPostal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [originalLogoFile, setOriginalLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [logoPreview, cropSrc]);

  // marker position
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  // marker position (click to place, auto reverse-geocode)
  

  // map click handler
  function MapClickHandler() {
    useMapEvents({
      click: async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setPosition({ lat, lng });
        await reverseGeocode(lat, lng);
      },
    });
    return null;
  }

  // reverse geocode helper
  async function reverseGeocode(lat: number, lng: number) {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const addr = data.address || {};
      console.debug("nominatim address:", addr);
      const streetParts = [addr.house_number, addr.road, addr.barangay, addr.suburb, addr.neighbourhood, addr.hamlet]
        .filter(Boolean)
        .join(" ");
      if (streetParts) setAddressLine(streetParts);
      const cityValue = addr.city || addr.city_district || addr.town || addr.village || addr.municipality || addr.county || "";
      setCity(cityValue);
      const provinceCandidate = addr.state || addr.province || addr.state_district || addr.region || addr.county || "";
      const provinceValue = /metro manila|ncr|national capital region/i.test(provinceCandidate) ? "Metro Manila" : provinceCandidate;
      setStateField(provinceValue);
      setCountry(addr.country || "");
      setPostal(addr.postcode || "");
    } catch (err) {
      console.error("Reverse geocode failed:", err);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-black flex flex-col">
  {/* header */}
      <header className="w-full bg-transparent">
    <div className="max-w-4xl mx-auto gap-2 pt-6 pb-1 flex flex-col items-center justify-center">
      <Link to="/" aria-label="Go to landing page">
        <img alt="PrintEase" src={PrintEaseLogo} className="h-25 w-auto mt-10" />
      </Link>
        </div>
      </header>

  {/* main form */}
      <main className="flex-1 flex items-start justify-center px-6 py-16 lg:px-8">
        <div className="w-full max-w-6xl mt-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                const form = new FormData();
                form.append('name', storeName);
                form.append('tin', tin);
                form.append('mobile', mobile);
                const addressObj = {
                  addressLine,
                  city,
                  country,
                  state: stateField,
                  postal,
                  location: position ? { lat: position.lat, lng: position.lng } : undefined,
                };
                form.append('address', JSON.stringify(addressObj));
                if (logoFile) form.append('logo', logoFile);

                await api.post('/print-store', form, {
                  headers: { 'Content-Type': 'multipart/form-data' },
                });
                navigate("/dashboard/owner");
              } catch (err: unknown) {
                let msg = "Failed to create store";
                if (typeof err === "object" && err !== null && "response" in err) {
                  const maybe = err as {
                    response?: { data?: { message?: string } };
                  };
                  msg = maybe.response?.data?.message || msg;
                } else if (err instanceof Error) {
                  msg = err.message;
                }
                setError(msg);
              } finally {
                setLoading(false);
              }
            }}
             className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-2 border-blue-900 rounded-xl p-8 lg:p-10 bg-gray-100 shadow-lg"
          >
            <div className="lg:col-span-2 text-center mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-black">CREATE SHOP</h2>
            </div>

            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Store Name */}
              <div>
                <label
                  htmlFor="storeName"
                  className="block text-sm font-semibold text-black"
                >
                  STORE NAME
                </label>
                <input
                  id="storeName"
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                  className="mt-2 block w-full rounded-xl bg-neutral-300 px-3 py-2 text-gray-900 outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g. PrintEase Express"
                />
              </div>

              {/* TIN */}
              <div>
                <label
                  htmlFor="tin"
                  className="block text-sm font-semibold text-black"
                >
                  TAX PAYER IDENTIFICATION NUMBER
                </label>
                <input
                  id="tin"
                  type="text"
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  className="mt-2 block w-full rounded-xl bg-neutral-300 px-3 py-2 text-gray-900 outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                  placeholder="123-456-789"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label
                  htmlFor="mobile"
                  className="block text-sm font-semibold text-black"
                >
                  ACTIVE MOBILE NUMBER
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="flex-1 rounded-xl bg-neutral-300 px-3 py-2 text-gray-900 outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    placeholder="09XXXXXXXXX"
                  />
                  <button
                    type="button"
                    // send code placeholder
                    onClick={() => { /* send code action can be implemented here */ }}
                    className="rounded-xl bg-neutral-300 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200 focus:outline-none"
                  >
                    Send Code
                  </button>
                </div>
              </div>

              {/* address */}
              <div>
                <label className="block text-sm font-semibold text-black">Street Address</label>
                <div className="mt-2">
                  <input
                    id="addressLine"
                    type="text"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    className="w-full rounded-xl bg-neutral-300 px-3 py-2 text-gray-900 outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    placeholder="Address (Apartment, Street, Barangay, etc.)"
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="rounded-xl bg-neutral-300 px-3 py-2 text-gray-900 outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    placeholder="City / Municipality"
                  />
                  <input
                    id="state"
                    type="text"
                    value={stateField}
                    onChange={(e) => setStateField(e.target.value)}
                    className="rounded-xl bg-neutral-300 px-3 py-2 text-gray-900 outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    placeholder="Province / Region"
                  />
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    id="postal"
                    type="text"
                    value={postal}
                    onChange={(e) => setPostal(e.target.value)}
                    className="rounded-xl bg-neutral-300 px-3 py-2 text-gray-900 outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    placeholder="Postal / Zip Code"
                  />
                  <input
                    id="country"
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="rounded-xl bg-neutral-300 px-3 py-2 text-gray-900 outline-none placeholder:text-gray-600 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                    placeholder="Country"
                  />
                </div>
              </div>

              {/* verification removed to be added*/}
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* shop logo */}
              <div>
                <label
                  htmlFor="shopLogo"
                  className="block text-sm font-semibold text-black"
                >
                  PRINT SHOP LOGO
                </label>
                {!logoPreview ? (
                  <label
                    htmlFor="shopLogo"
                    className="mt-2 flex flex-col items-center justify-center w-full h-36 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-100"
                  >
                    <>
                      <svg
                        className="w-8 h-8 mb-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7v10M17 7v10M7 12h10" />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag & drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG or SVG</p>
                      <input
                        id="shopLogo"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          if (!f) return;
                          // save original file for future edits
                          setOriginalLogoFile(f);
                          const url = URL.createObjectURL(f);
                          setCropSrc(url);
                          setShowCropper(true);
                        }}
                      />
                    </>
                  </label>
                ) : (
                  <div
                    className="mt-2 flex flex-col items-center justify-center w-full h-36 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-100"
                    role="button"
                    onClick={() => {
                      // Prefer original uploaded file so users re-edit the full image
                      if (originalLogoFile) {
                        const url = URL.createObjectURL(originalLogoFile);
                        setCropSrc(url);
                        setShowCropper(true);
                      } else if (logoFile) {
                        const url = URL.createObjectURL(logoFile);
                        setCropSrc(url);
                        setShowCropper(true);
                      } else if (logoPreview) {
                        setCropSrc(logoPreview);
                        setShowCropper(true);
                      }
                    }}
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                      <div className="h-20 w-20 rounded-full overflow-hidden bg-white flex items-center justify-center">
                        <img src={logoPreview} alt="logo preview" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (logoPreview) URL.revokeObjectURL(logoPreview);
                            setLogoPreview(null);
                            setLogoFile(null);
                            setOriginalLogoFile(null);
                          }}
                          className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        id="shopLogo"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          if (!f) return;
                          setOriginalLogoFile(f);
                          const url = URL.createObjectURL(f);
                          setCropSrc(url);
                          setShowCropper(true);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {showCropper && cropSrc && (
                <CropperModal
                  src={cropSrc}
                  aspect={1}
                  onCancel={() => {
                    setShowCropper(false);
                    URL.revokeObjectURL(cropSrc);
                    setCropSrc(null);
                  }}
                  onApply={(file) => {
                    // revoke previous preview
                    if (logoPreview) URL.revokeObjectURL(logoPreview);
                    const url = URL.createObjectURL(file);
                    setLogoFile(file);
                    setLogoPreview(url);
                    setShowCropper(false);
                    if (cropSrc) URL.revokeObjectURL(cropSrc);
                    setCropSrc(null);
                  }}
                />
              )}

              {/* BIR certificate */}
              <div>
                <label
                  htmlFor="birCert"
                  className="block text-sm font-semibold text-black"
                >
                  BIR CERTIFICATE OF REGISTRATION (Form 2303)
                </label>
                <label
                  htmlFor="birCert"
                  className="mt-2 flex flex-col items-center justify-center w-full h-50 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-100"
                >
                  <svg
                    className="w-8 h-8 mb-4 text-gray-500"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 20 16"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                    />
                  </svg>
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag & drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, PDF, JPG or DOCX</p>
                  <input id="birCert" type="file" className="hidden" />
                </label>
              </div>
            </div>

            {/* Map row spanning both columns */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-black">PIN LOCATION ON MAP</label>
              <div className="mt-2 w-full h-72 rounded-lg overflow-hidden border border-gray-300">
                  <MapContainer center={[14.5995, 120.9842]} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapClickHandler />
                  {position && (
                    <Marker
                      position={[position.lat, position.lng]}
                      draggable={true}
                      eventHandlers={{
                        dragend: async (e) => {
                          const marker = e.target as L.Marker;
                          const p = marker.getLatLng();
                          setPosition({ lat: p.lat, lng: p.lng });
                          await reverseGeocode(p.lat, p.lng);
                        },
                      }}
                    >
                      <Popup>
                        Selected location
                        <div className="text-xs">Lat: {position.lat.toFixed(5)}, Lng: {position.lng.toFixed(5)}</div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
              <p className="text-xs text-gray-500 mt-2">Click map to pin and autofill (OSM Nominatim).</p>
            </div>

            {/* submit */}
            <div className="lg:col-span-2">
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-blue-950 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-900 focus:outline-none disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Create Store"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full rounded-md bg-neutral-300 px-3 py-2 text-sm font-semibold text-black hover:bg-gray-300 focus:outline-none"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
