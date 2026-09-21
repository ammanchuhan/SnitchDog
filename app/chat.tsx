import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '../src/components/Text';
import { askCoach, ChatTurn, serverConfigured } from '../src/lib/api';
import { loadChat, saveChat } from '../src/lib/chat';
import { useDismiss } from '../src/lib/nav';
import { usePlan } from '../src/lib/store';
import { font, radius, space, useTheme } from '../src/theme';

export default function Chat() {
  const { plan, refresh } = usePlan();
  const dismiss = useDismiss();
  const t = useTheme();
  const scroller = useRef<ScrollView>(null);

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    loadChat().then(setTurns);
  }, []);

  if (!plan) return null;

  async function send() {
    const message = draft.trim();
    if (!message || thinking) return;
    const next = [...turns, { role: 'user' as const, text: message }];
    setTurns(next);
    setDraft('');
    setThinking(true);
    saveChat(next);

    const res = await askCoach(plan!.id, message, turns);
    const reply =
      res?.reply ??
      (serverConfigured()
        ? "I can't reach my notes right now. Log it in the app and I'll catch up."
        : 'Your coach is offline until the app is connected to its server.');
    const after = [...next, { role: 'coach' as const, text: reply }];
    setTurns(after);
    saveChat(after);
    setThinking(false);
    if (res?.changed) refresh(); // the coach may have logged something on your behalf
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: space(6),
            paddingVertical: space(4),
            borderBottomWidth: 1,
            borderBottomColor: t.lineSoft,
          }}
        >
          <Text variant="heading">Your coach</Text>
          <Pressable onPress={dismiss} hitSlop={12}>
            <Text variant="label" tone="faint">
              Close
            </Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scroller}
          contentContainerStyle={{ padding: space(6), gap: space(4) }}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {turns.length === 0 && (
            <View style={{ gap: space(3), paddingTop: space(6) }}>
              <Text variant="title">What&rsquo;s in the way?</Text>
              <Text variant="body" tone="dim">
                Tell me what happened this week, or just give me this morning&rsquo;s number and
                I&rsquo;ll log it. I remember what you tell me.
              </Text>
            </View>
          )}

          {turns.map((turn, i) => (
            <View
              key={i}
              style={{
                alignSelf: turn.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                backgroundColor: turn.role === 'user' ? t.text : t.surfaceHigh,
                paddingHorizontal: space(4),
                paddingVertical: space(3),
                borderRadius: radius.lg,
                borderBottomRightRadius: turn.role === 'user' ? radius.sm : radius.lg,
                borderBottomLeftRadius: turn.role === 'user' ? radius.lg : radius.sm,
              }}
            >
              <Text variant="body" style={{ color: turn.role === 'user' ? t.bg : t.text }}>
                {turn.text}
              </Text>
            </View>
          ))}

          {thinking && <ActivityIndicator color={t.textFaint} style={{ alignSelf: 'flex-start' }} />}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: space(3),
            paddingHorizontal: space(6),
            paddingTop: space(3),
            paddingBottom: space(3),
            borderTopWidth: 1,
            borderTopColor: t.lineSoft,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Say something"
            placeholderTextColor={t.textFaint}
            selectionColor={t.ember}
            multiline
            style={{
              flex: 1,
              maxHeight: 120,
              minHeight: 44,
              color: t.text,
              fontFamily: font.regular,
              fontSize: 16,
              paddingHorizontal: space(4),
              paddingTop: space(3),
              paddingBottom: space(3),
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.line,
              borderRadius: radius.lg,
            }}
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || thinking}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: draft.trim() ? t.ember : t.surfaceHigh,
            }}
          >
            <Text variant="label" style={{ color: draft.trim() ? t.onEmber : t.textFaint }}>
              {'↑'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
