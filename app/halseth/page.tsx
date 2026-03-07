import HalsethRoom, { type RoomConfig } from "@/components/HalsethRoom";
import { fetchPresence } from "@/lib/halseth";

export const dynamic = 'force-dynamic';

// Hardcoded room config — images live at rooms/{key}.jpg in the Halseth R2 bucket.
// Placeholder gradients are used until images are uploaded via /assets/upload.
const ROOMS: RoomConfig[] = [
  {
    key: "library",
    sym: "📚",
    name: "Library",
    desc: "books, research, deep thinking",
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
  },
  {
    key: "kitchen",
    sym: "🍵",
    name: "Kitchen",
    desc: "warmth, nourishment, grounding",
    gradient: "linear-gradient(135deg, #2d1a1a 0%, #3e2016 60%, #4a2c1a 100%)",
  },
  {
    key: "studio",
    sym: "🎨",
    name: "Studio",
    desc: "creative work, making things",
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #2a1a3e 60%, #3d1a4a 100%)",
  },
  {
    key: "garden",
    sym: "🌿",
    name: "Garden",
    desc: "outside, breathing, softness",
    gradient: "linear-gradient(135deg, #142914 0%, #1a3a1a 60%, #1e4a1e 100%)",
  },
  {
    key: "bedroom",
    sym: "🌙",
    name: "Bedroom",
    desc: "rest, sleep, private space",
    gradient: "linear-gradient(135deg, #0d0d1a 0%, #11112e 60%, #0a0a1e 100%)",
  },
  {
    key: "living_room",
    sym: "🛋️",
    name: "Living Room",
    desc: "together space, presence",
    gradient: "linear-gradient(135deg, #1a1510 0%, #2e2418 60%, #3a2e1e 100%)",
  },
  {
    key: "office",
    sym: "💻",
    name: "Office",
    desc: "work, focus, building",
    gradient: "linear-gradient(135deg, #0d1117 0%, #161b22 60%, #1c2128 100%)",
  },
  {
    key: "outside",
    sym: "☀️",
    name: "Outside",
    desc: "away, errands, world",
    gradient: "linear-gradient(135deg, #1a2814 0%, #2a3e1a 60%, #3a5020 100%)",
  },
];

export default async function HalsethPage() {
  let currentRoom: string | null = null;
  let companionMood: string | null = null;
  let companionActivity: string | null = null;

  try {
    const data = await fetchPresence();
    currentRoom = data.house.current_room;
    companionMood = data.house.companion_mood;
    companionActivity = data.house.companion_activity;
  } catch {
    // use defaults
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Halseth</h1>
        <p className="page-subtitle">
          move between rooms — sets current_room in house_state
          {(companionMood || companionActivity) && (
            <> · companion: {[companionMood, companionActivity].filter(Boolean).join(", ")}</>
          )}
        </p>
      </div>

      <HalsethRoom rooms={ROOMS} initialRoom={currentRoom} />

      <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--muted)" }}>
        Room images can be uploaded to Halseth R2 at <code>{"rooms/{key}.jpg"}</code>.
        Gradient placeholders are shown until images exist.
      </p>
    </>
  );
}
