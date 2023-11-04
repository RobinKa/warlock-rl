import { EntityComponents } from "@/common/components";
import { PlayerOwnedComponent } from "../components/playerowned";

export function areEnemies(
  idA: number,
  idB: number,
  { playerOwneds }: { playerOwneds: EntityComponents<PlayerOwnedComponent> }
) {
  // TODO: Change this when we have teams
  return (
    playerOwneds[idA] === undefined ||
    playerOwneds[idA]?.owningPlayerId !== playerOwneds[idB]?.owningPlayerId
  );
}

export function areDifferentOwners(
  idA: number,
  idB: number,
  { playerOwneds }: { playerOwneds: EntityComponents<PlayerOwnedComponent> }
) {
  return (
    playerOwneds[idA] === undefined ||
    playerOwneds[idA]?.owningPlayerId !== playerOwneds[idB]?.owningPlayerId
  );
}
