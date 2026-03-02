import UplinkForm from "@/components/UplinkForm";

export default function UplinkPage() {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Uplink</h1>
        <p className="page-subtitle">daily check-in — meds, spoons, pain, mood, brain fog</p>
      </div>

      <UplinkForm />
    </>
  );
}
