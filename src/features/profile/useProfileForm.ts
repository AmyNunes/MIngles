import { useCallback, useEffect, useState } from 'react';

import { getProfile, saveProfile } from '@/db/profileRepo';
import { useDebouncedSave } from '@/lib/useDebouncedSave';

import type { Profile } from './schema';

/** Formulário "Sobre mim": carrega do banco e salva sozinho a cada mudança. */
export function useProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { schedule } = useDebouncedSave(saveProfile);

  useEffect(() => {
    let alive = true;
    getProfile().then(
      (p) => alive && setProfile(p),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  const change = useCallback(
    (patch: Partial<Profile>) => {
      if (!profile) return;
      const next = { ...profile, ...patch };
      setProfile(next);
      schedule(next);
    },
    [profile, schedule],
  );

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((a) => a + 1);
  }, []);

  return { profile, failed, change, retry };
}
