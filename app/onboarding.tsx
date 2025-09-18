import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { setHasCompletedOnboarding } from '@/utils/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ONBOARDING_PAGES = [
  { description: '' },
  { description: '' },
  { description: '' },
];

export default function OnboardingScreen() {
  const [page, setPage] = useState(0);
  const router = useRouter();

  const goPrev = () => setPage((prev) => Math.max(prev - 1, 0));
  const goNext = () => {
    if (page === ONBOARDING_PAGES.length - 1) {
      handleStart();
    } else {
      setPage((prev) => prev + 1);
    }
  };

  const handleStart = () => {
    setHasCompletedOnboarding();
    router.replace('/b');
  };

  return (
    <View style={styles.root}>
      <View style={styles.outerBox}>
        <View style={styles.topBackground} />
        <View style={styles.card}>
          {page === 0 && (
            <Text style={[styles.welcomeText, { fontFamily: 'BlackHanSans' }]}>
              담벼락에 오신것을 환영합니다
            </Text>
          )}
          {page === 1 && (
            <Text style={[styles.welcomeText, { fontFamily: 'BlackHanSans' }]}>
              간편하게 담벼락을 생성해 생각을 수집해보세요
            </Text>
          )}
          {page === 2 && (
            <Text style={[styles.welcomeText, { fontFamily: 'BlackHanSans' }]}>
              지금 바로 첫 담벼락을{'\n'}생성해보세요
            </Text>
          )}
        </View>
        <View style={styles.contentArea}>
          <Text style={styles.description}>{ONBOARDING_PAGES[page].description}</Text>
        </View>
        <View style={[styles.navRow, page === ONBOARDING_PAGES.length - 1 && styles.navRowLast]}>
          <View style={styles.pagination}>
            {ONBOARDING_PAGES.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.paginationDot,
                  index === page && styles.paginationDotActive
                ]} 
              />
            ))}
          </View>
          {page === ONBOARDING_PAGES.length - 1 ? (
            <TouchableOpacity style={styles.startButton} onPress={goNext}>
              <Text style={styles.startButtonText}>시작하기</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.arrowBtn} onPress={goNext}>
              <Text style={styles.arrow}>{'>'}</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.bgCircleLarge} />
        <View style={styles.bgCircleSmall} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  outerBox: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
    backgroundColor: '#fff',
    position: 'relative',
  },
  topBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: '#7eeaff',
    zIndex: 0,
  },
  card: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    height: '25%',
    backgroundColor: '#fff',
    borderRadius: 20,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    fontFamily: 'BlackHanSans',
  },
  contentArea: {
    position: 'absolute',
    top: '52%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  description: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 30,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#29b6f6',
  },
  navRow: {
    position: 'absolute',
    top: '60%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: '10%',
    zIndex: 1,
  },
  navRowLast: {
    justifyContent: 'center',
  },
  arrowBtn: {
    padding: 10,
  },
  arrow: {
    fontSize: 36,
    color: '#333',
    fontWeight: '300',
  },
  arrowDisabled: {
    color: '#ccc',
  },
  startButton: {
    backgroundColor: '#29b6f6',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bgCircleLarge: {
    position: 'absolute',
    left: '-20%',
    bottom: '-15%',
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    backgroundColor: '#7eeaff',
    borderRadius: SCREEN_WIDTH * 0.3,
    opacity: 0.8,
    zIndex: 0,
  },
  bgCircleSmall: {
    position: 'absolute',
    left: '35%',
    bottom: '5%',
    width: SCREEN_WIDTH * 0.2,
    height: SCREEN_WIDTH * 0.2,
    backgroundColor: '#7eeaff',
    borderRadius: SCREEN_WIDTH * 0.1,
    opacity: 0.8,
    zIndex: 0,
  },
});
