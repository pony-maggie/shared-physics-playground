import type { ObjectKind } from "./catalog";

export type Vector3 = [number, number, number];

export type WorldObject = {
  id: string;
  ownerId: string;
  kind: ObjectKind;
  displayName?: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
};
