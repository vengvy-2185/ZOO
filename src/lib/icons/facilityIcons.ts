import {
  DoorOpen,
  LogOut,
  Utensils,
  Bath,
  ParkingCircle,
  Cross,
  Gift,
  Armchair,
  Camera,
  Compass,
  type LucideIcon,
} from "lucide-react";

// Icon + colour + label per facility type — used by the map pins, the map
// legend, and the Visit page, so a facility looks the same everywhere.
export const FACILITY_STYLE: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  entrance: { icon: DoorOpen, color: "#16A34A", label: "Entrance" },
  exit: { icon: LogOut, color: "#DC2626", label: "Exit" },
  restaurant: { icon: Utensils, color: "#F59E0B", label: "Restaurant" },
  restroom: { icon: Bath, color: "#3B82F6", label: "Restroom" },
  parking: { icon: ParkingCircle, color: "#475569", label: "Parking" },
  first_aid: { icon: Cross, color: "#EF4444", label: "First Aid" },
  gift_shop: { icon: Gift, color: "#A855F7", label: "Gift Shop" },
  rest_area: { icon: Armchair, color: "#0EA5E9", label: "Rest Area" },
  photo_spot: { icon: Camera, color: "#EC4899", label: "Photo Spot" },
};

export const DEFAULT_FACILITY_STYLE = { icon: Compass, color: "#176B3A", label: "Facility" };

export function facilityStyle(type: string) {
  return FACILITY_STYLE[type] ?? DEFAULT_FACILITY_STYLE;
}
