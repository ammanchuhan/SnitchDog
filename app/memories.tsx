import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Screen } from '../src/components/Screen';
import { Text } from '../src/components/Text';
import { fetchMemories, forgetMemory, Memory, serverConfigured } from '../src/lib/api';
import { useDismiss } from '../src/lib/nav';
import { usePlan } from '../src/lib/store';
import { radius, space, useTheme } from '../src/theme';

/** Everything the coach has chosen to remember, and a way to take any of it back.
 *
 * A model that quietly accumulates notes about someone is a thing people are right to distrust.
 * Showing the list is the difference between a coach and surveillance. */
export default function Memories() {
  const { plan } = usePlan();
  const dismiss = useDismiss();
  const t = useTheme();
  const [memories, setMemories] = useState<Memory[] | null>(null);

  const load = useCallback(async () => {
    if (!plan) return;
    const res = await fetchMemories(plan.id);
    setMemories(res?.memories ?? []);
  }, [plan]);

  useEffect(() => {
    load();
  }, [load]);

  if (!plan) return null;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: space(4) }}>
        <Pressable onPress={dismiss} hitSlop={12}>
          <Text variant="label" tone="faint">
            Back
          </Text>
        </Pressable>
      </View>

      <Text variant="display" style={{ paddingTop: space(6), paddingBottom: space(4) }}>
        What Ember remembers
      </Text>
      <Text variant="body" tone="dim" style={{ paddingBottom: space(8) }}>
        Written after your conversations, and used when it talks to you. Never used in anything
        sent to {plan.witness.name}.
      </Text>

      {!serverConfigured() ? (
        <Text variant="small" tone="faint">
          Nothing yet — Ember isn&rsquo;t connected.
        </Text>
      ) : memories === null ? (
        <Text variant="small" tone="faint">
          Loading…
        </Text>
      ) : memories.length === 0 ? (
        <Text variant="small" tone="faint">
          Nothing yet. It starts paying attention once you talk to it.
        </Text>
      ) : (
        <View style={{ gap: space(3) }}>
          {memories.map((m) => (
            <View
              key={m.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space(4),
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: t.line,
                backgroundColor: t.surface,
                padding: space(4),
              }}
            >
              <Text variant="body" style={{ flex: 1 }}>
                {m.fact}
              </Text>
              <Pressable
                hitSlop={10}
                onPress={() =>
                  Alert.alert('Forget this?', m.fact, [
                    { text: 'Keep', style: 'cancel' },
                    {
                      text: 'Forget',
                      style: 'destructive',
                      onPress: async () => {
                        await forgetMemory(plan.id, m.id);
                        setMemories((all) => (all ?? []).filter((x) => x.id !== m.id));
                      },
                    },
                  ])
                }
              >
                <Text variant="label" tone="faint">
                  Forget
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
