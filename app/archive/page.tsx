import DoorList from "@/components/kit/DoorList";
import { HUBS } from "@/lib/shell";

export const metadata = { title: "Archive | Hearth" };

export default function Page() {
  return (
    <>
      <h1 className="h-page-title">Archive</h1>
      <DoorList doors={HUBS.archive} />
    </>
  );
}
