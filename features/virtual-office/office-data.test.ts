import { describe, expect, it } from "vitest";
import { getOfficeRoomAt, OFFICE_ROOMS } from "./office-data";

describe("office rooms", () => {
  it("places every room destination inside that room", () => {
    for (const room of OFFICE_ROOMS) {
      expect(getOfficeRoomAt(room.destination.x, room.destination.z)?.id).toBe(room.id);
    }
  });

  it("maps representative office locations to named rooms", () => {
    expect(getOfficeRoomAt(-6, -4)?.id).toBe("boardroom");
    expect(getOfficeRoomAt(6, -4)?.id).toBe("team-studio");
    expect(getOfficeRoomAt(0, 3)?.id).toBe("atrium");
    expect(getOfficeRoomAt(0, 9)?.id).toBe("terrace");
  });
});
