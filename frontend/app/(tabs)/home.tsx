import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userAPI } from '../../src/services/api';
import { useThemeStore } from '../../src/store/themeStore';

const { width } = Dimensions.get('window');
const PADDING = 16;
const GAP = 12;
const LARGE_WIDTH = (width - PADDING * 2 - GAP) * 0.6; // 60% width
const SMALL_WIDTH = (width - PADDING * 2 - GAP) * 0.4; // 40% width
const LARGE_HEIGHT = 280;
const SMALL_HEIGHT = (LARGE_HEIGHT - GAP) / 2;

interface User {
  id: string;
  name: string;
  instagram_handle: string;
  profile_picture?: string;
  verified: boolean;
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeStore((state) => state.colors);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    try {
      const data = await userAPI.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.instagram_handle.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const renderUserCard = (user: User, isLarge: boolean) => (
    <TouchableOpacity
      key={user.id}
      style={[
        styles.card,
        isLarge ? styles.largeCard : styles.smallCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
      onPress={() => router.push(`/profile/${user.instagram_handle}`)}
    >
      {user.profile_picture ? (
        <Image
          source={{ uri: user.profile_picture }}
          style={[styles.cardImage, isLarge ? styles.largeImage : styles.smallImage]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.cardImage,
            isLarge ? styles.largeImage : styles.smallImage,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.placeholderText, { color: colors.primary }]}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
          {user.name}
        </Text>
        <Text style={[styles.userHandle, { color: colors.textSecondary }]} numberOfLines={1}>
          @{user.instagram_handle}
        </Text>
        {user.verified && (
          <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.verifiedText}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderAsymmetricGrid = () => {
    const rows = [];
    let index = 0;

    while (index < filteredUsers.length) {
      const isLeftLarge = rows.length % 2 === 0;
      
      if (isLeftLarge) {
        // Large on left, 2 small on right
        const leftUser = filteredUsers[index];
        const topRightUser = filteredUsers[index + 1];
        const bottomRightUser = filteredUsers[index + 2];

        rows.push(
          <View key={`row-${index}`} style={styles.row}>
            <View style={styles.leftColumn}>
              {leftUser && renderUserCard(leftUser, true)}
            </View>
            <View style={styles.rightColumn}>
              {topRightUser && renderUserCard(topRightUser, false)}
              {bottomRightUser && renderUserCard(bottomRightUser, false)}
            </View>
          </View>
        );
        index += 3;
      } else {
        // 2 small on left, large on right
        const topLeftUser = filteredUsers[index];
        const bottomLeftUser = filteredUsers[index + 1];
        const rightUser = filteredUsers[index + 2];

        rows.push(
          <View key={`row-${index}`} style={styles.row}>
            <View style={styles.leftColumn}>
              {topLeftUser && renderUserCard(topLeftUser, false)}
              {bottomLeftUser && renderUserCard(bottomLeftUser, false)}
            </View>
            <View style={styles.rightColumn}>
              {rightUser && renderUserCard(rightUser, true)}
            </View>
          </View>
        );
        index += 3;
      }
    }

    return rows;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Matcha</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Discover Dating Tea
        </Text>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by Instagram handle..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Loading users...
            </Text>
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery ? 'No users found' : 'No users yet'}
            </Text>
          </View>
        ) : (
          renderAsymmetricGrid()
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  grid: {
    paddingHorizontal: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  cardImage: {
    width: '100%',
    height: CARD_WIDTH * 1.2,
  },
  placeholderImage: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF69B4',
  },
  cardContent: {
    padding: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 14,
    color: '#999',
  },
  verifiedBadge: {
    backgroundColor: '#FF69B4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyContainer: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});
