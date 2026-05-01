import { describe, expect, it } from "vitest";

import type { CreateInputEnvelope } from "../../prompt-contracts/src/input-adapters";
import type { ClientMessage } from "./messages";
import { createEmptyRoomState, type RoomState } from "./room-schema";

describe("room schema", () => {
  it("creates the default empty room state for the MVP", () => {
    expect(createEmptyRoomState("room-1")).toEqual({
      id: "room-1",
      objects: [],
      players: {},
      roomObjectLimit: 10,
      stage: {
        kind: "blank-stage",
      },
    });
  });

  it("supports owned world objects in canonical room state", () => {
    const room: RoomState = {
      id: "room-1",
      objects: [
        {
          id: "object-1",
          ownerId: "player-1",
          kind: "cube",
          position: [0, 1, 2],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      ],
      players: {
        "player-1": {
          id: "player-1",
          objectLimit: 10,
        },
      },
      roomObjectLimit: 10,
      stage: {
        kind: "blank-stage",
      },
    };

    expect(room.objects[0]?.ownerId).toBe("player-1");
  });

  it("uses the shared create payload in the wire create message", () => {
    const payload: CreateInputEnvelope = {
      source: "image",
      prompt: "turn this image into a ramp",
      image: {
        dataUrl: "data:image/png;base64,abc123",
        mimeType: "image/png",
        name: "ramp.png",
      },
    };

    const message: ClientMessage = {
      type: "create",
      payload,
    };

    expect(message).toEqual({
      type: "create",
      payload: {
        source: "image",
        prompt: "turn this image into a ramp",
        image: {
          dataUrl: "data:image/png;base64,abc123",
          mimeType: "image/png",
          name: "ramp.png",
        },
      },
    });
  });
});
