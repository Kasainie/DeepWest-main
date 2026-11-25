import waiterSound from "../../notifications tones/Waiter.mp3";
import restaurantSound from "../../notifications tones/Restaurant.mp3";
import kitchenSound from "../../notifications tones/Kitchen.wav";

export const notificationSounds = {
  waiter: { label: "Waiter", src: waiterSound },
  restaurant: { label: "Restaurant", src: restaurantSound },
  kitchen: { label: "Kitchen", src: kitchenSound },
} as const;

export function getNotificationSoundForStaff(
  staffRole: string | null,
  staffDepartment: string[] | null,
) {
  const role = staffRole?.trim().toLowerCase();
  if (role === "waiter") return notificationSounds.waiter.src;
  if (
    role === "kitchen" ||
    staffDepartment?.some((department) => department.trim().toLowerCase() === "kitchen")
  ) {
    return notificationSounds.kitchen.src;
  }
  return notificationSounds.restaurant.src;
}
