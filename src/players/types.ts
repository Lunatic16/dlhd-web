export const PLAYERS = [
  { id: "stream", label: "PLAYER 1" },
  { id: "cast", label: "PLAYER 2" },
  { id: "watch", label: "PLAYER 3" },
  { id: "plus", label: "PLAYER 4" },
  { id: "casting", label: "PLAYER 5" },
  { id: "player", label: "PLAYER 6" },
  { id: "hub", label: "PLAYER 7" },
] as const;

export type ServerKind = (typeof PLAYERS)[number]["id"];

export const PLAYER_IDS: ServerKind[] = PLAYERS.map((player) => player.id);

export function playerLabel(server: ServerKind): string {
  return PLAYERS.find((player) => player.id === server)?.label ?? server;
}
