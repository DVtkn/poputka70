import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "/api";

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Ошибка запроса" }));
    throw new Error(error.message || "Ошибка запроса");
  }
  return res.json();
}

// ========================================
// CITY POINTS
// ========================================

export interface CityPoint {
  id: string;
  name: string;
  type: string;
  category?: string;
  lat: number;
  lng: number;
}

export function useCityPoints(params?: { type?: string; category?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.category) searchParams.set("category", params.category);
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
  
  return useQuery<{ success: boolean; points: CityPoint[] }>({
    queryKey: ["city-points", params],
    queryFn: () => fetcher(`/city-points${query}`),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function usePopularCityPoints() {
  return useCityPoints({ category: "stop" });
}

// ========================================
// ROUTES / TRIPS
// ========================================

export interface Route {
  id: string;
  from: string;
  to: string;
  time: string;
  price: number;
  seats: number;
  days: string;
  driver: {
    id: string;
    name: string;
    car: string;
    carColor: string;
    verified: boolean;
    ratingAsDriver: number;
  };
  nextTrips: Array<{
    id: string;
    date: string;
    departureTime: string;
    status: string;
    availableSeats: number;
    totalSeats: number;
  }>;
}

export interface SearchParams {
  fromCity?: string;
  toCity?: string;
  date?: string;
  passengers?: number;
}

export function useRoutes(searchParams?: SearchParams) {
  const params = new URLSearchParams();
  if (searchParams?.fromCity) params.set("fromCity", searchParams.fromCity);
  if (searchParams?.toCity) params.set("toCity", searchParams.toCity);
  if (searchParams?.date) params.set("dateFrom", searchParams.date);
  if (searchParams?.passengers && searchParams.passengers > 1) params.set("passengers", String(searchParams.passengers));
  
  return useQuery<{ success: boolean; routes: Route[]; count: number }>({
    queryKey: ["routes", searchParams],
    queryFn: () => fetcher(`/routes?${params.toString()}`),
    enabled: !!(searchParams?.fromCity && searchParams?.toCity),
    staleTime: 1000 * 30, // 30 seconds for search results
  });
}

export function useRoute(id: string) {
  return useQuery<{ success: boolean; route: Route }>({
    queryKey: ["route", id],
    queryFn: () => fetcher(`/routes/${id}`),
    enabled: !!id,
  });
}

export function useMyRoutes() {
  return useQuery<{ success: boolean; routes: Route[] }>({
    queryKey: ["my-routes"],
    queryFn: () => fetcher("/routes/my"),
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { originId: string; destId: string; departureTime: string; daysOfWeek: number[]; seats: number; price: number }) =>
      fetcher("/routes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-routes"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Route> }) =>
      fetcher(`/routes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-routes"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}

export function useDeleteRoute() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => fetcher(`/routes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-routes"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}

// ========================================
// BOOKINGS
// ========================================

export interface Booking {
  id: string;
  tripId: string;
  passengerId: string;
  seatsCount: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  trip: Route;
}

export function useMyBookings() {
  return useQuery<{ success: boolean; bookings: Booking[] }>({
    queryKey: ["my-bookings"],
    queryFn: () => fetcher("/bookings/my"),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { tripId: string; seatsCount: number }) =>
      fetcher("/bookings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => fetcher(`/bookings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });
}

// ========================================
// PROFILE
// ========================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  role: "PASSENGER" | "DRIVER" | "BOTH";
  rating: number;
  reviewsCount: number;
  isVerified: boolean;
  createdAt: string;
}

export function useProfile(userId?: string) {
  return useQuery<{ success: boolean; user: User }>({
    queryKey: ["profile", userId],
    queryFn: () => fetcher(userId ? `/users/${userId}` : "/auth/me"),
    enabled: !!userId || true,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<User>) => fetcher("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// ========================================
// AUTH
// ========================================

export function useLogin() {
  return useMutation({
    mutationFn: (data: { login: string; password: string }) =>
      fetcher("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: { login: string; password: string; firstName: string; lastName?: string }) =>
      fetcher("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => fetcher("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// ========================================
// NOTIFICATIONS
// ========================================

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  return useQuery<{ success: boolean; notifications: Notification[] }>({
    queryKey: ["notifications"],
    queryFn: () => fetcher("/notifications"),
  });
}

// ========================================
// DRIVER
// ========================================

export interface DriverProfile {
  id: string;
  carModel: string;
  carColor: string;
  carNumber: string;
  licenseNumber: string;
  totalRides: number;
}

export function useDriverProfile() {
  return useQuery<{ success: boolean; profile: DriverProfile }>({
    queryKey: ["driver-profile"],
    queryFn: () => fetcher("/driver/profile"),
  });
}

export function useRegisterDriver() {
  return useMutation({
    mutationFn: (data: { carModel: string; carColor: string; carNumber: string; licenseNumber: string }) =>
      fetcher("/driver/register", { method: "POST", body: JSON.stringify(data) }),
  });
}

// ========================================
// DEMAND REQUESTS
// ========================================

export interface DemandRequest {
  id: string;
  fromCity: string;
  toCity: string;
  departureAt: string;
  passengers: number;
  priceLimit?: number;
  status: string;
  createdAt: string;
}

export function useDemandRequests() {
  return useQuery<{ success: boolean; requests: DemandRequest[] }>({
    queryKey: ["demand-requests"],
    queryFn: () => fetcher("/demand-requests"),
  });
}

export function useCreateDemandRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { fromCity: string; toCity: string; departureAt: string; passengers: number; priceLimit?: number }) =>
      fetcher("/demand-requests", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demand-requests"] });
    },
  });
}

// ========================================
// MESSAGES
// ========================================

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  tripId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export function useMessages(otherUserId: string, tripId?: string) {
  const params = new URLSearchParams();
  params.set("userId", otherUserId);
  if (tripId) params.set("tripId", tripId);
  
  return useQuery<{ success: boolean; messages: Message[] }>({
    queryKey: ["messages", otherUserId, tripId],
    queryFn: () => fetcher(`/messages?${params.toString()}`),
    enabled: !!otherUserId,
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: (data: { receiverId: string; tripId?: string; content: string }) =>
      fetcher("/messages", { method: "POST", body: JSON.stringify(data) }),
  });
}

// ========================================
// REVIEWS
// ========================================

export interface Review {
  id: string;
  bookingId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export function useCreateReview() {
  return useMutation({
    mutationFn: (data: { bookingId: string; rating: number; comment?: string }) =>
      fetcher("/reviews", { method: "POST", body: JSON.stringify(data) }),
  });
}