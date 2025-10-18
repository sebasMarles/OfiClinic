// app/(dashboard)/config-crud/[model]/page.tsx
import CrudConfigEditor from "@/components/config-crud/CrudConfigEditor";

export default async function ConfigCrudModelPage({
  params,
}: {
  params: Promise<{ model: string }>;
}) {
  const { model } = await params;

  return (
    <div className="space-y-6">
      <CrudConfigEditor model={model} />
    </div>
  );
}
