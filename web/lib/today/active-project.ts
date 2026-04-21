import type { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../prisma";

export interface SidebarProject {
  id: string;
  name: string;
}

export type ActiveProjectRecord = Prisma.ProjectGetPayload<{
  include: {
    segments: {
      orderBy: { startDate: "asc" };
    };
  };
}>;

interface ActiveProjectPrisma {
  project: Pick<
    PrismaClient["project"],
    "findMany" | "findFirst"
  >;
}

export async function resolveActiveProject(
  requestedId: string | undefined,
  prisma: ActiveProjectPrisma = getPrismaClient(),
): Promise<ActiveProjectRecord | null> {
  if (requestedId) {
    const requested = await prisma.project.findFirst({
      where: { id: requestedId },
      include: {
        segments: {
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (requested) {
      return requested;
    }
  }

  return prisma.project.findFirst({
    orderBy: { startDate: "desc" },
    include: {
      segments: {
        orderBy: { startDate: "asc" },
      },
    },
  });
}

export async function listSidebarProjects(
  prisma: ActiveProjectPrisma = getPrismaClient(),
): Promise<SidebarProject[]> {
  const projects = await prisma.project.findMany({
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
    },
  });

  return projects;
}
