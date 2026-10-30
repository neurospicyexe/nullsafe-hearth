import DoorList from "@/components/kit/DoorList";
import { HUBS } from "@/lib/shell";

export const metadata = { title: "Under the hood | Hearth" };

export default function Page() {
  return (
    <>
      <h1 className="h-page-title">Under the hood</h1>
      <DoorList doors={HUBS.hood} />
    </>
  );
}
