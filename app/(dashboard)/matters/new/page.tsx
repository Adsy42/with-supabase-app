import { MatterForm } from "@/components/matters/matter-form";

export default function NewMatterPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create New Matter
        </h1>
        <p className="text-muted-foreground">
          Set up a new matter to organise your legal work
        </p>
      </div>

      <MatterForm />
    </div>
  );
}

