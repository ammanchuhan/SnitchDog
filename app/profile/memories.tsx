import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';

import { ListGroup, ListRow } from '../../src/components/List';
import { Text } from '../../src/components/Text';
import { fetchMemories, forgetMemory, type Memory } from '../../src/lib/api';
import { space, useTheme } from '../../src/theme';

/** What Snitch remembers (PROF-5): every saved fact, each with Forget. None of it is ever used in
 *  anything sent to a witness. */
export default function Memories() {
  const t = useTheme();
  const [memories, setMemories] = useState<Memory[] | null>(null);

  useEffect(() => {
    fetchMemories()
      .then((r) => setMemories(r.memories))
      .catch(() => setMemories([]));
  }, []);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ padding: space(5), gap: space(5) }}>
      {!memories ? (
        <ActivityIndicator color={t.textFaint} />
      ) : memories.length === 0 ? (
        <Text variant="body" tone="dim">
          Nothing yet. Snitch keeps short notes from your chats (a bad knee, a travel week) so it doesn’t ask twice.
        </Text>
      ) : (
        <ListGroup footer="Never used in anything sent to your witnesses.">
          {memories.map((m) => (
            <ListRow
              key={m.id}
              label={m.fact}
              value="Forget"
              chevron={false}
              onPress={async () => {
                setMemories((all) => all!.filter((x) => x.id !== m.id));
                await forgetMemory(m.id).catch(() => {});
              }}
            />
          ))}
        </ListGroup>
      )}
    </ScrollView>
  );
}
