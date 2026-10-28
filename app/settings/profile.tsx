import { Stack } from 'expo-router';
import { View } from 'react-native';

import { InterestsField } from '@/components/settings/InterestsField';
import {
  Card,
  Chip,
  ErrorState,
  Screen,
  Segmented,
  Skeleton,
  Text,
  TextField,
} from '@/components/ui';
import { LEVELS } from '@/features/profile/schema';
import { useProfileForm } from '@/features/profile/useProfileForm';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const p = strings.settings.profile;

const VARIANT_OPTIONS = [
  { value: 'us', label: p.variantUs },
  { value: 'uk', label: p.variantUk },
] as const;

export default function ProfileScreen() {
  const styles = useStyles();
  const { profile, failed, change, retry } = useProfileForm();

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: p.title }} />
      <Text color="textMuted">{p.intro}</Text>

      {failed && <ErrorState onRetry={retry} />}
      {!failed && !profile && <Skeleton height={320} radius="lg" />}

      {profile && (
        <>
          <Card title={p.level}>
            <View style={styles.chips}>
              {LEVELS.map((level) => (
                <Chip
                  key={level}
                  label={level}
                  selected={profile.level === level}
                  onPress={() => change({ level })}
                />
              ))}
              <Chip
                label={p.levelUnknown}
                selected={profile.level === 'unknown'}
                onPress={() => change({ level: 'unknown' })}
              />
            </View>
            {profile.level === 'unknown' && (
              <Text variant="caption" color="textMuted">
                {p.levelUnknownHint}
              </Text>
            )}
          </Card>

          <Card>
            <TextField
              label={p.goal}
              value={profile.goal}
              onChangeText={(goal) => change({ goal })}
              placeholder={p.goalPlaceholder}
              multiline
            />
            <TextField
              label={p.occupation}
              value={profile.occupation}
              onChangeText={(occupation) => change({ occupation })}
              placeholder={p.occupationPlaceholder}
            />
            <InterestsField
              value={profile.interests}
              onChange={(interests) => change({ interests })}
            />
          </Card>

          <Card title={p.variant}>
            <Segmented
              accessibilityLabel={p.variant}
              options={VARIANT_OPTIONS}
              value={profile.variant}
              onChange={(variant) => change({ variant })}
            />
          </Card>

          <Card>
            <TextField
              label={p.difficulties}
              value={profile.knownDifficulties}
              onChangeText={(knownDifficulties) => change({ knownDifficulties })}
              placeholder={p.difficultiesPlaceholder}
              multiline
            />
          </Card>

          <Text variant="caption" color="textMuted" align="center">
            {strings.common.autoSaved}
          </Text>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
