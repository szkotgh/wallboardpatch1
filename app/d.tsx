import { StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';

export default function DScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>d</Text>
      <Button title="처음으로" onPress={() => router.replace('/a')} />
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


