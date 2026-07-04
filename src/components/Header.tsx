import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { fonts } from "../theme";
export function Header({ avatarUrl }: { avatarUrl?: string | null }) {
  const { palette } = useTheme();
  return (
    <View style={s.header}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={s.avatar} />
      ) : (
        <View
          style={[
            s.avatar,
            {
              backgroundColor: palette.primarySoft,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <Ionicons name="person" size={20} color={palette.primary} />
        </View>
      )}
      <Text style={[s.title, { color: palette.primary }]}>Clarity Finance</Text>
      <Ionicons
        name="notifications-outline"
        size={25}
        color={palette.primary}
      />
    </View>
  );
}
const s = StyleSheet.create({
  header: {
    height: 74,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    maxWidth: 1000,
    width: "100%",
    alignSelf: "center",
  },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  title: { fontFamily: fonts.bold, fontSize: 24, flex: 1 },
});
