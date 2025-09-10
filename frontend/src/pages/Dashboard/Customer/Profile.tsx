import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AiOutlineEdit, AiOutlineDelete } from 'react-icons/ai';
import PrintEaseLogo from '../../../assets/PrintEase-Logo.png';
import PrintEaseLogoMobile from '../../../assets/PrintEase-logo1.png';
import { useAuth } from '../../../context/useAuth';

export default function Profile() {
  const { user, updateUser  } = useAuth();
  const navigate = useNavigate();

  // Editable fields
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [address, setAddress] = useState(user?.address || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // Avatar image state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);

  // Save/Delete state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // File input ref for avatar upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form when user changes or edit mode toggled off
  useEffect(() => {
    if (!isEditing) {
      setFirstName(user?.firstName || '');
      setLastName(user?.lastName || '');
      setAddress(user?.address || '');
      setPhone(user?.phone || '');
      setAvatarFile(null);
      setAvatarPreview(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [user, isEditing]);

  // Create preview URL when avatarFile changes
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [avatarFile]);

  // Handle avatar icon click (open file picker)
  const onAvatarClick = () => {
    if (!isEditing) return;
    fileInputRef.current?.click();
  };

  // Handle avatar file selection
  const onAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    setAvatarFile(file);
    setError(null);
  };

  // Delete avatar (reset to initials)
  const onDeleteAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  // Save profile changes
  const handleSave = async () => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      // Prepare form data if avatarFile exists
      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('address', address);
      formData.append('phone', phone);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else {
        // If avatar deleted, send empty or special flag if your API supports it
        formData.append('avatar', '');
      }

      // Assuming updateUser  accepts FormData or adapt accordingly
      await updateUser (formData);

      setSuccessMsg('Profile updated successfully.');
      setIsEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
  };

  // Compute initials fallback
  const initials = `${(firstName[0] || 'C').toUpperCase()}${(lastName[0] || 'C').toUpperCase()}`;

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
        <div className="max-w-3xl mx-auto mt-20">
          <div className="border-2 border-white/90 rounded-lg p-6 bg-black">
            <h1
              className="text-xl lg:text-2xl uppercase tracking-wider font-medium mb-6"
              style={{ fontFamily: "'Open Sans', sans-serif" }}
            >
              My Profile
            </h1>

            <div className="flex flex-col items-center gap-6">
              {/* Avatar with edit overlay */}
              <div className="relative">
                <div
                  onClick={onAvatarClick}
                  className={`h-24 w-24 rounded-full bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white select-none cursor-${isEditing ? 'pointer' : 'default'}`}
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
                  ) : (
                    initials
                  )}
                </div>

                {/* Pencil icon overlay in edit mode */}
                {isEditing && (
                  <div
                    onClick={onAvatarClick}
                    className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1 cursor-pointer"
                    title="Change avatar"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onAvatarClick();
                      }
                    }}
                  >
                    <AiOutlineEdit className="text-white" size={18} />
                  </div>
                )}
              </div>

              {/* Delete avatar button */}
              {isEditing && (avatarPreview || avatarFile) && (
                <button
                  type="button"
                  onClick={onDeleteAvatar}
                  className="flex items-center gap-1 text-red-500 hover:text-red-600 text-sm"
                >
                  <AiOutlineDelete />
                  Delete Avatar
                </button>
              )}

              {/* Hidden file input */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={onAvatarChange}
              />

              {/* Profile details form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await handleSave();
                }}
                className="w-full space-y-4"
              >
                {/* First Name */}
                <div>
                  <label htmlFor="firstName" className="block text-xs font-semibold mb-1 text-gray-300">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={`w-full rounded bg-transparent border px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isEditing ? 'border-white/20' : 'border-transparent cursor-default'
                    }`}
                    placeholder="First Name"
                    autoComplete="given-name"
                    readOnly={!isEditing}
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label htmlFor="lastName" className="block text-xs font-semibold mb-1 text-gray-300">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={`w-full rounded bg-transparent border px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isEditing ? 'border-white/20' : 'border-transparent cursor-default'
                    }`}
                    placeholder="Last Name"
                    autoComplete="family-name"
                    readOnly={!isEditing}
                  />
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="address" className="block text-xs font-semibold mb-1 text-gray-300">
                    Address
                  </label>
                  <textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`w-full rounded bg-transparent border px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none ${
                      isEditing ? 'border-white/20' : 'border-transparent cursor-default'
                    }`}
                    placeholder="Address"
                    rows={3}
                    readOnly={!isEditing}
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone" className="block text-xs font-semibold mb-1 text-gray-300">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full rounded bg-transparent border px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      isEditing ? 'border-white/20' : 'border-transparent cursor-default'
                    }`}
                    placeholder="Phone Number"
                    autoComplete="tel"
                    readOnly={!isEditing}
                  />
                </div>

                {/* Error and success messages */}
                {error && <p className="text-sm text-red-400">{error}</p>}
                {successMsg && <p className="text-sm text-green-400">{successMsg}</p>}

                {/* Buttons */}
                <div className="flex justify-end items-center">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
                    >
                      Edit
                    </button>
                  )}

                  {isEditing && (
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="rounded-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className={`rounded-full px-4 py-2 text-sm text-white ${
                          saving ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}