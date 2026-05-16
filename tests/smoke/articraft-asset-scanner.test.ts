import { describe, expect, it } from "vitest";

const scanner = await import("../../scripts/research-articraft-assets.mjs");

describe("Articraft asset scanner", () => {
  it("maps materializable records to physics experiment concepts", () => {
    const manifest = scanner.buildCandidateManifest(
      [
        {
          recordId: "rec_skateboard_b74cde82df474176b7005c584ba8eb13",
          recordPath:
            "/Users/malu/Documents/research/open-source/articraft-main/data/records/rec_skateboard_b74cde82df474176b7005c584ba8eb13",
          categorySlug: "skateboard",
          title: "Skateboard",
          promptPreview: "A skateboard with four visible wheels and trucks.",
        },
        {
          recordId: "rec_dock_loading_ramp_123",
          recordPath:
            "/Users/malu/Documents/research/open-source/articraft-main/data/records/rec_dock_loading_ramp_123",
          categorySlug: "dock_loading_ramp",
          title: "Dock loading ramp",
          promptPreview: "A hinged ramp for loading carts.",
        },
        {
          recordId: "rec_camera_lens_456",
          recordPath:
            "/Users/malu/Documents/research/open-source/articraft-main/data/records/rec_camera_lens_456",
          categorySlug: "camera_lens",
          title: "Camera lens",
          promptPreview: "A stack of glass lens elements.",
        },
      ],
      { sourceRoot: "/Users/malu/Documents/research/open-source/articraft-main" },
    );

    expect(manifest.groups.circular_motion?.[0]).toMatchObject({
      recordId: "rec_skateboard_b74cde82df474176b7005c584ba8eb13",
      concepts: ["circular_motion", "work_energy"],
      runtimeDecision: "candidate",
    });
    expect(manifest.groups.inclined_plane?.[0]?.materializationCommand).toContain(
      "just compile data/records/rec_dock_loading_ramp_123",
    );
    expect(manifest.groups.lens_imaging?.[0]?.whyUseful).toContain("lens");
  });

  it("keeps the strongest experiment candidates before applying group limits", () => {
    const manifest = scanner.buildCandidateManifest(
      [
        {
          recordId: "rec_monitor_with_wheel",
          recordPath: "/tmp/articraft/data/records/rec_monitor_with_wheel",
          categorySlug: "desktop_monitor_with_tilt_swivel_stand",
          title: "Monitor mast and wheel",
          promptPreview: "A monitor stand with one adjustment wheel.",
        },
        {
          recordId: "rec_skateboard_b74cde82df474176b7005c584ba8eb13",
          recordPath:
            "/Users/malu/Documents/research/open-source/articraft-main/data/records/rec_skateboard_b74cde82df474176b7005c584ba8eb13",
          categorySlug: "skateboard",
          title: "Skateboard with standard trucks",
          promptPreview:
            "A deck supports front and rear truck hangers, each holding one axle and two wheels. Each wheel spins continuously.",
        },
      ],
      { perGroupLimit: 1, sourceRoot: "/Users/malu/Documents/research/open-source/articraft-main" },
    );

    expect(manifest.groups.circular_motion?.map((candidate) => candidate.recordId)).toEqual([
      "rec_skateboard_b74cde82df474176b7005c584ba8eb13",
    ]);
  });

  it("keeps circular-motion groups diverse enough to include different wheel rigs", () => {
    const records = [
      "rec_observation_wheel_1",
      "rec_observation_wheel_2",
      "rec_observation_wheel_3",
      "rec_observation_wheel_4",
    ].map((recordId) => ({
      recordId,
      recordPath: `/tmp/articraft/data/records/${recordId}`,
      categorySlug: "observation_wheel",
      title: "Observation wheel",
      promptPreview: "A rotating observation wheel with passenger capsules.",
    }));
    records.push({
      recordId: "rec_skateboard_b74cde82df474176b7005c584ba8eb13",
      recordPath:
        "/Users/malu/Documents/research/open-source/articraft-main/data/records/rec_skateboard_b74cde82df474176b7005c584ba8eb13",
      categorySlug: "skateboard",
      title: "Skateboard with standard trucks",
      promptPreview:
        "A deck supports front and rear truck hangers, each holding one axle and two wheels. Each wheel spins continuously.",
    });

    const manifest = scanner.buildCandidateManifest(records, {
      perCategoryLimit: 3,
      perGroupLimit: 4,
      sourceRoot: "/Users/malu/Documents/research/open-source/articraft-main",
    });

    expect(manifest.groups.circular_motion?.map((candidate) => candidate.categorySlug)).toContain(
      "skateboard",
    );
  });
});
