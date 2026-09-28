import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { loadToken } from '../src/lib/session';
import { usePlan } from '../src/lib/store';
import { useTheme } from '../src/theme';

/** Nothing lives here. No session → Account. Session but no plan on the server → sign-up.
 *  Otherwise → Home (LAUNCH-2). A phone with no cached plan asks the server before deciding,
 *  so signing in on a new phone never means redoing sign-up (LAUNCH-3). */
export default function Index() {
  const { ready, plan, refresh } = usePlan();
  const t = useTheme();
  const [where, setWhere] = useState<'/auth' | '/signup' | '/home' | null>(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      if (!(await loadToken())) return setWhere('/auth');
      if (plan) return setWhere('/home');
      const remote = await refresh();
      // refresh() signs the phone out if the server no longer knows this token.
      if (!(await loadToken())) return setWhere('/auth');
      setWhere(remote ? '/home' : '/signup');
    })();
    // Decided once per visit; the plan arriving later doesn't re-route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!where) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  return <Redirect href={where} />;
}
