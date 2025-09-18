import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { getFavoriteWalls, getWallTitle } from '@/utils/storage';

export default function FavoriteWallsScreen() {
  const router = useRouter();
  const [data, setData] = useState<string[]>([]);

  const loadFavorites = useCallback(async () => {
    try {
      const favorites = await getFavoriteWalls();
      setData(favorites);
      console.log('Loaded favorites:', favorites);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  }, []);

  // Load favorites when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>즐겨찾기 담벼락</Text>
        <FlatList
          data={data}
          keyExtractor={(id) => id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => router.push(`/wall/${encodeURIComponent(item)}`)}>
              <Text style={styles.itemTitle}>{getWallTitle(item) ?? '(제목 없음)'}</Text>
              <Text style={styles.itemSubtitle}>{item}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>즐겨찾기가 비어 있습니다.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  item: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemTitle: { fontSize: 16, fontWeight: '700' },
  itemSubtitle: { marginTop: 4, fontSize: 12, color: '#777' },
  empty: { color: '#777', marginTop: 20 },
});


