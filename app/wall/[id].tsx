import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, FlatList, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Clipboard, ActivityIndicator, RefreshControl } from 'react-native';
import { useMemo, useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getWallData, isFavoriteWall, addFavoriteWall, removeFavoriteWall } from '@/utils/storage';
import { getWallInfo, createWallItem, getWallItemsList, type WallItem as ApiWallItem } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function WallScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const wallId = useMemo(() => (Array.isArray(id) ? id[0] : id) ?? '', [id]);
  
  const [wallTitle, setWallTitle] = useState('담벼락');
  const [items, setItems] = useState<ApiWallItem[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadItems = useCallback(async (showLoading = true) => {
    if (!wallId) return;
    
    if (showLoading) {
      setIsLoading(true);
    }
    
    try {
      // Verify wall exists and get wall info
      const wallInfo = await getWallInfo(wallId);
      setWallTitle(wallInfo.data.title);
      
      // Load wall items
      const itemsResponse = await getWallItemsList(wallId);
      // Sort items by create_at in descending order (newest first)
      const sortedItems = (itemsResponse.data || []).sort((a, b) => 
        new Date(b.create_at).getTime() - new Date(a.create_at).getTime()
      );
      setItems(sortedItems);
    } catch (error) {
      console.error('Failed to load wall:', error);
      if (error instanceof Error) {
        // Don't show error for empty wall items
        if (error.message.includes('No wall items found')) {
          setItems([]);
          return;
        }
        
        if (error.message.includes('404') || error.message.includes('not found')) {
          Alert.alert('오류', '존재하지 않는 담벼락이거나 접근할 수 없습니다.', [
            { text: '확인', onPress: () => router.replace('/b') },
          ]);
        } else {
          Alert.alert('오류', '담벼락을 불러오는 중 오류가 발생했습니다.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [wallId, router]);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        await loadItems();
        const favoriteStatus = await isFavoriteWall(wallId);
        setIsFavorite(favoriteStatus);
      };
      
      loadData();
      
      // Set up an interval to refresh the wall items every 30 seconds
      const intervalId = setInterval(() => {
        loadItems(false); // Don't show loading indicator for auto-refresh
      }, 30000);
      
      return () => clearInterval(intervalId);
    }, [wallId, loadItems])
  );
  
  const onRefresh = useCallback(() => {
    loadItems();
  }, [loadItems]);

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await removeFavoriteWall(wallId);
        setIsFavorite(false);
      } else {
        await addFavoriteWall(wallId);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Failed to update favorite status:', error);
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(wallId);
    Alert.alert('복사 완료', '담벼락 코드가 클립보드에 복사되었습니다.');
  };

  const submitCompose = async () => {
    const t = composeTitle.trim();
    const m = composeMessage.trim();
    if (!t || !m) {
      Alert.alert('오류', '제목과 내용을 모두 입력해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createWallItem(wallId, t, m);
      await loadItems();
      setComposeTitle('');
      setComposeMessage('');
      setComposeOpen(false);
      Alert.alert('성공', '게시물이 등록되었습니다.');
    } catch (error) {
      console.error('Failed to add wall item:', error);
      Alert.alert('오류', '메시지를 추가하는 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }: { item: ApiWallItem }) => (
    <View style={styles.postCard}>
      <View style={styles.postTitleContainer}>
        <Text style={styles.postTitle} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <Text style={styles.postDate}>
          {new Date(item.create_at).toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      </View>
      <View style={styles.postContentContainer}>
        <Text style={styles.postContent}>
          {item.message}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{wallTitle}</Text>
          <TouchableOpacity style={styles.codeContainer} onPress={copyToClipboard}>
            <Text style={styles.headerCode}>코드: {wallId}</Text>
            <Ionicons name="copy-outline" size={14} color="#666" style={{ marginLeft: 5 }} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={toggleFavorite}>
          <Ionicons name={isFavorite ? 'star' : 'star-outline'} size={24} color={isFavorite ? '#FFD700' : '#000'} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7eeaff" />
          <Text style={styles.loadingText}>담벼락을 불러오는 중...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
              title="새로고침 중..."
              titleColor="#666"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={60} color="#CCCCCC" />
              <Text style={styles.emptyText}>아직 작성된 글이 없어요</Text>
              <Text style={styles.emptySubtext}>하단의 + 버튼을 눌러 글을 작성해보세요!</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setComposeOpen(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={composeOpen}
        onRequestClose={() => setComposeOpen(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.inputCard}>
            <TextInput
              style={styles.input}
              placeholder="게시물 제목"
              value={composeTitle}
              onChangeText={setComposeTitle}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="내용있는칸"
              value={composeMessage}
              onChangeText={setComposeMessage}
              multiline
              returnKeyType="done"
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, isSubmitting && styles.disabledButton]} 
                onPress={submitCompose}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>등록</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setComposeOpen(false)}>
                <Text style={styles.actionButtonText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F8FF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a1a',
    fontFamily: 'BlackHanSans',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerCode: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'SpaceMono',
    fontWeight: '500',
  },
  listContent: { 
    padding: 16,
    paddingBottom: 80, // Ensure space for FAB
  },
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  postTitleContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0d47a1',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-black',
    letterSpacing: -0.5,
    textTransform: 'none',
  },
  postContentContainer: {
    padding: 20,
    paddingTop: 10,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    shadowRadius: 5,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  inputCard: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    marginLeft: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#B3E5FC',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
  emptySubtext: {
    color: '#AAA',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#03A9F4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  postDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
});

