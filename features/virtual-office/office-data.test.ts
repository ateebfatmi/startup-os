import { describe, expect, it } from "vitest";
import { getOfficeRoomAt, OFFICE_ROOMS } from "./office-data";

describe("office rooms", () => {
  it("places every room destination inside that room", () => {
    for (const room of OFFICE_ROOMS) {
      expect(getOfficeRoomAt(room.destination.x, room.destination.z)?.id).toBe(room.id);
    }
  });

  it("maps representative office locations to named rooms", () => {
    expect(getOfficeRoomAt(-7.5, -4.5)?.id).toBe("conference-room");
    expect(getOfficeRoomAt(-1.5, -4.5)?.id).toBe("founder-cabin");
    expect(getOfficeRoomAt(2.5, -4.5)?.id).toBe("manager-cabin");
    expect(getOfficeRoomAt(6.5, -4.5)?.id).toBe("pantry");
    expect(getOfficeRoomAt(9.8, -4.5)?.id).toBe("washrooms");
    expect(getOfficeRoomAt(0, 0)?.id).toBe("workstations");
    expect(getOfficeRoomAt(-7.0, 0)?.id).toBe("collaboration");
    expect(getOfficeRoomAt(7.5, 0.2)?.id).toBe("project-room");
    expect(getOfficeRoomAt(-8.5, 5.5)?.id).toBe("server-room");
    expect(getOfficeRoomAt(-5.0, 5.5)?.id).toBe("storage-utility");
    expect(getOfficeRoomAt(0, 5.0)?.id).toBe("reception");
    expect(getOfficeRoomAt(7.5, 6.0)?.id).toBe("waiting-area");
  });
});
