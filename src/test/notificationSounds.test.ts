import { describe, expect, it } from "vitest";
import { getNotificationSoundForStaff, notificationSounds } from "@/lib/notificationSounds";

describe("notification sounds", () => {
  it("uses the waiter tone for waiter staff", () => {
    expect(getNotificationSoundForStaff("Waiter", ["restaurant"])).toBe(notificationSounds.waiter.src);
  });

  it("uses the kitchen tone for kitchen staff", () => {
    expect(getNotificationSoundForStaff("staff", ["KITCHEN"])).toBe(notificationSounds.kitchen.src);
  });

  it("uses the restaurant tone for other staff", () => {
    expect(getNotificationSoundForStaff("manager", ["restaurant"])).toBe(notificationSounds.restaurant.src);
  });
});
