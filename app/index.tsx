import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { usePlan } from '../src/lib/store';
import { useTheme } from '../src/theme';

/** Nothing lives here — it decides whether you have a plan yet. */
export default function Index() {
  const { ready, plan } = usePlan();
  const t = useTheme();

  if (!ready) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  return <Redirect href={plan ? '/today' : '/setup'} />;
}
