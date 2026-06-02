import type { ImagePickerAsset } from "expo-image-picker";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type EventType = {
  id: string;
  name: string;
};

export type City = {
  id: string;
  name: string;
  state?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type CostCenter = {
  id: string;
  financeId?: string;
  code: string;
  name: string;
  description: string;
  cityId: string | null;
  cityName: string;
  sortOrder: number;
  isActive: boolean;
  donorCount?: number;
};

export type Donor = {
  id: string;
  email: string;
  name: string;
  costCenterId: string;
  costCenterName: string;
  costCenterCode: string;
  isActive: boolean;
};

export type EventStatus = "upcoming" | "ongoing" | "complete";

export type EventItem = {
  id: string;
  title: string;
  caption: string;
  typeId: string;
  eventDate: string;
  location: string;
  eventStatus: EventStatus;
  approvedForGallery: boolean;
  costCenterId: string | null;
  costCenterCode: string;
  costCenterName: string;
  cityId: string | null;
  cityName: string;
  mediaType: "photo" | "video";
  mediaUrl: string;
  originalName: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  createdAt: string;
  eventTypeName: string;
};

export type CalendarEntry = {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  endDate: string | null;
  location: string;
  costCenterId: string;
  costCenterName: string;
  costCenterCode: string;
  cityId: string | null;
  cityName: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AppRoute = "home" | "notFound";

export type MediaMode = "photo" | "video";

export type SelectedMedia = ImagePickerAsset | null;

export type HubTab = "ongoing" | "upcoming" | "capture" | "calendar";
