const API_BASE_URL = 'https://wallboard.szk.kr';

export interface WallCreateResponse {
  code: number;
  data: {
    short_id: string;
    wall_id: string;
  };
  message: string;
}

export interface WallInfoResponse {
  code: number;
  data: {
    create_at: string;
    create_ip: string;
    title: string;
  };
  message: string;
}

export interface WallItemCreateResponse {
  code: number;
  data: {
    item_id: string;
  };
  message: string;
}

export interface WallItem {
  id: string;
  title: string;
  message: string;
  create_at: string;
  create_ip: string;
}

export interface WallItemsListResponse {
  code: number;
  data: WallItem[];
  message: string;
}

export interface DeleteWallResponse {
  code: number;
  data: null;
  message: string;
}

// Create a new wall
export async function createWall(title: string): Promise<WallCreateResponse> {
  console.log('🚀 API Request: POST', `${API_BASE_URL}/wall`, { title });
  
  const response = await fetch(`${API_BASE_URL}/wall`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ title }).toString(),
  });

  const data = await response.json();
  console.log('📥 API Response:', response.status, data);
  
  if (data.code !== 201) {
    throw new Error(data.message || 'Failed to create wall');
  }
  
  return data;
}

// Get wall information by short_id
export async function getWallInfo(wallShortId: string): Promise<WallInfoResponse> {
  const url = `${API_BASE_URL}/wall?wall_short_id=${encodeURIComponent(wallShortId)}`;
  console.log('🚀 API Request: GET', url);
  
  const response = await fetch(url, {
    method: 'GET',
  });

  const data = await response.json();
  console.log('📥 API Response:', response.status, data);
  
  if (data.code !== 200) {
    throw new Error(data.message || 'Failed to get wall info');
  }
  
  return data;
}

// Create a wall item
export async function createWallItem(wallShortId: string, title: string, message: string): Promise<WallItemCreateResponse> {
  const formData = new FormData();
  formData.append('wall_short_id', wallShortId);
  formData.append('title', title);
  formData.append('message', message);

  const response = await fetch(`${API_BASE_URL}/wall_item`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  
  if (data.code !== 201) {
    throw new Error(data.message || 'Failed to create wall item');
  }
  
  return data;
}

// Delete a wall
export async function deleteWall(wallId: string): Promise<DeleteWallResponse> {
  console.log('🚀 [deleteWall] Starting delete request for wallId:', wallId);
  
  if (!wallId) {
    const error = new Error('Wall ID is required');
    console.error('[deleteWall] Error:', error);
    throw error;
  }
  
  const formData = new FormData();
  formData.append('wall_id', wallId);
  
  try {
    console.log('📤 [deleteWall] Sending DELETE request to server...');
    console.log('   - URL:', `${API_BASE_URL}/wall`);
    console.log('   - Payload:', { wall_id: wallId });
    
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/wall`, {
      method: 'DELETE',
      body: formData,
      headers: {
        'Accept': 'application/json',
        // Note: Don't set Content-Type header for FormData, let the browser set it with the correct boundary
      },
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`⏱️ [deleteWall] Response received in ${responseTime}ms`);
    console.log('   - Status:', response.status, response.statusText);
    
    let responseData;
    try {
      responseData = await response.json();
      console.log('📥 [deleteWall] Response data:', responseData);
    } catch (parseError) {
      console.error('❌ [deleteWall] Failed to parse JSON response:', parseError);
      throw new Error('서버 응답을 처리할 수 없습니다');
    }
    
    if (!response.ok && response.status !== 404) {
      const errorMessage = responseData?.message || `서버 오류 (${response.status})`;
      console.error(`❌ [deleteWall] Server error (${response.status}):`, errorMessage);
      throw new Error(errorMessage);
    }
    
    console.log('✅ [deleteWall] Request successful');
    return responseData;
    
  } catch (error) {
    console.error('❌ [deleteWall] Network/Request error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('네트워크 요청에 실패했습니다');
  }
}

// Get wall items list
export async function getWallItemsList(wallShortId: string): Promise<WallItemsListResponse> {
  const url = `${API_BASE_URL}/wall_item/list?wall_short_id=${encodeURIComponent(wallShortId)}`;
  console.log('🚀 API Request: GET', url);
  
  const response = await fetch(url, {
    method: 'GET',
  });

  const data = await response.json();
  console.log('📥 API Response:', response.status, data);
  
  // Handle empty response or no items case
  if (!data.data || data.data.length === 0) {
    console.log('No items found for wall, returning empty array');
    return { code: 200, data: [], message: 'No items found' };
  }
  
  if (data.code !== 200) {
    throw new Error(data.message || 'Failed to get wall items');
  }
  
  return data;
}


