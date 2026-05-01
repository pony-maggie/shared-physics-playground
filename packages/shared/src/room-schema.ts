import type { WorldObject } from "../../physics-schema/src/world-object";

export type RoomPlayerState = {
  id: string;
  objectLimit: number;
};

export type RoomStage = {
  kind: "blank-stage";
};

export type RoomState = {
  id: string;
  objects: WorldObject[];
  players: Record<string, RoomPlayerState>;
  roomObjectLimit: number;
  stage: RoomStage;
};

export function createEmptyRoomState(id: string): RoomState {
  return {
    id,
    objects: [],
    players: {},
    roomObjectLimit: 10,
    stage: {
      kind: "blank-stage",
    },
  };
}
