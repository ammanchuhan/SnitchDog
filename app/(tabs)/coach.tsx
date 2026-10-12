import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bubble } from '../../src/components/Bubble';
import { PlanBuilder } from '../../src/components/PlanBuilder';
import { SnitchAvatar } from '../../src/components/Snitch';
import { useTabBarClearance } from '../../src/components/TabBar';
import { Text } from '../../src/components/Text';
import { ApiError, askCoach, type ChatMessage, fetchChat, patchPlan } from '../../src/lib/api';
import { usePlan } from '../../src/lib/store';
import { font, radius, space, useTheme } from '../../src/theme';

/** The owner's only channel with Snitch (section 8): every nudge lands here as well as in a push,
 *  and the plan is built here. The history lives on the server, so it follows you to a new
 *  phone (COACH-8). */
export default function Coach() {
  const { plan, refresh, run } = usePlan();
  const t = useTheme();
  const clearance = useTabBarClearance();
  const router = useRouter();
  const params = useLocalSearchParams<{ build?: string }>();
  const scroller = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(false));
    // The list shrinks when the keyboard opens; keep the newest message in view.
    const shown = Keyboard.addListener('keyboardDidShow', () => scroller.current?.scrollToEnd({ animated: true }));
    return () => {
      show.remove();
      hide.remove();
      shown.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchChat()
        .then((r) => setMessages(r.messages))
        .catch(() => {})
        .finally(() => setLoaded(true));
      if (params.build) setRebuilding(true);
    }, [params.build]),
  );

  if (!plan) return null;
  const building = !plan.confirmedAt || rebuilding;

  async function send() {
    const message = draft.trim();
    if (!message || thinking) return;
    const mine: ChatMessage = { id: `local-${Date.now()}`, role: 'user', text: message, kind: null, created_at: new Date().toISOString() };
    setMessages((m) => [...m, mine]);
    setDraft('');
    setThinking(true);
    let reply: string;
    try {
      const res = await askCoach(message);
      reply = res.reply;
      if (res.changed) refresh(); // a pass was granted
    } catch (err) {
      reply = err instanceof ApiError && err.status === 0 ? 'I can’t reach my notes right now. Try again in a minute.' : 'Something went wrong on my end. Say that again?';
    }
    setMessages((m) => [...m, { id: `local-${Date.now()}-r`, role: 'coach', text: reply, kind: null, created_at: new Date().toISOString() }]);
    setThinking(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* No links in the header (COACH-1): "What Snitch remembers" is in Profile. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space(3),
            paddingHorizontal: space(6),
            paddingVertical: space(3),
            borderBottomWidth: 1,
            borderBottomColor: t.lineSoft,
          }}
        >
          <SnitchAvatar size={40} mood="grin" />
          <View>
            <Text variant="heading">Snitch</Text>
            <Text variant="small" tone="faint">
              Your coach
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scroller}
          contentContainerStyle={{ padding: space(5), gap: space(4), paddingBottom: building ? clearance : space(5) }}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {!loaded && <ActivityIndicator color={t.textFaint} />}
          {loaded && messages.length === 0 && !building && (
            <Bubble role="coach" text="Tell me what’s getting in the way, or ask me anything about your plan. I remember what matters." />
          )}
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} text={m.text} />
          ))}
          {thinking && <ActivityIndicator color={t.textFaint} style={{ alignSelf: 'flex-start', marginLeft: 38 }} />}

          {building && (
            <PlanBuilder
              key={plan.confirmedAt ?? 'new'}
              plan={plan}
              onCancel={plan.confirmedAt ? () => { setRebuilding(false); router.setParams({ build: undefined }); } : undefined}
              onConfirm={async (next) => {
                await run(() => patchPlan(next));
                setRebuilding(false);
                router.setParams({ build: undefined });
                fetchChat().then((r) => setMessages(r.messages)).catch(() => {});
              }}
            />
          )}
        </ScrollView>

        {!building && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: space(3),
              paddingHorizontal: space(5),
              paddingTop: space(3),
              // The composer is pinned to the bottom, so it is what has to clear the floating pill;
              // with the keyboard up the pill is hidden behind it.
              paddingBottom: keyboard ? space(3) : clearance,
              borderTopWidth: 1,
              borderTopColor: t.lineSoft,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message Snitch"
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
              accessibilityRole="button"
              accessibilityLabel="Send"
              testID="send"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: draft.trim() ? t.ink : t.surfaceHigh,
              }}
            >
              <Text variant="label" style={{ color: draft.trim() ? t.onInk : t.textFaint }}>
                {'↑'}
              </Text>
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
