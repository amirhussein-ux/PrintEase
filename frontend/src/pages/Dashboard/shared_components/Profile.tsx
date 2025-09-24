import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineArrowLeft } from 'react-icons/ai';
import PrintEaseLogo from '../../../assets/PrintEase-Logo.png';
import PrintEaseLogoMobile from '../../../assets/PrintEase-logo1.png';
import { useAuth } from "../../../context/AuthContext";
import api from '../../../lib/api';
import CropperModal from '../../../components/CropperModal';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = location.state?.from || (user?.role === 'owner' ? '/dashboard/owner' : '/dashboard/customer');

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

  // Reset form on user change or cancel
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

  // Avatar preview
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


  // Delete avatar (reset to initials)
  const onDeleteAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  setAvatarDeleted(true);
  };

  // Open cropper using preview or current avatar; otherwise prompt upload
  const openCropper = () => {
    const src = avatarPreview || currentAvatarUrl;
    if (src) {
      setCropperSrc(src);
    } else if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  // Save profile changes
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
        // Only send deletion flag if explicitly deleted
        formData.append('avatar', '');
      }

      // Assuming updateUser   accepts FormData or adapt accordingly
      await updateUser  (formData);

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

  // Match dashboard gradients by role
  const gradientClass = user?.role === 'owner'
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
          <button type="button" onClick={() => navigate(user?.role === 'owner' ? '/dashboard/owner' : backPath)}
            className="absolute -top-12 left-0 flex items-center gap-2 bg-indigo-700 bg-opacity-70 hover:bg-opacity-90 text-white font-semibold text-sm rounded-full px-4 py-2 shadow-md">
            <AiOutlineArrowLeft size={20} /> Back
          </button>

          {/* Card styled to match Service Add/Edit modal */}
          <div className="rounded-xl bg-gray-900 text-white border border-white/10 shadow-xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
              <h1 className="text-lg sm:text-xl font-semibold">My Profile</h1>
              {!isEditing && (
                <button type="button" onClick={() => setIsEditing(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg border border-blue-600 hover:bg-blue-500 transition">
                  <AiOutlineEdit className="h-5 w-5" /> Edit
                </button>
              )}
            </div>

            <div className="p-4 sm:p-5 flex flex-col items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div onClick={onAvatarClick} className={`h-24 w-24 rounded-full bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white select-none cursor-${isEditing ? 'pointer' : 'default'}`}
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
                    className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1 cursor-pointer"
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
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-red-300 hover:bg-white/10 hover:text-red-200 text-xs"
                  title="Remove current avatar"
                >
                  <AiOutlineDelete size={16} />
                  <span>Remove photo</span>
                </button>
              )}

              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={onAvatarChange} />

              {/* Form */}
              <form onSubmit={async e => { e.preventDefault(); await handleSave(); }} className="w-full space-y-4">
                {fields.map(f => {
                  const baseInput = "w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-white placeholder-gray-400 focus:outline-none";
                  const activeInput = `${baseInput} focus:ring-2 focus:ring-blue-600`;
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

                {/* Address */}
                <div>
                  <label htmlFor="address" className="block text-xs text-gray-300 mb-1">Address</label>
                  <textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={
                      isEditing
                        ? "w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                        : "w-full rounded-lg bg-gray-800 border border-white/10 px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-0 resize-none cursor-default select-none caret-transparent pointer-events-none"
                    }
                    placeholder="Address"
                    rows={3}
                    readOnly={!isEditing}
                    tabIndex={isEditing ? 0 : -1}
                  />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}
                {successMsg && <p className="text-sm text-green-400">{successMsg}</p>}

                <div className="pt-2 flex justify-end gap-2">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={handleCancel} disabled={saving} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10">Cancel</button>
                      <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold disabled:opacity-70 disabled:cursor-not-allowed">
                        {saving ? 'Saving…' : 'Save'}
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
