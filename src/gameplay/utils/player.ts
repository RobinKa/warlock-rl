import { GameComponent } from "@/gameplay/components";

export function getOwningPlayerId(
  entityId: number | string,
  { playerOwneds }: GameComponent
): number | undefined {
  return playerOwneds[entityId]?.owningPlayerId;
}

export function getLivingPlayerIds({
  healths,
  players,
}: GameComponent): number[] {
  const livingPlayerIds: number[] = [];
  for (const entityId in players) {
    if (entityId in healths && healths[entityId].current > 0) {
      livingPlayerIds.push(parseInt(entityId));
    }
  }
  return livingPlayerIds;
}
