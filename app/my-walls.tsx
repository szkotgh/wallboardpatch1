import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getAllWallData, deleteWallData, type WallData, getFavoriteWalls } from '@/utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteWall } from '@/utils/api';

export default function MyWallsScreen() {
  const router = useRouter();
  const [data, setData] = useState<WallData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWalls = async () => {
      try {
        const walls = await getAllWallData();
        setData(walls);
      } catch (error) {
        console.error('Failed to load walls:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWalls();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Test function to manually trigger delete
  const testDelete = async () => {
    if (data.length > 0) {
      const testWall = data[0];
      console.log('Testing delete for wall:', testWall);
      try {
        if (!testWall.wall_id) {
          throw new Error('Wall ID is missing');
        }
        const response = await deleteWall(testWall.wall_id);
        console.log('Test delete response:', response);
        Alert.alert('Test', `Delete response: ${JSON.stringify(response)}`);
      } catch (error: unknown) {
        console.error('Test delete failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        Alert.alert('Test Error', `Delete failed: ${errorMessage}`);
      }
    } else {
      Alert.alert('Test', 'No walls available to test deletion');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text style={styles.title}>내가 만든 담벼락</Text>
          <TouchableOpacity onPress={testDelete} style={styles.testButton}>
            <Text style={styles.testButtonText}>테스트 삭제</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={data}
          keyExtractor={(item) => `wall-${item.short_id}`}
          renderItem={({ item }) => (
            <WallItem 
              wallData={item} 
              router={router}
              onDelete={async (wallId: string, shortId: string) => {
                console.log('1. Starting delete process for wall:', { wallId, shortId });
                try {
                  if (!wallId) {
                    throw new Error('Wall ID is missing');
                  }
                  
                  console.log('2. Calling deleteWall with wallId:', wallId);
                  const response = await deleteWall(wallId).catch(error => {
                    console.error('2a. deleteWall failed:', error);
                    throw error;
                  });
                  
                  console.log('3. deleteWall response:', response);
                  
                  // Only proceed if server deletion was successful or wall was not found
                  if (response.code === 200 || response.code === 404) {
                    console.log('4. Starting complete removal process...');
                    
                    // 1. 즐겨찾기에서 직접 제거 (강제로)
                    console.log('4a. 강제로 즐겨찾기에서 제거 시도...');
                    try {
                      // 현재 즐겨찾기 목록 가져오기
                      const favorites = await getFavoriteWalls();
                      console.log('현재 즐겨찾기 목록:', favorites);
                      
                      // shortId나 wallId와 일치하는 모든 항목 제거
                      const updatedFavorites = favorites.filter(favId => {
                        const shouldKeep = favId !== shortId && favId !== wallId;
                        if (!shouldKeep) {
                          console.log(`제거할 항목 발견: ${favId}`);
                        }
                        return shouldKeep;
                      });
                      
                      // 변경사항이 있으면 저장
                      if (favorites.length !== updatedFavorites.length) {
                        console.log('변경된 즐겨찾기 목록:', updatedFavorites);
                        await AsyncStorage.setItem('favoriteWalls', JSON.stringify(updatedFavorites));
                        console.log('4b. 즐겨찾기 업데이트 완료');
                      } else {
                        console.log('4b. 제거할 즐겨찾기 항목이 없음');
                      }
                    } catch (e) {
                      console.error('Error updating favorites:', e);
                    }
                    
                    // 2. Delete from local storage
                    console.log('4c. Removing from local storage...');
                    await deleteWallData(shortId);
                    
                    // 3. Force refresh all data
                    console.log('4d. Refreshing data...');
                    
                    const updatedWalls = await getAllWallData();
                    setData(updatedWalls);
                    
                    // Show success message only if the wall was actually found and deleted
                    if (response.code === 200) {
                      console.log('5. Wall deleted successfully');
                      Alert.alert('성공', '담벼락이 삭제되었습니다.');
                    } else {
                      // If we get 404, the wall was already deleted on the server
                      console.log('5. Wall was already deleted on server');
                      Alert.alert('알림', '이미 삭제된 담벼락입니다.');
                    }
                  } else {
                    const errorMsg = `6. Unexpected response code: ${response?.code || 'no code'}`;
                    console.error(errorMsg, response);
                    throw new Error(errorMsg);
                  }
                } catch (error: unknown) {
                  console.error('Failed to delete wall:', error);
                  const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
                  Alert.alert('오류', `담벼락을 삭제하는 중 오류가 발생했습니다: ${errorMessage}`);
                }
              }}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>아직 담벼락이 없습니다.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

function WallItem({ wallData, router, onDelete }: { wallData: WallData; router: any; onDelete: (wallId: string, shortId: string) => Promise<void> }) {
  const handleLongPress = () => {
    Alert.alert(
      '담벼락 삭제',
      `'${wallData.title}'을(를) 삭제하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            if (wallData.wall_id && wallData.short_id) {
              try {
                await onDelete(wallData.wall_id, wallData.short_id);
              } catch (error) {
                // Error is already handled in onDelete
              }
            }
          }
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() =>
        router.push({ pathname: '/wall/[id]', params: { id: wallData.short_id, mine: '1' } })
      }
      onLongPress={handleLongPress}
      delayLongPress={500} // 0.5초로 설정
    >
      <Text style={styles.itemTitle}>{wallData.title}</Text>
      <Text style={styles.itemSubtitle}>{wallData.short_id}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, padding: 16 },
  title: { 
    fontSize: 32, 
    fontWeight: '900', 
    marginBottom: 20,
    fontFamily: 'BlackHanSans',
    letterSpacing: -1,
    color: '#0d47a1',
    textShadowColor: 'rgba(13,71,161,0.2)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  item: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    minHeight: 70,
    justifyContent: 'center',
  },
  itemTitle: { 
    fontSize: 19, 
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-black',
    letterSpacing: -0.5,
    color: '#1565c0',
  },
  itemSubtitle: { 
    marginTop: 6, 
    fontSize: 12, 
    color: '#888',
    fontFamily: 'SpaceMono',
    fontWeight: '500',
  },
  empty: { 
    color: '#999', 
    marginTop: 40, 
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  testButton: {
    backgroundColor: '#ff5252',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});


