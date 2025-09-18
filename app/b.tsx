import React, { useState, useCallback, JSX } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  FlatList, 
  Alert, 
  Modal, 
  ActivityIndicator, 
  RefreshControl,
  StyleProp,
  ViewStyle,
  TextStyle,
  ImageStyle
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { 
  getAllWallData, 
  getFavoriteWalls, 
  deleteWallData, 
  saveWallData, 
  type WallData 
} from '@/utils/storage';
import { createWall, getWallInfo } from '@/utils/api';

interface Wall {
  id: string;
  title: string;
  short_id: string;
}

// 스타일 타입 단순화
interface Styles {
  [key: string]: any; // 모든 스타일 속성을 허용하도록 단순화
}

export default function BScreen() {
  const router = useRouter();
  const [joinId, setJoinId] = useState('');
  const [activeTab, setActiveTab] = useState('my'); // 'my' or 'favorites'
  const [walls, setWalls] = useState<Wall[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWallTitle, setNewWallTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadWalls = useCallback(async (): Promise<void> => {
    try {
      if (activeTab === 'my') {
        const wallData = await getAllWallData();
        const wallList = wallData.map((wall) => ({
          id: wall.short_id,
          title: wall.title,
          short_id: wall.short_id,
        }));
        setWalls(wallList);
      } else {
        // Get favorite walls with their full data
        const favoriteIds = await getFavoriteWalls();
        const allWalls = await getAllWallData();
        
        // Create a map of wall data by short_id for quick lookup
        const wallMap = new Map<string, WallData>();
        allWalls.forEach(wall => {
          wallMap.set(wall.short_id, wall);
        });
        
        // Create wall list with proper titles
        const wallList = favoriteIds.map((id) => {
          const wallData = wallMap.get(id);
          return {
            id,
            title: wallData?.title || id, // Fallback to id if title not found
            short_id: id,
          };
        });
        setWalls(wallList);
      }
    } catch (error) {
      console.error('Failed to load walls:', error);
    }
  }, [activeTab]);

  const onRefresh = useCallback((): void => {
    setRefreshing(true);
    loadWalls().finally(() => setRefreshing(false));
  }, [loadWalls]);

  const joinWall = async (): Promise<void> => {
    const trimmed = joinId.trim();
    if (!trimmed) return;
    
    try {
      // Verify wall exists before joining
      await getWallInfo(trimmed);
      router.push(`/wall/${encodeURIComponent(trimmed)}`);
      setJoinId('');
    } catch (error) {
      Alert.alert('오류', '존재하지 않는 담벼락입니다.');
    }
  };

  const showCreateWallModal = useCallback((): void => {
    setShowCreateModal(true);
    setNewWallTitle('');
  }, []);

  const handleCreateWall = useCallback(async (): Promise<void> => {
    if (!newWallTitle.trim()) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await createWall(newWallTitle.trim());
      
      // Save wall data locally
      const wallData: WallData = {
        short_id: response.data.short_id,
        wall_id: response.data.wall_id,
        title: newWallTitle.trim(),
        created_at: new Date().toISOString(),
        creator_id: 'current_user_id' // Replace 'current_user_id' with the actual user ID
      };
      
      await saveWallData(wallData);
      await loadWalls();
      
      setShowCreateModal(false);
      setNewWallTitle('');
      Alert.alert('성공', '담벼락이 생성되었습니다.');
    } catch (error) {
      console.error('Failed to create wall:', error);
      Alert.alert('오류', '담벼락 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  }, [newWallTitle, loadWalls]);

  const deleteWall = async (shortId: string): Promise<void> => {
    try {
      Alert.alert(
        '담벼락 삭제',
        '정말로 이 담벼락을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await deleteWallData(shortId);
                if (result.success) {
                  await loadWalls();
                  Alert.alert('성공', '담벼락이 삭제되었습니다.');
                } else {
                  Alert.alert('오류', result.error || '담벼락을 삭제할 수 없습니다.');
                }
              } catch (error) {
                console.error('Failed to delete wall:', error);
                Alert.alert('오류', '담벼락을 삭제하는 중 오류가 발생했습니다.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error showing delete confirmation:', error);
    }
  };

  useFocusEffect(useCallback(() => {
    loadWalls();
  }, [activeTab]));

  const renderHeader = useCallback((): JSX.Element => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>담벼락</Text>
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setActiveTab('my')}>
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>내 담벼락</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('favorites')}>
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.activeTabText]}>즐겨찾기</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [activeTab]);

  const renderJoinContainer = useCallback((): JSX.Element => (
    <View style={styles.joinContainer}>
      <TextInput
        style={styles.input}
        placeholder="코드를 입력하세요"
        value={joinId}
        onChangeText={setJoinId}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={joinWall}
      />
      <TouchableOpacity 
        style={styles.addButton}
        onPress={joinWall}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  ), [joinId]);

  const renderPostsContainer = useCallback((): JSX.Element => (
    <View style={styles.postsContainer}>
      <FlatList
        data={walls}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.postsContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#007AFF']} // iOS
            tintColor="#007AFF" // iOS
            title="새로고침 중..." // iOS
            titleColor="#666" // iOS
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'my' ? '생성된 담벼락이 없습니다.' : '즐겨찾기한 담벼락이 없습니다.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.postItem}
            onPress={() => router.push(`/wall/${item.id}`)}
            onLongPress={() => deleteWall(item.short_id)}
          >
            <Text style={styles.postTitle} numberOfLines={1} ellipsizeMode="tail">
              {item.title}
            </Text>
            <Text style={styles.postSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {item.short_id}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  ), [walls, activeTab]);

  const renderFloatingActionButton = useCallback((): JSX.Element => (
    <TouchableOpacity style={styles.fab} onPress={showCreateWallModal}>
      <Text style={styles.fabText}>+</Text>
    </TouchableOpacity>
  ), [showCreateWallModal]);

  const renderModal = useCallback((): JSX.Element => (
    <Modal
      visible={showCreateModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>새 담벼락 만들기</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="담벼락 제목을 입력하세요"
            value={newWallTitle}
            onChangeText={setNewWallTitle}
            autoFocus={true}
            maxLength={50}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.createButton]}
              onPress={handleCreateWall}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>등록하기</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  ), [showCreateModal, newWallTitle, isCreating, handleCreateWall]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {renderHeader()}
        {renderJoinContainer()}
        {renderPostsContainer()}
        {renderFloatingActionButton()}
        {renderModal()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create<Record<string, any>>({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  modalInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  addButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  addButtonText: {
    fontSize: 24,
    color: '#333',
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  createButton: {
    backgroundColor: '#7eeaff',
  },
  cancelButtonText: {
    color: '#333',
  },
  createButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#7eeaff',
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
    fontFamily: 'BlackHanSans',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tabText: {
    fontSize: 18,
    color: '#000',
    opacity: 0.7,
  },
  activeTabText: {
    fontWeight: 'bold',
    opacity: 1,
  },
  joinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  joinButton: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#7eeaff',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  joinButtonText: {
    fontSize: 24,
    color: '#000',
    fontWeight: 'bold',
    lineHeight: 24,
  },
  postsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  postsContentContainer: {
    paddingBottom: 80, // FAB space
  },
  postItem: {
    backgroundColor: '#7eeaff',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  postTitle: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  postSubtitle: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7eeaff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  fabText: {
    fontSize: 30,
    color: '#000',
  }
});
