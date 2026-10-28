import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageBubble } from '@/components/conversation/MessageBubble';
import { Button, Card, Chip, Composer, IconButton, Notice, Skeleton, Text, TextField } from '@/components/ui';
import { MicButton } from '@/components/voice/MicButton';
import { getProfile } from '@/db/profileRepo';
import { getRehearsal, updateRehearsal } from '@/db/rehearsalsRepo';
import { emitAppEvent } from '@/features/app/events';
import { useConversation } from '@/features/production/useConversation';
import { strings } from '@/i18n/strings';
import { nowIso } from '@/lib/dates';
import { speak, stopSpeaking } from '@/lib/speech';
import { useLoader } from '@/lib/useLoader';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles } from '@/theme';

const c = strings.conversation;

export default function ConversationScreen() {
  const styles = useStyles();
  const { rehearsal } = useLocalSearchParams<{ rehearsal?: string }>();
  const chat = useConversation();
  const profile = useLoader(getProfile);
  const accent = useSettings((s) => s.voice.accent);
  const [custom, setCustom] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const roleplayStarted = useRef(false);

  // Ensaio: começa o roleplay direto, com a fala de abertura preparada.
  useEffect(() => {
    if (!rehearsal || roleplayStarted.current) return;
    roleplayStarted.current = true;
    void getRehearsal(rehearsal).then((r) => {
      if (r?.prep) void chat.startRoleplay(`roleplay: ${r.title}. ${r.description}`, r.prep.roleplayOpening);
    });
  });

  // Modo voz: lê a resposta da IA em voz alta.
  const last = chat.messages.at(-1);
  useEffect(() => {
    if (voiceMode && last?.role === 'assistant') speak(last.text);
  }, [voiceMode, last]);
  useEffect(() => () => stopSpeaking(), []);

  const interests = profile.state.status === 'success' ? profile.state.data.interests : [];
  const topics = [...new Set([...interests, ...c.topics])];

  const finishRehearsal = async () => {
    if (!rehearsal) return;
    await updateRehearsal(rehearsal, { rehearsedAt: nowIso() });
    emitAppEvent('rehearsalsChanged');
  };

  const confirmEnd = () =>
    Alert.alert(c.end, c.endConfirm, [
      { text: strings.common.cancel, style: 'cancel' },
      { text: c.end, onPress: () => void chat.end(finishRehearsal) },
    ]);

  if (!chat.started) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Stack.Screen options={{ title: c.title }} />
        {rehearsal ? (
          <View style={styles.chooser}>
            <Skeleton height={120} radius="lg" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.chooser} keyboardShouldPersistTaps="handled">
            <Text variant="title">{c.chooseTopic}</Text>
            <View style={styles.chips}>
              {topics.map((t) => (
                <Chip key={t} label={t} onPress={() => void chat.start(t)} />
              ))}
            </View>
            <Button label={c.letAiChoose} icon="shuffle" variant="secondary" onPress={() => void chat.start(c.aiTopic)} />
            <Card>
              <TextField label={c.customTopic} value={custom} onChangeText={setCustom} placeholder={c.customPlaceholder} />
              <Button label={c.start} icon="message-circle" disabled={!custom.trim()} onPress={() => void chat.start(custom.trim())} />
            </Card>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: rehearsal ? strings.rehearsals.title : chat.topic === c.aiTopic ? c.title : chat.topic,
          headerRight: () => (
            <View style={styles.header}>
              <IconButton
                icon={voiceMode ? 'volume-2' : 'volume-x'}
                color={voiceMode ? 'primary' : 'textMuted'}
                accessibilityLabel={strings.voice.voiceMode}
                onPress={() => {
                  showSnackbar(voiceMode ? strings.voice.voiceModeOff : strings.voice.voiceModeOn);
                  if (voiceMode) stopSpeaking();
                  setVoiceMode(!voiceMode);
                }}
              />
              <Button label={c.end} variant="ghost" loading={chat.ending} onPress={confirmEnd} />
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        >
          {chat.messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {chat.thinking && (
            <Text variant="caption" color="textMuted" accessibilityLiveRegion="polite">
              {c.thinking}
            </Text>
          )}
          {chat.error && (
            <Notice tone="error" action={<Button label={strings.common.retry} variant="secondary" icon="refresh-cw" onPress={chat.retry} />}>
              {chat.error}
            </Notice>
          )}
        </ScrollView>
        <Composer
          placeholder={c.placeholder}
          onSend={(text) => void chat.send(text)}
          accessory={<MicButton lang={accent} onText={(spoken) => void chat.send(spoken)} />}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  chooser: { padding: t.spacing.screen, gap: t.spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  messages: { padding: t.spacing.screen, gap: t.spacing.md },
}));
