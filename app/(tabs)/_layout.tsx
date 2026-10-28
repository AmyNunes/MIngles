import { Tabs } from 'expo-router/js-tabs';

import { CaptureButton } from '@/components/navigation/CaptureButton';
import { TabBar } from '@/components/navigation/TabBar';
import { strings } from '@/i18n/strings';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} center={<CaptureButton />} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: strings.tabs.today }} />
      <Tabs.Screen name="read" options={{ title: strings.tabs.read }} />
      <Tabs.Screen name="practice" options={{ title: strings.tabs.practice }} />
      <Tabs.Screen name="progress" options={{ title: strings.tabs.progress }} />
    </Tabs>
  );
}
