import { collectExportData } from "@/lib/export/collect";
import { serializeExport } from "@/lib/export/serialize";
import { getPrismaClient } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const envelope = await collectExportData(getPrismaClient());
    const body = serializeExport(envelope);

    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch {
    return new Response("生成导出文件失败", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
