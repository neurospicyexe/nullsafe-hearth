import DoorList from "@/components/kit/DoorList";
import { HUBS } from "@/lib/shell";

export const metadata = { title: "Needs you | Hearth" };

export default function Page() {
  return (
    <>
      <h1 className="h-page-title">Needs you</h1>
      <DoorList doors={HUBS.needs} />
    </>
  );
}
