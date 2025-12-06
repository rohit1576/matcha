import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  colors: {
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    placeholder: string;
  };
  toggleTheme: () => Promise<void>;
  loadTheme: () => Promise<void>;
}

const darkColors = {
  background: '#000',
  surface: '#1A1A1A',
  card: '#1A1A1A',
  text: '#FFF',
  textSecondary: '#999',
  primary: '#FF69B4',
  border: '#333',
  placeholder: '#666',
};

const lightColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  card: '#FFFFFF',
  text: '#000',
  textSecondary: '#666',
  primary: '#FF69B4',
  border: '#E0E0E0',
  placeholder: '#999',
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  colors: darkColors,
  toggleTheme: async () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    const newColors = newTheme === 'dark' ? darkColors : lightColors;
    await AsyncStorage.setItem('theme', newTheme);
    set({ theme: newTheme, colors: newColors });
  },
  loadTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        const colors = savedTheme === 'dark' ? darkColors : lightColors;
        set({ theme: savedTheme, colors });
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  },
}));
