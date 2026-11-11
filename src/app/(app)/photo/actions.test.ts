import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PHOTO_UNREADABLE } from "@/components/messages";
import { requireOwnerSettings } from "@/server/settings";
import { createSessionClient, type SessionClient } from "@/server/supabase";
import { type FakeResult, fakeSupabase as fake } from "@/test-support/fake-supabase";
import { savePhoto } from "./actions";

vi.mock("@/server/settings", () => ({ requireOwnerSettings: vi.fn() }));
vi.mock("@/server/supabase", () => ({ createSessionClient: vi.fn() }));

const NOW = new Date("2026-11-08T07:30:00Z");
const DAY = "2026-11-07";
const JPEG_START = [0xff, 0xd8, 0xff, 0xe0];
const NEW_PHOTO_PATH = /^2026-11-07\/[0-9a-f-]{36}\.jpg$/;

function file(name: string, start: number[] = JPEG_START, size = 16) {
  const bytes = new Uint8Array(size);
  bytes.set(start);
  return new File([bytes], name, { type: "image/jpeg" });
}

function photoForm(photo: File | string, thumb: File | string, pose = "front") {
  const form = new FormData();
  form.append("photo", photo);
  form.append("thumb", thumb);
  form.append("pose", pose);
  return form;
}

function fakeSupabase(results: Record<string, FakeResult[]>) {
  const { client, calls } = fake(results);
  vi.mocked(createSessionClient).mockResolvedValue(client as unknown as SessionClient);
  return calls;
}

function uploadedPaths(calls: unknown[][]) {
  const [photoPath, thumbPath] = calls.filter(([method]) => method === "upload").map(([, path]) => path);
  return { photoPath: String(photoPath), thumbPath: String(thumbPath) };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.mocked(requireOwnerSettings).mockResolvedValue({
    unit: "lb",
    time_zone: "America/New_York",
    rollover_hour: 4,
    rest_rule: "six_of_seven",
    start_date: "2026-11-01",
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("savePhoto", () => {
  it("stores the photo and its thumbnail under the owner's training day", async () => {
    const photo = file("photo.jpg");
    const thumb = file("thumb.jpg");
    const calls = fakeSupabase({});

    expect(await savePhoto(photoForm(photo, thumb))).toBeNull();

    const { photoPath, thumbPath } = uploadedPaths(calls);
    expect(photoPath).toMatch(NEW_PHOTO_PATH);
    expect(thumbPath).toBe(photoPath.replace(".jpg", "-thumb.jpg"));
    expect(calls).toEqual([
      ["from", "photos"],
      ["select", "storage_path, thumb_path"],
      ["eq", "day", DAY],
      ["eq", "pose", "front"],
      ["maybeSingle"],
      ["storage", "photos"],
      ["upload", photoPath, photo, { contentType: "image/jpeg" }],
      ["upload", thumbPath, thumb, { contentType: "image/jpeg" }],
      ["from", "photos"],
      [
        "upsert",
        { day: DAY, pose: "front", storage_path: photoPath, thumb_path: thumbPath, taken_at: NOW.toISOString() },
      ],
    ]);
    const uploads = calls.filter(([method]) => method === "upload");
    expect(uploads[0][2]).toBe(photo);
    expect(uploads[1][2]).toBe(thumb);
  });

  it("removes the day's earlier photo once the retake is saved", async () => {
    const calls = fakeSupabase({
      photos: [{ data: { storage_path: `${DAY}/old.jpg`, thumb_path: `${DAY}/old-thumb.jpg` }, error: null }],
    });

    expect(await savePhoto(photoForm(file("photo.jpg"), file("thumb.jpg")))).toBeNull();

    expect(calls.slice(-2)).toEqual([
      ["upsert", expect.objectContaining({ day: DAY })],
      ["remove", [`${DAY}/old.jpg`, `${DAY}/old-thumb.jpg`]],
    ]);
  });

  it("replaces only the day's photo of the same pose", async () => {
    const calls = fakeSupabase({
      photos: [{ data: { storage_path: `${DAY}/old-back.jpg`, thumb_path: `${DAY}/old-back-thumb.jpg` }, error: null }],
    });

    expect(await savePhoto(photoForm(file("photo.jpg"), file("thumb.jpg"), "back"))).toBeNull();

    expect(calls.slice(2, 4)).toEqual([
      ["eq", "day", DAY],
      ["eq", "pose", "back"],
    ]);
    expect(calls.slice(-2)).toEqual([
      ["upsert", expect.objectContaining({ day: DAY, pose: "back" })],
      ["remove", [`${DAY}/old-back.jpg`, `${DAY}/old-back-thumb.jpg`]],
    ]);
  });

  it.each([["side"], [""]])("refuses a pose it doesn't know: %j", async (pose) => {
    const calls = fakeSupabase({});

    await expect(savePhoto(photoForm(file("photo.jpg"), file("thumb.jpg"), pose))).rejects.toThrow();
    expect(calls).toEqual([]);
  });

  it.each([
    ["the thumbnail is missing", file("photo.jpg"), "not a file"],
    ["the photo isn't a JPEG", file("photo.png", [0x89, 0x50, 0x4e, 0x47]), file("thumb.jpg")],
    ["the thumbnail is empty", file("photo.jpg"), new File([], "thumb.jpg")],
    ["the photo is over 3 MB", file("photo.jpg", JPEG_START, 3 * 1024 * 1024 + 1), file("thumb.jpg")],
    ["the thumbnail is over 256 KB", file("photo.jpg"), file("thumb.jpg", JPEG_START, 256 * 1024 + 1)],
  ])("refuses to store anything when %s", async (_case, photo, thumb) => {
    const calls = fakeSupabase({});

    expect(await savePhoto(photoForm(photo, thumb))).toBe(PHOTO_UNREADABLE);
    expect(calls).toEqual([]);
  });

  it("removes what was uploaded and fails when an upload fails", async () => {
    const failure = { message: "storage is down" };
    const calls = fakeSupabase({ "storage:upload": [{ data: null, error: failure }] });

    await expect(savePhoto(photoForm(file("photo.jpg"), file("thumb.jpg")))).rejects.toBe(failure);

    const { photoPath, thumbPath } = uploadedPaths(calls);
    expect(calls.at(-1)).toEqual(["remove", [photoPath, thumbPath]]);
    expect(calls.map(([method]) => method)).not.toContain("upsert");
  });

  it("removes the new files and fails when the photo row can't be saved", async () => {
    const failure = { message: "row rejected" };
    const calls = fakeSupabase({ photos: [{ data: null, error: null }, { data: null, error: failure }] });

    await expect(savePhoto(photoForm(file("photo.jpg"), file("thumb.jpg")))).rejects.toBe(failure);

    const { photoPath, thumbPath } = uploadedPaths(calls);
    expect(calls.slice(-2)).toEqual([
      ["upsert", expect.objectContaining({ storage_path: photoPath })],
      ["remove", [photoPath, thumbPath]],
    ]);
  });
});
