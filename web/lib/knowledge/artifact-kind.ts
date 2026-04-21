export type ArtifactKind = "commit" | "screenshot" | "link";

const SCREENSHOT_EXTENSION = /\.(png|jpe?g|webp|gif)$/u;

export function inferArtifactKind(urlOrPath: string): ArtifactKind {
  const normalized = urlOrPath.trim().replaceAll("\\", "/").toLowerCase();

  if (normalized.includes("/commit/")) {
    return "commit";
  }

  if (normalized.includes("screenshots/") || SCREENSHOT_EXTENSION.test(normalized)) {
    return "screenshot";
  }

  return "link";
}

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("inferArtifactKind", () => {
    it("detects commit URLs", () => {
      expect(inferArtifactKind("https://github.com/acme/repo/commit/abc123")).toBe("commit");
    });

    it("detects screenshot paths in screenshots folders", () => {
      expect(inferArtifactKind("screenshots/2026-04-22/capture.txt")).toBe("screenshot");
    });

    it("detects image extensions case-insensitively", () => {
      expect(inferArtifactKind("C:\\captures\\ui\\shot.PNG")).toBe("screenshot");
      expect(inferArtifactKind("https://example.test/image.webp")).toBe("screenshot");
    });

    it("falls back to link for everything else", () => {
      expect(inferArtifactKind("https://example.test/docs/notes")).toBe("link");
      expect(inferArtifactKind("artifacts/run.log")).toBe("link");
    });
  });
}
