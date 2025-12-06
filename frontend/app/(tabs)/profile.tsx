import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { userAPI } from '../../src/services/api';
import { useThemeStore } from '../../src/store/themeStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const { theme, colors, toggleTheme, loadTheme } = useThemeStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  if (!user) {
    return null;
  }

  const handleVerify = async () => {
    try {
      setLoading(true);
      await userAPI.verifyAccount();
      setUser({ ...user, verified: true });
      Alert.alert('Success', 'Your account has been verified!');
    } catch (error) {
      Alert.alert('Error', 'Failed to verify account');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        setLoading(true);
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await userAPI.updateProfilePicture(base64Image);
        setUser({ ...user, profile_picture: base64Image });
        Alert.alert('Success', 'Profile picture updated!');
      } catch (error) {
        Alert.alert('Error', 'Failed to update profile picture');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary }]}>Profile</Text>
        </View>

        <View style={styles.content}>
          <TouchableOpacity onPress={handlePickImage} disabled={loading}>
            {user.profile_picture ? (
              <Image
                source={{ uri: user.profile_picture }}
                style={[styles.avatar, { borderColor: colors.primary }]}
              />
            ) : (
              <View style={[styles.avatar, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
          </TouchableOpacity>

          <View style={styles.infoSection}>
            <Text style={[styles.name, { color: colors.text }]}>{user.name}</Text>
            <Text style={[styles.handle, { color: colors.textSecondary }]}>@{user.instagram_handle}</Text>
            <Text style={[styles.email, { color: colors.placeholder }]}>{user.email}</Text>

            {user.verified ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.verifyButton, { backgroundColor: colors.primary }]}
                onPress={handleVerify}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Account</Text>
                )}
              </TouchableOpacity>
            )}

            <Text style={[styles.verifyNote, { color: colors.textSecondary }]}>
              {user.verified
                ? 'You can now post tea about others'
                : 'Verify your account to post tea'}
            </Text>
          </View>

          {/* Theme Toggle */}
          <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name={theme === 'dark' ? 'moon' : 'sunny'}
                  size={24}
                  color={colors.primary}
                />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Dark Mode</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                    {theme === 'dark' ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFF"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.myProfileButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => router.push(`/profile/${user.instagram_handle}`)}
          >
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={[styles.myProfileButtonText, { color: colors.primary }]}>View My Public Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.logoutButtonText, { color: colors.textSecondary }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  changePhotoText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  infoSection: {
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  handle: {
    fontSize: 16,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 16,
  },
  verifiedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  verifyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  verifyNote: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 32,
  },
  settingCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    gap: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 12,
  },
  myProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    marginBottom: 16,
  },
  myProfileButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    marginBottom: 24,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
