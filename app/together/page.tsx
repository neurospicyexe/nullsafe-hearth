import DoorList from "@/components/kit/DoorList";
import { HUBS } from "@/lib/shell";

export const metadata = { title: "Together | Hearth" };

export default function Page() {
  return (
    <>
      <h1 className="h-page-title">Together</h1>
      <DoorList doors={HUBS.together} />
    </>
  );
}
