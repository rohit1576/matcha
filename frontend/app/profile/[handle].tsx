import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userAPI, teaAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';

interface User {
  id: string;
  name: string;
  email: string;
  instagram_handle: string;
  profile_picture?: string;
  verified: boolean;
  created_at: string;
}

interface Tea {
  id: string;
  author_name: string;
  author_instagram: string;
  content: string;
  ai_moderation_flag?: string;
  created_at: string;
}

export default function ProfileDetailScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const [user, setUser] = useState<User | null>(null);
  const [tea, setTea] = useState<Tea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeaInput, setShowTeaInput] = useState(false);
  const [teaContent, setTeaContent] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchProfile = async () => {
    try {
      const data = await userAPI.getUserProfile(handle);
      setUser(data.user);
      setTea(data.tea);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [handle]);

  const handlePostTea = async () => {
    if (!teaContent.trim()) {
      Alert.alert('Error', 'Please enter some tea to share');
      return;
    }

    if (!currentUser?.verified) {
      Alert.alert('Not Verified', 'You need to verify your account to post tea');
      return;
    }

    try {
      setPosting(true);
      const newTea = await teaAPI.postTea(handle, teaContent);
      setTea([newTea, ...tea]);
      setTeaContent('');
      setShowTeaInput(false);
      
      if (newTea.ai_moderation_flag) {
        Alert.alert(
          'Content Flagged',
          'Your post has been flagged by AI moderation. It may contain inappropriate content.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to post tea'
      );
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {user.profile_picture ? (
              <Image
                source={{ uri: user.profile_picture }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Text style={styles.avatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.handle}>@{user.instagram_handle}</Text>

            {user.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>

          {/* Post Tea Button */}
          {currentUser && currentUser.instagram_handle !== handle && (
            <View style={styles.actionSection}>
              {!showTeaInput ? (
                <TouchableOpacity
                  style={styles.postTeaButton}
                  onPress={() => setShowTeaInput(true)}
                >
                  <Ionicons name="cafe-outline" size={20} color="#FFF" />
                  <Text style={styles.postTeaButtonText}>Share Tea</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.teaInputContainer}>
                  <TextInput
                    style={styles.teaInput}
                    placeholder="What's the tea on this person?"
                    placeholderTextColor="#999"
                    value={teaContent}
                    onChangeText={setTeaContent}
                    multiline
                    maxLength={500}
                  />
                  <View style={styles.teaInputActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowTeaInput(false);
                        setTeaContent('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitButton, posting && styles.submitButtonDisabled]}
                      onPress={handlePostTea}
                      disabled={posting}
                    >
                      {posting ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.submitButtonText}>Post</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Tea Section */}
          <View style={styles.teaSection}>
            <Text style={styles.sectionTitle}>
              Tea ({tea.length})
            </Text>

            {tea.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cafe-outline" size={48} color="#333" />
                <Text style={styles.emptyText}>No tea yet</Text>
                <Text style={styles.emptySubtext}>
                  Be the first to share some gossip!
                </Text>
              </View>
            ) : (
              tea.map((item) => (
                <View key={item.id} style={styles.teaCard}>
                  <View style={styles.teaHeader}>
                    <View>
                      <Text style={styles.teaAuthor}>{item.author_name}</Text>
                      <Text style={styles.teaAuthorHandle}>
                        @{item.author_instagram}
                      </Text>
                    </View>
                    <Text style={styles.teaDate}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.teaContent}>{item.content}</Text>
                  {item.ai_moderation_flag && (
                    <View style={styles.moderationWarning}>
                      <Ionicons name="warning-outline" size={16} color="#FFA500" />
                      <Text style={styles.moderationText}>
                        Flagged by AI moderation
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FF69B4',
    marginBottom: 16,
  },
  placeholderAvatar: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  handle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 12,
  },
  verifiedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  postTeaButton: {
    backgroundColor: '#FF69B4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  postTeaButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  teaInputContainer: {
    gap: 12,
  },
  teaInput: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    color: '#FFF',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#FF69B4',
  },
  teaInputActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#FF69B4',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  teaSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#999',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 14,
  },
  teaCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  teaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teaAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  teaAuthorHandle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  teaDate: {
    fontSize: 12,
    color: '#666',
  },
  teaContent: {
    fontSize: 16,
    color: '#FFF',
    lineHeight: 24,
  },
  moderationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 8,
  },
  moderationText: {
    fontSize: 12,
    color: '#FFA500',
  },
});
