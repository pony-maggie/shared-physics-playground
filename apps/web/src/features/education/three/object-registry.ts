import type { ExperimentObjectRole } from "./types";

export type ExperimentObjectRegistry<TObject> = {
  register: (role: ExperimentObjectRole, object: TObject) => void;
  unregister: (role: ExperimentObjectRole, object: TObject) => void;
  get: (role: ExperimentObjectRole) => TObject | null;
  roles: () => ExperimentObjectRole[];
  clear: () => void;
};

export function createExperimentObjectRegistry<TObject>(): ExperimentObjectRegistry<TObject> {
  const objects = new Map<ExperimentObjectRole, TObject>();

  return {
    clear() {
      objects.clear();
    },
    get(role) {
      return objects.get(role) ?? null;
    },
    register(role, object) {
      objects.set(role, object);
    },
    roles() {
      return Array.from(objects.keys());
    },
    unregister(role, object) {
      if (objects.get(role) === object) {
        objects.delete(role);
      }
    },
  };
}
