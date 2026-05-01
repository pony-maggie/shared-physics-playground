import type { CreateInputEnvelope } from "../../prompt-contracts/src/input-adapters";
import type { RoomState } from "./room-schema";

export type ClientMessage =
  | {
      type: "create";
      payload: CreateInputEnvelope;
    }
  | {
      type: "room-state:subscribe";
      roomId: string;
    };

export type ServerMessage =
  | {
      type: "room-created";
      room: RoomState;
    }
  | {
      type: "room-state";
      room: RoomState;
    };
