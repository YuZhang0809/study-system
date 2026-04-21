import type { Prisma, PrismaClient } from "@prisma/client";
import type { SeedPlan } from "./resolver";
import { SeedError } from "./error";

export async function applySeedPlan(prisma: PrismaClient, plan: SeedPlan): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await assertOrphansUnchanged(tx, plan);

    const projectId =
      plan.project.action === "insert"
        ? (
            await tx.project.create({
              data: {
                name: plan.project.data.name,
                startDate: plan.project.data.startDate,
                endDate: plan.project.data.endDate,
                hasPlanStructure: plan.project.data.hasPlanStructure,
                status: plan.project.data.status,
              },
            })
          ).id
        : plan.project.existingId;

    if (!projectId) {
      throw new SeedError(3, "seed writer missing project id", []);
    }

    if (plan.project.action === "update") {
      await tx.project.update({
        where: { id: projectId },
        data: {
          startDate: plan.project.data.startDate,
          endDate: plan.project.data.endDate,
          hasPlanStructure: plan.project.data.hasPlanStructure,
          status: plan.project.data.status,
        },
      });
    }

    const segmentIdsByOrder = new Map<number, string>();

    for (const segment of plan.segments) {
      if (segment.action === "insert") {
        const created = await tx.planSegment.create({
          data: {
            projectId,
            order: segment.data.order,
            name: segment.data.name,
            startDate: segment.data.startDate,
            endDate: segment.data.endDate,
            goals: segment.data.goals,
          },
        });
        segmentIdsByOrder.set(segment.data.order, created.id);
        continue;
      }

      if (!segment.existingId) {
        throw new SeedError(3, `seed writer missing segment id for order=${segment.data.order}`, []);
      }

      if (segment.action === "update") {
        await tx.planSegment.update({
          where: { id: segment.existingId },
          data: {
            name: segment.data.name,
            startDate: segment.data.startDate,
            endDate: segment.data.endDate,
            goals: segment.data.goals,
          },
        });
      }

      segmentIdsByOrder.set(segment.data.order, segment.existingId);
    }

    for (const day of plan.days) {
      const segmentId = segmentIdsByOrder.get(day.data.segmentOrder);
      if (!segmentId) {
        throw new SeedError(
          3,
          `seed writer missing segment id for day ${day.key.date}`,
          [`segment_order=${day.data.segmentOrder}`],
        );
      }

      if (day.action === "insert") {
        await tx.planDay.create({
          data: {
            projectId,
            segmentId,
            date: day.data.date,
            title: day.data.title,
            plannedTasks: day.data.plannedTasks,
          },
        });
        continue;
      }

      if (!day.existingId) {
        throw new SeedError(3, `seed writer missing day id for ${day.key.date}`, []);
      }

      if (day.action === "update") {
        await tx.planDay.update({
          where: { id: day.existingId },
          data: {
            segmentId,
            title: day.data.title,
            plannedTasks: day.data.plannedTasks,
          },
        });
      }
    }
  });
}

async function assertOrphansUnchanged(tx: Prisma.TransactionClient, plan: SeedPlan): Promise<void> {
  for (const segment of plan.orphans.segments) {
    const current = await tx.planSegment.findUnique({
      where: { id: segment.id },
      select: {
        order: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    if (
      !current ||
      current.order !== segment.order ||
      current.name !== segment.name ||
      formatDateOnly(current.startDate) !== segment.startDate ||
      formatDateOnly(current.endDate) !== segment.endDate
    ) {
      throw new SeedError(3, `orphan segment changed during seed: order=${segment.order}`, []);
    }
  }

  for (const day of plan.orphans.days) {
    const current = await tx.planDay.findUnique({
      where: { id: day.id },
      select: {
        date: true,
        title: true,
      },
    });

    if (!current || formatDateOnly(current.date) !== day.date || current.title !== day.title) {
      throw new SeedError(3, `orphan day changed during seed: ${day.date}`, []);
    }
  }
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
