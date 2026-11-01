import Link from "next/link";
import DoorList from "@/components/kit/DoorList";
import { HUBS } from "@/lib/shell";
import ArchiveSearch from "./ArchiveSearch";

export const metadata = { title: "Archive | Hearth" };

export default function Page() {
  return (
    <>
      <h1 className="h-page-title">Archive</h1>
      <ArchiveSearch />
      <DoorList doors={HUBS.archive} />
      <Link className="h-foot-link" href="/hood">Under the hood</Link>
    </>
  );
}
