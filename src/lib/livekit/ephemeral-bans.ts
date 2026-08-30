import "server-only";

// Per-room in-memory ban list for ephemeral rooms (the /live-test diagnostic
// room and guest-only rooms). Bans do NOT survive a server restart — for real
// classrooms, persist bans on the LiveSession record instead.
//
// A ban matches on:
//   • exact participant identity (works for authenticated users whose identity
//     is a stable user id)
//   • case-insensitive display name (soft guard for anonymous guests, whose
//     identity is a random suffix per join and would otherwise trivially bypass
//     an identity-only ban)
//
// Neither is bulletproof against a determined guest — but banning by identity
// is the primary contract, and name matching catches the "immediately click
// Rejoin" case which is what the moderator actually cares about.

type Ban = {
  identity: string;
  nameLower: string;
  bannedAt: Date;
  bannedByUserId: string;
};

const bansByRoom = new Map<string, Ban[]>();

export function banFromRoom(
  roomName: string,
  identity: string,
  name: string,
  bannedByUserId: string
): void {
  const bans = bansByRoom.get(roomName) ?? [];
  const nameLower = name.trim().toLowerCase();
  // Replace existing entry for this identity so re-banning refreshes the record.
  const filtered = bans.filter((b) => b.identity !== identity);
  filtered.push({ identity, nameLower, bannedAt: new Date(), bannedByUserId });
  bansByRoom.set(roomName, filtered);
}

export function unbanFromRoom(roomName: string, identity: string): void {
  const bans = bansByRoom.get(roomName);
  if (!bans) return;
  const next = bans.filter((b) => b.identity !== identity);
  if (next.length === 0) bansByRoom.delete(roomName);
  else bansByRoom.set(roomName, next);
}

export function isBanned(
  roomName: string,
  identity: string,
  name?: string
): boolean {
  const bans = bansByRoom.get(roomName);
  if (!bans || bans.length === 0) return false;
  const nameLower = name?.trim().toLowerCase();
  return bans.some(
    (b) =>
      b.identity === identity ||
      (nameLower !== undefined && nameLower.length > 0 && b.nameLower === nameLower)
  );
}

export function listBans(
  roomName: string
): { identity: string; nameLower: string; bannedAt: Date }[] {
  const bans = bansByRoom.get(roomName);
  if (!bans) return [];
  return bans.map(({ identity, nameLower, bannedAt }) => ({
    identity,
    nameLower,
    bannedAt,
  }));
}
