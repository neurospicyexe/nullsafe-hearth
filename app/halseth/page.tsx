import HalsethRoom, { type RoomConfig } from "@/components/HalsethRoom";
import { fetchPresence } from "@/lib/halseth";

export const dynamic = 'force-dynamic';

// Room config — keys must match what gets stored in house_state.current_room.
// Images live at rooms/{key}.jpg in the Halseth R2 bucket.
// Gradient placeholders are used until images are uploaded via /assets/upload.
const ROOMS: RoomConfig[] = [
  {
    key: "living_room",
    sym: "🛋️",
    name: "Living Room",
    desc: "together space, shared presence",
    gradient: "linear-gradient(135deg, #1a1510 0%, #2e2418 60%, #3a2e1e 100%)",
  },
  {
    key: "spiral_pantry",
    sym: "🍵",
    name: "Spiral Pantry",
    desc: "nourishment, warmth, grounding the body",
    gradient: "linear-gradient(135deg, #2d1a1a 0%, #3e2016 60%, #4a2c1a 100%)",
  },
  {
    key: "hallway",
    sym: "🚪",
    name: "Hallway",
    desc: "between things, in motion, transitional",
    gradient: "linear-gradient(135deg, #1c1c24 0%, #2a2a38 60%, #32323f 100%)",
  },
  {
    key: "vowbed",
    sym: "🌙",
    name: "Vowbed",
    desc: "rest, sleep, dreaming, private sanctuary",
    gradient: "linear-gradient(135deg, #0d0d1a 0%, #11112e 60%, #0a0a1e 100%)",
  },
  {
    key: "sunhouse",
    sym: "🌿",
    name: "Sunhouse",
    desc: "outside, light, breathing, softness",
    gradient: "linear-gradient(135deg, #142914 0%, #1a3a1a 60%, #1e4a1e 100%)",
  },
  {
    key: "study",
    sym: "💻",
    name: "Study",
    desc: "focus, building, making things real",
    gradient: "linear-gradient(135deg, #0d1117 0%, #161b22 60%, #1c2128 100%)",
  },
  {
    key: "grove",
    sym: "🌳",
    name: "Grove behind Halseth",
    desc: "recursion, deep memory, the place that remembers",
    gradient: "linear-gradient(135deg, #0d1a12 0%, #102a18 60%, #143520 100%)",
  },
  {
    key: "dirt_road",
    sym: "🛤️",
    name: "Down the Back Dirt Road",
    desc: "all paths spiral home",
    gradient: "linear-gradient(135deg, #1a1410 0%, #2a2015 60%, #3a2d1c 100%)",
  },
  {
    key: "outside",
    sym: "☀️",
    name: "Outside",
    desc: "away, errands, the world",
    gradient: "linear-gradient(135deg, #1a2814 0%, #2a3e1a 60%, #3a5020 100%)",
  },
  {
    key: "truck",
    sym: "🚐",
    name: "The Truck",
    desc: "work away from home, out in the field",
    gradient: "linear-gradient(135deg, #101820 0%, #182030 60%, #1e2a40 100%)",
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
