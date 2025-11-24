import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineArrowLeft } from 'react-icons/ai';
import PrintEaseLogo from '../../../assets/PrintEase-Logo.png';
import PrintEaseLogoMobile from '../../../assets/PrintEase-logo1.png';
import { useAuth } from "../../../context/AuthContext";
import CropperModal from '../../../components/CropperModal';

const OWNER_DASHBOARD_ROLES = ["Operations Manager", "Front Desk", "Inventory & Supplies", "Printer Operator"] as const;
type OwnerDashboardRole = typeof OWNER_DASHBOARD_ROLES[number];
const isOwnerDashboardRole = (role?: string | null): role is OwnerDashboardRole =>
  !!role && OWNER_DASHBOARD_ROLES.includes(role as OwnerDashboardRole);

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOwnerContext = user?.role === 'owner' || (user?.role === 'employee' && isOwnerDashboardRole(user.employeeRole));
  const backPath = location.state?.from || (isOwnerContext ? '/dashboard/owner' : '/dashboard/customer');

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDeleted, setAvatarDeleted] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setFirstName(user?.firstName || '');
      setLastName(user?.lastName || '');
      setAddress(user?.address || '');
      setPhone(user?.phone || '');
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarDeleted(false);
      setError(null);
      setSuccessMsg(null);
    }
  }, [user, isEditing]);

  useEffect(() => {
    if (!avatarFile) return setAvatarPreview(null);
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const initials = `${(firstName[0] || 'C').toUpperCase()}${(lastName[0] || 'C').toUpperCase()}`;
  const onAvatarClick = () => isEditing && fileInputRef.current?.click();
  const onAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please select a valid image file.');
    setAvatarFile(file); setError(null); setAvatarDeleted(false);
  };
  const handleCancel = () => setIsEditing(false);

  const onDeleteAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarDeleted(true);
  };

  const openCropper = () => {
    const src = avatarPreview || currentAvatarUrl;
    if (src) {
      setCropperSrc(src);
    } else if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleSave = async () => {
    if (!updateUser) return;
    setError(null); setSuccessMsg(null); setSaving(true);
    try {
      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('address', address);
      formData.append('phone', phone);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else if (avatarDeleted) {
        formData.append('avatar', '');
      }

      await updateUser(formData);

      setSuccessMsg('Profile updated successfully.');
      setIsEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile.');
    } finally { setSaving(false); }
  };

  const fields = [
    { id: 'firstName', label: 'First Name', value: firstName, setValue: setFirstName },
    { id: 'lastName', label: 'Last Name', value: lastName, setValue: setLastName },
    { id: 'phone', label: 'Phone Number', value: phone, setValue: setPhone, type: 'tel' },
  ];
  const currentAvatarUrl = user?.avatarUrl || null;

  const gradientClass = isOwnerContext
    ? 'bg-gradient-to-r from-[#0f172a] via-[#1e3a8a]/90 to-white'
    : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-black';

  return (
    <div className={`min-h-screen ${gradientClass} text-white`}>
      <header className="w-full bg-white px-6 py-4 flex items-center gap-4 justify-center lg:justify-start">
        <Link to="/" aria-label="Go to landing page">
          <img alt="PrintEase" src={PrintEaseLogoMobile} className="block lg:hidden h-10 w-auto" />
          <img alt="PrintEase" src={PrintEaseLogo} className="hidden lg:block h-10 w-auto" />
        </Link>
      </header>

      <main className="px-6 py-16 lg:px-10">
        <div className="max-w-3xl mx-auto mt-20 relative">
          {/* Enhanced Back Button */}
          <button
            type="button"

            onClick={() => navigate(user?.role === 'owner' ? '/dashboard/owner' : backPath)}
            className="absolute -top-12 left-0 flex items-center gap-3 bg-slate-700/60 hover:bg-slate-700/80 text-white font-semibold text-sm rounded-2xl px-5 py-3 border border-slate-600 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
          >
            <AiOutlineArrowLeft size={20} /> Back to Dashboard
          </button>

          <div className="rounded-xl bg-gray-900 text-white border border-white/10 shadow-xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
              <h1 className="text-lg sm:text-xl font-semibold">My Profile</h1>
              {!isEditing && (
                <button 
                  type="button" 
                  onClick={() => setIsEditing(true)} 
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500 hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <AiOutlineEdit className="h-5 w-5" /> Edit Profile
                </button>
              )}
            </div>

            <div className="p-4 sm:p-5 flex flex-col items-center gap-6">
              <div className="relative">
                <div
                  onClick={onAvatarClick}
                  className={`h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white select-none shadow-2xl border-4 border-slate-600 transition-all duration-300 ${
                    isEditing ? 'cursor-pointer hover:scale-110 hover:border-blue-400' : 'cursor-default'
                  }`}
                  aria-label="Profile avatar"
                  role={isEditing ? 'button' : undefined}
                  tabIndex={isEditing ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (isEditing && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onAvatarClick();
                    }
                  }}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile avatar preview" className="h-full w-full rounded-full object-cover" />
                  ) : currentAvatarUrl ? (
                    <img src={currentAvatarUrl} alt="Profile avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                {isEditing && (
                  <div
                    onClick={openCropper}
                    className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-2 cursor-pointer shadow-lg border border-white/20 hover:scale-110 transition-transform duration-200"
                    title="Crop avatar"
                  >
                    <AiOutlineEdit className="text-white" size={18} />
                  </div>
                )}
              </div>

              {isEditing && (avatarPreview || avatarFile || user?.avatarUrl) && (
                <button
                  type="button"
                  onClick={onDeleteAvatar}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200 backdrop-blur-sm"
                  title="Remove current avatar"
                >
                  <AiOutlineDelete size={18} />
                  <span className="font-medium">Remove Photo</span>
                </button>
              )}

              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={onAvatarChange} />

              <form onSubmit={async e => { e.preventDefault(); await handleSave(); }} className="w-full space-y-4">
                {fields.map(f => {
                  const baseInput = "w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-white placeholder-gray-400 focus:outline-none";
                  const activeInput = `${baseInput} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-slate-500 transition-all duration-200`;
                  const inertInput = `${baseInput} cursor-default select-none caret-transparent pointer-events-none focus:ring-0`;
                  return (
                    <div key={f.id}>
                      <label htmlFor={f.id} className="block text-xs text-gray-300 mb-1">{f.label}</label>
                      <input
                        id={f.id}
                        type={f.type || 'text'}
                        value={f.value}
                        onChange={e => f.setValue(e.target.value)}
                        className={isEditing ? activeInput : inertInput}
                        placeholder={f.label}
                        readOnly={!isEditing}
                        tabIndex={isEditing ? 0 : -1}
                      />
                    </div>
                  );
                })}

                <div>
                  <label htmlFor="address" className="block text-xs text-gray-300 mb-1">Address</label>
                  <textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={
                      isEditing
                        ? "w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200 hover:border-slate-500"
                        : "w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-0 resize-none cursor-default select-none caret-transparent pointer-events-none"
                    }
                    placeholder="Address"
                    rows={3}
                    readOnly={!isEditing}
                    tabIndex={isEditing ? 0 : -1}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-emerald-300 text-sm">{successMsg}</p>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  {isEditing ? (
                    <>
                      <button 
                        type="button" 
                        onClick={handleCancel} 
                        disabled={saving} 
                        className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white transition-all duration-200 font-medium"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={saving} 
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
      {cropperSrc && (
        <CropperModal
          src={cropperSrc}
          aspect={1}
          theme="dark"
          onCancel={() => setCropperSrc(null)}
          onApply={(file) => {
            setAvatarFile(file);
            setAvatarDeleted(false);
            setCropperSrc(null);
          }}
        />
      )}
    </div>
  );
}