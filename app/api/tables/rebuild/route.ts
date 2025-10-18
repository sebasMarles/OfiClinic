// app/api/tables/rebuild/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

function runNodeScript(
  file: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const ps = spawn(process.execPath, [file], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    ps.stdout.on("data", (d) => (stdout += d.toString()));
    ps.stderr.on("data", (d) => (stderr += d.toString()));
    ps.on("error", reject);
    ps.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `Script exited with code ${code}`));
    });
  });
}

export async function POST() {
  try {
    const script = path.join(
      process.cwd(),
      "prisma",
      "scripts",
      "generate-configs.mjs"
    );
    const res = await runNodeScript(script);
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    console.error("[POST /api/tables/rebuild] error:", e);
    return NextResponse.json(
      { ok: false, error: "rebuild_failed", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
