type WallId = string;
export type WallItem = {
  id: string;
  title: string;
  message: string;
  createdAt: number;
  ownedByMe?: boolean;
};

// Generate a unique identifier for the current device/user
const getDeviceId = async (): Promise<string> => {
  let deviceId = await AsyncStorage.getItem('@device_id');
  if (!deviceId) {
    deviceId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    await AsyncStorage.setItem('@device_id', deviceId);
  }
  return deviceId;
};

export type WallData = {
  short_id: string;
  wall_id: string;
  title: string;
  created_at?: string;
  creator_id: string; // Added to track wall creator
};

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use AsyncStorage for both web and mobile
async function readKey<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return fallback;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error reading from storage:', error);
    return fallback;
  }
}

async function writeKey<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to storage:', error);
    throw error;
  }
}

async function deleteKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing item from storage:', error);
    throw error;
  }
}

const MY_WALLS_KEY = 'myWalls';
const FAVORITE_WALLS_KEY = 'favoriteWalls';
const WALL_ITEMS_PREFIX = 'wallItems:'; // per-wall storage
const WALL_META_KEY = 'wallMeta'; // { [id]: { title } }
const WALL_CHILDREN_KEY = 'wallChildren'; // { [parentId]: WallId[] }
const ONBOARDING_KEY = 'onboardingCompleted';
const WALL_DATA_KEY = 'wallData'; // { [short_id]: WallData }

export async function getMyWalls(): Promise<WallId[]> {
  return await readKey(MY_WALLS_KEY, []);
}

export async function hasCompletedOnboarding(): Promise<boolean> {
  return await readKey(ONBOARDING_KEY, false);
}

export async function setHasCompletedOnboarding(): Promise<void> {
  await writeKey(ONBOARDING_KEY, true);
}

export async function addMyWall(id: WallId): Promise<void> {
  const walls = await getMyWalls();
  if (!walls.includes(id)) {
    walls.push(id);
    await writeKey(MY_WALLS_KEY, walls);
  }
}

export async function getFavoriteWalls(): Promise<WallId[]> {
  return await readKey(FAVORITE_WALLS_KEY, []);
}

export async function addFavoriteWall(id: WallId): Promise<void> {
  const favorites = await getFavoriteWalls();
  if (!favorites.includes(id)) {
    favorites.push(id);
    await writeKey(FAVORITE_WALLS_KEY, favorites);
  }
}

export async function removeFavoriteWall(id: WallId): Promise<void> {
  const favorites = (await getFavoriteWalls()).filter((wallId) => wallId !== id);
  await writeKey(FAVORITE_WALLS_KEY, favorites);
}

export async function isFavoriteWall(id: WallId): Promise<boolean> {
  const favorites = await getFavoriteWalls();
  return favorites.includes(id);
}

export async function isKnownWall(id: WallId): Promise<boolean> {
  const [myWalls, favorites] = await Promise.all([
    getMyWalls(),
    getFavoriteWalls()
  ]);
  return myWalls.includes(id) || favorites.includes(id);
}

function getWallItemsKey(id: WallId): string {
  return `${WALL_ITEMS_PREFIX}${id}`;
}

export async function getWallItems(id: WallId): Promise<WallItem[]> {
  return await readKey(getWallItemsKey(id), []);
}

export async function addWallItem(id: WallId, item: { title: string; message: string }): Promise<WallItem> {
  const items = await getWallItems(id);
  const newItem: WallItem = {
    ...item,
    id: generateItemId(),
    createdAt: Date.now(),
    ownedByMe: true,
  };
  items.push(newItem);
  await writeKey(getWallItemsKey(id), items);
  return newItem;
}

function generateItemId(): string {
  return Math.random().toString(36).substring(2, 15);
}

interface WallMeta {
  title?: string;
}

export async function getWallMeta(): Promise<Record<WallId, WallMeta>> {
  return await readKey(WALL_META_KEY, {});
}

export async function setWallTitle(id: WallId, title: string): Promise<void> {
  const meta = await getWallMeta();
  meta[id] = { ...meta[id], title };
  await writeKey(WALL_META_KEY, meta);
}

export async function getWallTitle(id: WallId): Promise<string | undefined> {
  const meta = await getWallMeta();
  return meta[id]?.title;
}

interface ChildrenMap {
  [parentId: string]: WallId[];
}

export async function getChildWalls(parentId: WallId): Promise<WallId[]> {
  const children = await readKey<ChildrenMap>(WALL_CHILDREN_KEY, {});
  return children[parentId] || [];
}

export async function addChildWall(parentId: WallId, childId: WallId): Promise<void> {
  const children = await readKey<ChildrenMap>(WALL_CHILDREN_KEY, {});
  if (!children[parentId]) {
    children[parentId] = [];
  }
  if (!children[parentId].includes(childId)) {
    children[parentId].push(childId);
    await writeKey(WALL_CHILDREN_KEY, children);
  }
}

// Wall data management functions
export async function saveWallData(wallData: WallData): Promise<void> {
  const allWallData = await readKey<Record<string, WallData>>(WALL_DATA_KEY, {});
  allWallData[wallData.short_id] = wallData;
  await writeKey(WALL_DATA_KEY, allWallData);
  
  // Also add to my walls list using short_id
  await addMyWall(wallData.short_id);
}

export async function getWallData(shortId: string): Promise<WallData | null> {
  const allWallData = await readKey<Record<string, WallData>>(WALL_DATA_KEY, {});
  return allWallData[shortId] || null;
}

export async function getAllWallData(): Promise<WallData[]> {
  const allWallData = await readKey<Record<string, WallData>>(WALL_DATA_KEY, {});
  return Object.values(allWallData);
}

export const deleteWallData = async (shortId: string): Promise<{success: boolean, error?: string}> => {
  try {
    // Get all wall data first
    const allWallData = await readKey<Record<string, WallData>>(WALL_DATA_KEY, {});
    const wallData = allWallData[shortId];
    
    if (!wallData) {
      return { success: false, error: '담벼락을 찾을 수 없습니다.' };
    }
    
    // Verify current user is the creator
    const currentDeviceId = await getDeviceId();
    if (wallData.creator_id !== currentDeviceId) {
      return { success: false, error: '작성자만 담벼락을 삭제할 수 있습니다.' };
    }
    
    // Remove from wall metadata
    const meta = await getWallMeta();
    if (meta[wallData.wall_id]) {
      delete meta[wallData.wall_id];
      await writeKey(WALL_META_KEY, meta);
    }

    // Remove from children references
    const children = await readKey<ChildrenMap>(WALL_CHILDREN_KEY, {});
    let shouldUpdateChildren = false;

    // Remove this wall from any parent's children list
    Object.keys(children).forEach((parentId) => {
      if (children[parentId].includes(wallData.wall_id)) {
        children[parentId] = children[parentId].filter(childId => childId !== wallData.wall_id);
        shouldUpdateChildren = true;
      }
    });

    // Remove this wall's children list
    if (children[wallData.wall_id]) {
      delete children[wallData.wall_id];
      shouldUpdateChildren = true;
    }

    if (shouldUpdateChildren) {
      await writeKey(WALL_CHILDREN_KEY, children);
    }
    
    // Remove from favorites
    const favorites = await getFavoriteWalls();
    const updatedFavorites = favorites.filter(id => id !== shortId);
    if (favorites.length !== updatedFavorites.length) {
      await writeKey(FAVORITE_WALLS_KEY, updatedFavorites);
    }
    
    // Remove from my walls
    const myWalls = await getMyWalls();
    const updatedMyWalls = myWalls.filter(id => id !== shortId);
    if (myWalls.length !== updatedMyWalls.length) {
      await writeKey(MY_WALLS_KEY, updatedMyWalls);
    }
    
    // Finally, remove from wall data
    delete allWallData[shortId];
    await writeKey(WALL_DATA_KEY, allWallData);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete wall:', error);
    return { success: false, error: '담벼락 삭제 중 오류가 발생했습니다.' };
  }
};
