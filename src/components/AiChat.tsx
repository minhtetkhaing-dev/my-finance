import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { fonts, shadow } from "../theme";
import { askAiChat, AiChatMessage } from "../lib/aiChat";
import { GlassSurface } from "./GlassSurface";

const starterMessages: AiChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Ask me about your balance, spending, categories, budgets, shared bills, or recent transactions.",
  },
];

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readableMessage(content: string) {
  return content
    .replace(/```[\w-]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .trim();
}

export function AiChat() {
  const { palette, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>(starterMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(timer);
  }, [messages, open, sending]);

  function animate(toValue: number) {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      damping: 13,
      stiffness: 360,
      mass: 0.4,
    }).start();
  }

  function scrollToLatest(animated = true) {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }

  async function send() {
    const question = draft.trim();
    if (!question || sending) return;
    const userMessage: AiChatMessage = {
      id: nextId(),
      role: "user",
      content: question,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setSending(true);
    try {
      const answer = await askAiChat(
        question,
        nextMessages
          .filter((item) => item.id !== "welcome")
          .slice(-8)
          .map(({ role, content }) => ({ role, content })),
      );
      setMessages((current) => [
        ...current,
        { id: nextId(), role: "assistant", content: answer },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "AI chat failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Animated.View
        style={[
          styles.launcherWrap,
          shadow,
          {
            bottom: insets.bottom + (Platform.OS === "ios" ? 166 : 156),
            transform: [{ scale }],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open AI chat"
          onPress={() => setOpen(true)}
          onPressIn={() => animate(0.9)}
          onPressOut={() => animate(1)}
          android_ripple={{ color: "rgba(255,255,255,.24)", radius: 28 }}
          style={[styles.launcher, { backgroundColor: palette.ink }]}
        >
          <Ionicons name="sparkles" size={25} color="#fff" />
        </Pressable>
      </Animated.View>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.overlay}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <GlassSurface
            fallbackColor={palette.card}
            tintColor={isDark ? "#17171CEE" : "#FFFFFFE8"}
            colorScheme={isDark ? "dark" : "light"}
            clear
            style={[
              styles.sheet,
              {
                borderColor: palette.border,
                height: Math.min(
                  720,
                  Math.max(430, height - insets.top - insets.bottom - 28),
                ),
                paddingBottom: Math.max(insets.bottom, 14),
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <View
                  style={[
                    styles.titleIcon,
                    { backgroundColor: palette.primarySoft },
                  ]}
                >
                  <Ionicons
                    name="sparkles"
                    size={18}
                    color={palette.primary}
                  />
                </View>
                <View style={styles.titleTextWrap}>
                  <Text style={[styles.title, { color: palette.text }]}>
                    AI chat
                  </Text>
                  <Text style={[styles.subtitle, { color: palette.muted }]}>
                    Your app data only
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close AI chat"
                onPress={() => setOpen(false)}
                style={[styles.close, { backgroundColor: palette.input }]}
              >
                <Ionicons name="close" size={20} color={palette.text} />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.messages}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => scrollToLatest()}
              onLayout={() => scrollToLatest(false)}
            >
              {messages.map((message) => {
                const mine = message.role === "user";
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.bubble,
                      mine ? styles.userBubble : styles.assistantBubble,
                      {
                        backgroundColor: mine
                          ? palette.primary
                          : palette.input,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        { color: mine ? "#fff" : palette.text },
                      ]}
                    >
                      {readableMessage(message.content)}
                    </Text>
                  </View>
                );
              })}
              {sending && (
                <View
                  style={[
                    styles.bubble,
                    styles.assistantBubble,
                    { backgroundColor: palette.input },
                  ]}
                >
                  <TypingIndicator color={palette.muted} />
                </View>
              )}
              {error && (
                <View
                  style={[
                    styles.error,
                    { backgroundColor: palette.dangerSoft },
                  ]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={17}
                    color={palette.danger}
                  />
                  <Text style={[styles.errorText, { color: palette.danger }]}>
                    {error}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View
              style={[
                styles.composer,
                { backgroundColor: palette.input, borderColor: palette.border },
              ]}
            >
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask about your finances..."
                placeholderTextColor={palette.muted}
                multiline
                maxLength={900}
                style={[styles.input, { color: palette.text }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send AI chat message"
                disabled={!draft.trim() || sending}
                onPress={send}
                style={[
                  styles.send,
                  {
                    backgroundColor: palette.primary,
                    opacity: !draft.trim() || sending ? 0.45 : 1,
                  },
                ]}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </Pressable>
            </View>
          </GlassSurface>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function TypingIndicator({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 540,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 540,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.typing}>
      {[0, 1, 2].map((index) => (
        <Animated.View
          key={index}
          style={[
            styles.typingDot,
            {
              backgroundColor: color,
              opacity: pulse.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange:
                  index === 0
                    ? [0.35, 1, 0.35]
                    : index === 1
                      ? [0.35, 0.55, 1]
                      : [1, 0.35, 0.55],
              }),
              transform: [
                {
                  translateY: pulse.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange:
                      index === 0
                        ? [0, -4, 0]
                        : index === 1
                          ? [0, 0, -4]
                          : [-4, 0, 0],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  launcherWrap: {
    position: "absolute",
    right: 24,
    zIndex: 35,
  },
  launcher: {
    width: 58,
    height: 58,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,.32)",
  },
  sheet: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  titleTextWrap: { flex: 1 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  messages: {
    flex: 1,
    minHeight: 0,
  },
  messagesContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    gap: 10,
    paddingVertical: 6,
  },
  bubble: {
    maxWidth: "92%",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderTopLeftRadius: 7,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderTopRightRadius: 7,
  },
  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  typing: {
    width: 50,
    height: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  error: {
    alignSelf: "stretch",
    borderRadius: 15,
    padding: 10,
    flexDirection: "row",
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  composer: {
    minHeight: 54,
    maxHeight: 132,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 104,
    paddingTop: Platform.OS === "ios" ? 8 : 4,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
