import { describe, expect, test } from "vitest";

import { createExperimentObjectRegistry } from "./object-registry";

describe("createExperimentObjectRegistry", () => {
  test("registers, reads, and clears semantic object roles", () => {
    const registry = createExperimentObjectRegistry<object>();
    const moving = {};
    const path = {};

    registry.register("moving-object", moving);
    registry.register("path", path);

    expect(registry.get("moving-object")).toBe(moving);
    expect(registry.get("path")).toBe(path);
    expect(registry.roles()).toEqual(["moving-object", "path"]);

    registry.unregister("moving-object", moving);

    expect(registry.get("moving-object")).toBeNull();
    expect(registry.roles()).toEqual(["path"]);

    registry.clear();

    expect(registry.roles()).toEqual([]);
  });

  test("does not unregister a newer object for the same role", () => {
    const registry = createExperimentObjectRegistry<object>();
    const oldObject = {};
    const newObject = {};

    registry.register("moving-object", oldObject);
    registry.register("moving-object", newObject);
    registry.unregister("moving-object", oldObject);

    expect(registry.get("moving-object")).toBe(newObject);
  });
});
