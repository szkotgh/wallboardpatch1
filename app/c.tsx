import { StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';

export default function CScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>c</Text>
      <Button title="다음" onPress={() => router.replace('/d')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 24,
  },
});


