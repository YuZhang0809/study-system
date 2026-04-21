export type ArtifactKind = "commit" | "screenshot" | "link";

const SCREENSHOT_EXTENSION = /\.(png|jpe?g|webp|gif)$/u;
const QUERY_OR_FRAGMENT_SUFFIX = /[?#].*$/u;

export function inferArtifactKind(urlOrPath: string): ArtifactKind {
  const normalized = urlOrPath.trim().replaceAll("\\", "/").toLowerCase();
  const withoutQueryOrFragment = normalized.replace(QUERY_OR_FRAGMENT_SUFFIX, "");

  if (normalized.includes("/commit/")) {
    return "commit";
  }

  if (normalized.includes("screenshots/") || SCREENSHOT_EXTENSION.test(withoutQueryOrFragment)) {
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

    it("detects image extensions before query strings and fragments", () => {
      expect(inferArtifactKind("foo.PNG?x=1")).toBe("screenshot");
      expect(inferArtifactKind("https://cdn.example.com/img.jpg#section")).toBe("screenshot");
      expect(inferArtifactKind("https://cdn.example.com/img.jpg?size=full#section")).toBe("screenshot");
    });

    it("keeps commit URLs ahead of query-string stripping", () => {
      expect(inferArtifactKind("https://example.com/commit/abc?debug=1")).toBe("commit");
    });

    it("falls back to link for everything else", () => {
      expect(inferArtifactKind("https://example.test/docs/notes")).toBe("link");
      expect(inferArtifactKind("artifacts/run.log")).toBe("link");
    });
  });
}
