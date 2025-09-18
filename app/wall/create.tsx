import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addMyWall, setWallTitle, addChildWall } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';

export default function CreateWallScreen() {
  const router = useRouter();
  const { parentId } = useLocalSearchParams<{ parentId?: string }>();
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('알림', '담벼락 이름을 입력해 주세요.');
      return;
    }

    try {
      setSubmitting(true);
      const newId = generateLocalWallId(trimmed);
      addMyWall(newId);
      setWallTitle(newId, trimmed);
      if (parentId && parentId.trim()) {
        addChildWall(parentId.trim(), newId);
      }
      router.replace(`/wall/${encodeURIComponent(String(newId))}`);
    } catch (error: any) {
      Alert.alert('생성 실패', error?.message ?? '알 수 없는 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  function generateLocalWallId(_: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 13;
    let out = '';
    for (let i = 0; i < length; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>담벼락 생성하기</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.container}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="제목 입력하기"
              value={title}
              onChangeText={setTitle}
              editable={!submitting}
              returnKeyType="done"
              autoFocus
            />
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (submitting || title.trim().length === 0) && styles.submitButtonDisabled]}
            onPress={handleCreate}
            disabled={submitting || title.trim().length === 0}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>등록하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  header: {
    backgroundColor: '#7eeaff',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'BlackHanSans',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 24,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  inputContainer: {
    backgroundColor: '#e0f7fa',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  input: {
    fontSize: 22,
    paddingVertical: 12,
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-medium',
    fontWeight: '600',
    letterSpacing: -0.5,
    color: '#1565c0',
  },
  footer: {
    backgroundColor: '#7eeaff',
    padding: 20,
    paddingBottom: 30, // Extra padding for home indicator
  },
  submitButton: {
    backgroundColor: '#38b6ff',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif-black',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});


