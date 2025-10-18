// app/(dashboard)/crud/[model]/page.tsx
export const runtime = "nodejs";

import ManageModelClient from "./ManageModelClient";

export default async function ManageModelPage({
  params,
}: {
  params: Promise<{ model: string }>;
}) {
  const { model } = await params;
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gestionar: {model}</h2>
      <ManageModelClient model={model} />
    </div>
  );
}
