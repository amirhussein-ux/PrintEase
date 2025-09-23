import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineArrowLeft } from 'react-icons/ai';
import PrintEaseLogo from '../../../assets/PrintEase-Logo.png';
import PrintEaseLogoMobile from '../../../assets/PrintEase-logo1.png';
import { useAuth } from "../../../context/AuthContext";

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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset form on user change or cancel
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
    setAvatarFile(file); setError(null);
  };
  const onDeleteAvatar = () => { setAvatarFile(null); setAvatarPreview(null); };
  const handleCancel = () => setIsEditing(false);

  const handleSave = async () => {
    if (!updateUser) return;
    setError(null); setSuccessMsg(null); setSaving(true);
    try {
      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('address', address);
      formData.append('phone', phone);
      if (avatarFile) formData.append('avatar', avatarFile);
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

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-900 via-indigo-900 to-black text-white">
      <header className="w-full bg-white px-6 py-4 flex items-center gap-4 justify-center lg:justify-start">
        <Link to="/" aria-label="Go to landing page">
          <img alt="PrintEase" src={PrintEaseLogoMobile} className="block lg:hidden h-10 w-auto" />
          <img alt="PrintEase" src={PrintEaseLogo} className="hidden lg:block h-10 w-auto" />
        </Link>
      </header>

      <main className="px-6 py-16 lg:px-10">
        <div className="max-w-3xl mx-auto mt-20 relative">
          <button type="button" onClick={() => navigate(backPath)}
            className="absolute -top-12 left-0 flex items-center gap-2 bg-indigo-700 bg-opacity-70 hover:bg-opacity-90 text-white font-semibold text-sm rounded-full px-4 py-2 shadow-md">
            <AiOutlineArrowLeft size={20} /> Back
          </button>

          <div className="border-2 border-white/90 rounded-lg p-6 bg-black">
            <h1 className="text-xl lg:text-2xl uppercase tracking-wider font-medium mb-6" style={{ fontFamily: "'Open Sans', sans-serif" }}>
              My Profile
            </h1>

            <div className="flex flex-col items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div onClick={onAvatarClick} className={`h-24 w-24 rounded-full bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-4xl font-bold text-white select-none cursor-${isEditing ? 'pointer' : 'default'}`}
                  aria-label="Profile avatar"
                  role={isEditing ? 'button' : undefined} tabIndex={isEditing ? 0 : undefined}
                  onKeyDown={e => { if (isEditing && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onAvatarClick(); } }}>
                  {avatarPreview ? <img src={avatarPreview} alt="Preview" className="h-full w-full rounded-full object-cover" /> : initials}
                </div>
                {isEditing && <div onClick={onAvatarClick} className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1 cursor-pointer" title="Change avatar"><AiOutlineEdit className="text-white" size={18} /></div>}
              </div>

              {isEditing && (avatarPreview || avatarFile) && (
                <button type="button" onClick={onDeleteAvatar} className="flex items-center gap-1 text-red-500 hover:text-red-600 text-sm">
                  <AiOutlineDelete /> Delete Avatar
                </button>
              )}

              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={onAvatarChange} />

              {/* Form */}
              <form onSubmit={async e => { e.preventDefault(); await handleSave(); }} className="w-full space-y-4">
                {fields.map(f => (
                  <div key={f.id}>
                    <label htmlFor={f.id} className="block text-xs font-semibold mb-1 text-gray-300">{f.label}</label>
                    <input
                      id={f.id} type={f.type || 'text'} value={f.value} onChange={e => f.setValue(e.target.value)}
                      className={`w-full rounded bg-transparent border px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isEditing ? 'border-white/20' : 'border-transparent cursor-default'}`}
                      placeholder={f.label} readOnly={!isEditing}
                    />
                  </div>
                ))}

                <div>
                  <label htmlFor="address" className="block text-xs font-semibold mb-1 text-gray-300">Address</label>
                  <textarea id="address" value={address} onChange={e => setAddress(e.target.value)}
                    className={`w-full rounded bg-transparent border px-3 py-2 text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none ${isEditing ? 'border-white/20' : 'border-transparent cursor-default'}`}
                    placeholder="Address" rows={3} readOnly={!isEditing} />
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}
                {successMsg && <p className="text-sm text-green-400">{successMsg}</p>}

                <div className="flex justify-end items-center">
                  {!isEditing ? (
                    <button type="button" onClick={() => setIsEditing(true)} className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm">Edit</button>
                  ) : (
                    <div className="flex gap-4">
                      <button type="button" onClick={handleCancel} disabled={saving} className="rounded-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm">Cancel</button>
                      <button type="submit" disabled={saving} className={`rounded-full px-4 py-2 text-sm text-white ${saving ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>{saving ? 'Saving...' : 'Save'}</button>
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
