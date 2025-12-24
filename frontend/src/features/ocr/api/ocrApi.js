// kilogram-app/src/features/ocr/api/ocrApi.js
import { apiClient } from '@/lib/axios';

export const ocrApi = {
  processNutritionLabel: async (imageFile) => {
    console.log('=== ocrApi.processNutritionLabel 開始 ===');
    console.log('送信するFile:', {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type,
      lastModified: imageFile.lastModified,
    });
    
    const maxSize = 10 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      throw new Error(`ファイルサイズが大きすぎます（最大10MB、現在${(imageFile.size / 1024 / 1024).toFixed(2)}MB）`);
    }
    
    const formData = new FormData();
    formData.append('image', imageFile);
    
    console.log('FormData内容:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
      if (value instanceof File) {
        console.log(`    -> File詳細: name=${value.name}, size=${value.size}, type=${value.type}`);
      }
    }
    
    try {
      console.log('APIリクエスト送信: POST /api/ocr/nutrition-label/');
      
      const response = await apiClient.post('/ocr/nutrition-label/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });
      
      console.log('APIレスポンス受信:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });
      
      console.log('=== ocrApi.processNutritionLabel 成功 ===');
      return response.data;
      
    } catch (error) {
      console.error('=== ocrApi.processNutritionLabel エラー ===');
      
      if (error.response) {
        console.error('エラーレスポンス:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      } else if (error.request) {
        console.error('リクエスト送信エラー（レスポンスなし）:', error.request);
      } else {
        console.error('エラー:', error.message);
      }
      
      throw error;
    }
  },
};

export default ocrApi;