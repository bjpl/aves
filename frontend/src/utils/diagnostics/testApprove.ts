/**
 * Diagnostic: Test Approve Functionality
 * Run this in browser console to debug approve issues
 */

import { api } from '../../config/axios';

export async function testApproveRequest(annotationId: string) {
  console.log('🧪 TEST: Starting approve request test...');
  console.log('🧪 TEST: Annotation ID:', annotationId);

  try {
    console.log('🧪 TEST: Making POST request to:', `/api/ai/annotations/${annotationId}/approve`);

    const response = await api.post(
      `/api/ai/annotations/${annotationId}/approve`,
      {}
    );

    console.log('✅ TEST: Approve successful!', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ TEST: Approve failed!');
    console.error('❌ TEST: Error:', error);
    console.error('❌ TEST: Response:', error.response?.data);
    console.error('❌ TEST: Status:', error.response?.status);
    throw error;
  }
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).testApproveRequest = testApproveRequest;
  console.log('💡 Test function loaded! Usage: testApproveRequest("annotation-uuid-here")');
}
