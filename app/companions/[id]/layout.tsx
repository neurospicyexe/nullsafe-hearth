import CompanionTabStrip from "./CompanionTabStrip";

export default async function CompanionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <CompanionTabStrip companionId={id.toLowerCase()} />
      {children}
    </>
  );
}
