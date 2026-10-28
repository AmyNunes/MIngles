import { emptyProfile, profileSchema, type Profile } from '@/features/profile/schema';
import { nowIso } from '@/lib/dates';

import { getDb } from './client';

type ProfileRow = {
  level: string | null;
  goal: string;
  interests: string;
  occupation: string;
  variant: string;
  knownDifficulties: string;
};

export async function getProfile(): Promise<Profile> {
  const db = await getDb();
  const row = await db.getFirstAsync<ProfileRow>(
    'SELECT level, goal, interests, occupation, variant, knownDifficulties FROM profile WHERE id = 1',
  );
  if (!row) return emptyProfile;

  let interests: unknown = [];
  try {
    interests = JSON.parse(row.interests);
  } catch {
    interests = [];
  }
  const parsed = profileSchema.safeParse({ ...row, interests });
  return parsed.success ? parsed.data : emptyProfile;
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = await getDb();
  const p = profileSchema.parse(profile);
  await db.runAsync(
    `INSERT INTO profile (id, level, goal, interests, occupation, variant, knownDifficulties, updatedAt)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       level = excluded.level, goal = excluded.goal, interests = excluded.interests,
       occupation = excluded.occupation, variant = excluded.variant,
       knownDifficulties = excluded.knownDifficulties, updatedAt = excluded.updatedAt`,
    p.level,
    p.goal,
    JSON.stringify(p.interests),
    p.occupation,
    p.variant,
    p.knownDifficulties,
    nowIso(),
  );
}
