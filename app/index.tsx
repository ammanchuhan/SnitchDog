import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { serverConfigured } from '../src/lib/api';
import { loadToken } from '../src/lib/session';
import { usePlan } from '../src/lib/store';
import { useTheme } from '../src/theme';

/** Nothing lives here — it decides whether you are signed in, and whether you have a plan yet. */
export default function Index() {
  const { ready, plan } = usePlan();
  const t = useTheme();
  const [session, setSession] = useState<'loading' | 'in' | 'out'>('loading');

  useEffect(() => {
    loadToken().then((token) => setSession(token ? 'in' : 'out'));
  }, []);

  if (!ready || session === 'loading') return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  // Standalone builds have no server to authenticate against, and the app is meant to keep
  // working without one — so the account is only asked for when there is somewhere to send it.
  if (serverConfigured() && session === 'out') return <Redirect href="/auth" />;

  return <Redirect href={plan ? '/today' : '/setup'} />;
}
