// app/(dashboard)/crud/[model]/page.tsx
export const runtime = "nodejs";

import ManageModelClient from "./ManageModelClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function ManageModelPage({
  params,
}: {
  params: { model: string };
}) {
  const { model } = params;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestionar: {model}</h2>
        <Link href="/">
          <Button variant="outline" size="sm">
            <Home className="h-4 w-4 mr-2" />
            Ir al inicio
          </Button>
        </Link>
      </div>

      <ManageModelClient model={model} />
    </div>
  );
}
