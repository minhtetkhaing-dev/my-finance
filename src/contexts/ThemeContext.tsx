import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { colors } from '../theme';

const ThemeContext = createContext({ isDark: false, toggle: () => {}, palette: colors.light });
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [isDark, setDark] = useState(system === 'dark');
  useEffect(() => { AsyncStorage.getItem('clarity-theme').then(v => v && setDark(v === 'dark')); }, []);
  const value = useMemo(() => ({ isDark, palette: isDark ? colors.dark : colors.light, toggle: () => setDark(v => { AsyncStorage.setItem('clarity-theme', !v ? 'dark' : 'light'); return !v; }) }), [isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
