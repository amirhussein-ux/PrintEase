
import React, { useRef, useState } from "react";
import DashboardLayout from "../shared_components/DashboardLayout";

const initialUser = {
	storeName: "PrintEase Main Branch",
	email: "amir@example.com",
	contact: "+63 912 345 6789",
	address: "123 Main St",
	city: "Quezon City",
	region: "NCR",
	province: "Metro Manila",
	postalCode: "1100",
	tin: "000-123-456-001",
	birCert: "",
	avatar: "https://ui-avatars.com/api/?name=Amir+Hussein&background=1e3a8a&color=fff&size=128",
};


const UserProfile: React.FC = () => {
	const [user, setUser] = useState(initialUser);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleAvatarClick = () => {
		if (fileInputRef.current) fileInputRef.current.click();
	};

	const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				setUser(u => ({ ...u, avatar: reader.result as string }));
			};
			reader.readAsDataURL(file);
		}
	};

	return (
		<DashboardLayout role="owner">
			<div className="min-h-screen flex items-center justify-center p-0">
				<div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-0 md:gap-8 items-stretch">
					{/* Left Form Section */}
					<div className="flex-1 py-12 px-8">
						<form className="space-y-6">
							<div>
								<label className="block text-xs font-bold text-gray-900 mb-1 tracking-wide">STORE NAME</label>
								<input type="text" value={user.storeName} disabled className="w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-700 font-semibold" />
							</div>
							<div>
								<label className="block text-xs font-bold text-gray-900 mb-1 tracking-wide">EMAIL</label>
								<input type="email" value={user.email} disabled className="w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-700 italic" />
							</div>
							<div>
								<label className="block text-xs font-bold text-gray-900 mb-1 tracking-wide">CONTACT</label>
								<input type="text" value={user.contact} disabled className="w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-700" />
							</div>
							<div>
								<label className="block text-xs font-bold text-gray-900 mb-1 tracking-wide">ADDRESS</label>
								<input type="text" value={user.address} disabled className="w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-700" />
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-xs font-bold text-gray-900 mb-1 tracking-wide">CITY</label>
									<input type="text" value={user.city} disabled className="w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-700" />
								</div>
								<div>
									<label className="block text-xs font-bold text-gray-900 mb-1 tracking-wide">REGION</label>
									<input type="text" value={user.region} disabled className="w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-700" />
								</div>
								<div>
									<label className="block text-xs font-bold text-gray-900 mb-1 tracking-wide">PROVINCE</label>
									<input type="text" value={user.province} disabled className="w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-700" />
								</div>
								<div>
									<label className="block text-xs font-bold text-gray-900 mb-1 tracking-wide">POSTAL CODE</label>
									<input type="text" value={user.postalCode} disabled className="w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-700" />
								</div>
							</div>
							<div className="grid grid-cols-2 gap-4 mt-2">
								<div>
									<label className="block text-xs font-bold text-gray-900 mb-1 tracking-wide">TAXPAYER IDENTIFICATION NUMBER</label>
									<input type="text" value={user.tin} disabled className="w-full rounded-lg bg-gray-200 px-4 py-2 text-gray-700 italic" />
								</div>
								<div>
									<label className="block text-xs font-bold text-gray-900 mb-1 tracking-wide">BIR CERTIFICATE OF REGISTRATION</label>
									<div className="w-full h-20 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 text-xs">Upload or View Certificate</div>
								</div>
							</div>
						</form>
					</div>
					{/* Right Avatar Section */}
					<div className="flex flex-col items-center justify-center py-12 px-8 min-w-[180px]">
						<div className="relative">
							<div className="w-36 h-36 rounded-full bg-[#23244a] flex items-center justify-center cursor-pointer" onClick={handleAvatarClick}>
								<img src={user.avatar} alt="User Avatar" className="w-24 h-24 rounded-full object-cover" />
							</div>
							<input
								type="file"
								accept="image/*"
								ref={fileInputRef}
								style={{ display: "none" }}
								onChange={handleAvatarChange}
							/>
							<button type="button" className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md" onClick={handleAvatarClick}>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-[#23244a]">
									<path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L7.5 19.789l-4 1 1-4L16.862 4.487z" />
								</svg>
							</button>
						</div>
						<div className="mt-2 text-xs text-gray-500 text-center">Click to upload photo</div>
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
};

export default UserProfile;
