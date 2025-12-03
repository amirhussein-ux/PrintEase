import React, { Fragment, useEffect, useRef, useState } from "react";
import { Transition } from "@headlessui/react";
import { BellIcon, TrashIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { GoSidebarCollapse, GoSidebarExpand } from "react-icons/go";
import { useSidebar } from "../../../components/ui/sidebar";
import logoDark from "/src/assets/PrintEase-logo-dark.png";
import logoLight from "/src/assets/PrintEase-logo-light.png";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";
import { useSocket } from "../../../context/SocketContext";

interface DashboardHeaderProps {
	role: "owner" | "customer";
	isDarkMode: boolean;
}

interface Notification {
	_id: string;
	title: string;
	description?: string;
	read: boolean;
	createdAt: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ role, isDarkMode }) => {
	const { user, token } = useAuth();
	const navigate = useNavigate();
	const { socket } = useSocket() as { socket: Socket | null };
	const { state: sidebarState, toggleSidebar } = useSidebar();
	const notifRef = useRef<HTMLDivElement>(null);
	const [notificationsOpen, setNotificationsOpen] = useState(false);
	const [notifications, setNotifications] = useState<Notification[]>([]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (notificationsOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) {
				setNotificationsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [notificationsOpen]);

	useEffect(() => {
		if (!user || !token) return;
		axios
			.get("http://localhost:8000/api/notifications", { headers: { Authorization: `Bearer ${token}` } })
			.then((res) => setNotifications(Array.isArray(res.data) ? res.data : []))
			.catch(() => setNotifications([]));
	}, [user, token]);

	useEffect(() => {
		if (!socket || !user) return;
		const handleNewNotification = (data: Notification) => setNotifications((prev) => [data, ...prev]);
		socket.on("newNotification", handleNewNotification);
		return () => {
			socket.off("newNotification", handleNewNotification);
		};
	}, [socket, user]);

	const toggleNotifications = () => setNotificationsOpen((prev) => !prev);

	const unreadCount = notifications.filter((n) => !n.read).length;
	const isSidebarCollapsed = sidebarState === "collapsed";
	const headerThemeClasses = isDarkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900";
	const iconColorClasses = isDarkMode ? "text-white" : "text-gray-900";
	const interactiveThemeClasses = isDarkMode
		? "bg-gray-800 hover:bg-gray-700"
		: "bg-neutral-200 hover:bg-blue-100/60";
	const iconButtonBaseClasses =
		"inline-flex items-center justify-center p-3 rounded-lg transition-all duration-300 ease-out transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
	const sidebarToggleThemeClasses = isDarkMode
		? "hover:bg-gray-800 hover:text-white/90 hover:border-gray-500 focus-visible:ring-white/70 focus-visible:ring-offset-gray-900"
		: "hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-blue-500 focus-visible:ring-offset-white";
	const logoSrc = isDarkMode ? logoLight : logoDark;

	if (!user) return null;

	return (
		<header className={`sticky top-0 z-20 flex h-16 items-center justify-between border-b px-4 sm:px-6 relative ${headerThemeClasses}`}>
			<div className="flex items-center gap-3">
				<button
					type="button"
					title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					aria-pressed={!isSidebarCollapsed}
					onClick={toggleSidebar}
					className={`hidden lg:inline-flex ${iconButtonBaseClasses} ${sidebarToggleThemeClasses} ${iconColorClasses}`}
				>
					<span
						data-state={isSidebarCollapsed ? "collapsed" : "expanded"}
						className={`text-2xl transition-transform duration-300 ease-out ${iconColorClasses}`}
					>
						{isSidebarCollapsed ? (
							<GoSidebarExpand className={`transition-transform duration-300 ${iconColorClasses}`} />
						) : (
							<GoSidebarCollapse className={`transition-transform duration-300 ${iconColorClasses}`} />
						)}
					</span>
				</button>
				<div className="hidden sm:flex items-center gap-3">
					<img src={logoSrc} alt="PrintEase Logo" className="h-10 w-auto" />
				</div>
			</div>

			<div className="flex items-center gap-4 relative">
				<div ref={notifRef} className="relative">
					<button
						title="Notifications"
						className={`${iconButtonBaseClasses} ${interactiveThemeClasses} ${iconColorClasses} cursor-pointer relative group`}
						onClick={toggleNotifications}
					>
						<BellIcon className={`h-6 w-6 transition-transform duration-300 group-hover:scale-110 ${iconColorClasses}`} />
						{unreadCount > 0 && (
							<span className={`absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500 animate-pulse ${isDarkMode ? "ring-2 ring-black" : "ring-2 ring-white"}`} />
						)}
					</button>
					<Transition
						show={notificationsOpen}
						as={Fragment}
						enter="transition ease-out duration-300"
						enterFrom="opacity-0 scale-95 -translate-y-2"
						enterTo="opacity-100 scale-100 translate-y-0"
						leave="transition ease-in duration-200"
						leaveFrom="opacity-100 scale-100 translate-y-0"
						leaveTo="opacity-0 scale-95 -translate-y-2"
					>
						<div className="absolute right-0 mt-3 w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 py-3 max-h-96 overflow-y-auto">
							<div className="px-4 pb-2 border-b border-gray-100">
								<h3 className="text-lg font-bold text-gray-900">Notifications</h3>
								<p className="text-sm text-gray-600">{unreadCount} unread</p>
							</div>

							{notifications.length === 0 ? (
								<div className="px-4 py-8 text-center">
									<BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
									<p className="text-sm text-gray-600">No notifications yet</p>
								</div>
							) : (
								<>
									<div className="flex justify-between items-center px-4 py-3 bg-gray-50/50">
										<button
											className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-all duration-300 ease-out transform hover:scale-105"
											onClick={async () => {
												if (!token) return;
												try {
													await axios.put(
														"http://localhost:8000/api/notifications/read-all",
														{},
														{ headers: { Authorization: `Bearer ${token}` } }
													);
													setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
												} catch (error) {
													console.error("Failed to mark notifications as read", error);
												}
											}}
										>
											Mark all as read
										</button>
										<button
											className="text-red-600 text-sm font-medium hover:text-red-700 transition-all duration-300 ease-out transform hover:scale-105 flex items-center gap-1"
											onClick={async () => {
												if (!token) return;
												try {
													await axios.delete("http://localhost:8000/api/notifications/delete-all", {
														headers: { Authorization: `Bearer ${token}` },
													});
													setNotifications([]);
												} catch (error) {
													console.error("Failed to delete all notifications", error);
												}
											}}
										>
											<TrashIcon className="h-4 w-4" />
											Clear all
										</button>
									</div>

									<div className="space-y-1 px-2">
										{notifications.map((n) => (
											<div
												key={n._id}
												className={`group flex items-start justify-between p-3 rounded-xl transition-all duration-300 ease-out cursor-pointer ${
													n.read
														? "text-gray-700 hover:bg-gray-100/80"
														: "font-semibold text-gray-900 bg-blue-50/80 hover:bg-blue-100/80"
												} hover:scale-[1.02] hover:shadow-sm`}
												onClick={async () => {
													if (!token) return;
													try {
														if (!n.read) {
															await axios.put(
																`http://localhost:8000/api/notifications/${n._id}/read`,
																{},
																{ headers: { Authorization: `Bearer ${token}` } }
															);
															setNotifications((prev) => prev.map((notif) => (notif._id === n._id ? { ...notif, read: true } : notif)));
														}
														navigate(role === "owner" ? "/dashboard/orders" : "/dashboard/my-orders");
														setNotificationsOpen(false);
													} catch (error) {
														console.error("Failed to handle notification selection", error);
													}
												}}
											>
												<div className="flex-1 min-w-0">
													<p className="text-sm leading-tight truncate">{n.title}</p>
													{n.description && <p className="text-gray-600 text-xs mt-1 line-clamp-2">{n.description}</p>}
													<p className="text-gray-400 text-xs mt-2">{new Date(n.createdAt).toLocaleDateString()}</p>
												</div>

												<button
													onClick={async (e) => {
														e.stopPropagation();
														if (!token) return;
														try {
															await axios.delete(`http://localhost:8000/api/notifications/${n._id}`, {
																headers: { Authorization: `Bearer ${token}` },
															});
															setNotifications((prev) => prev.filter((notif) => notif._id !== n._id));
														} catch (error) {
															console.error("Failed to delete notification", error);
														}
													}}
													className="ml-2 p-2 rounded-lg text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform hover:scale-110"
													title="Delete notification"
												>
													<TrashIcon className="h-4 w-4" />
												</button>
											</div>
										))}
									</div>
								</>
							)}
						</div>
					</Transition>
				</div>
			</div>
		</header>
	);
};

export default DashboardHeader;
