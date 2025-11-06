// Error utility functions for handling user-friendly error messages

/**
 * Check if an error is a user rejection/cancellation
 */
export function isUserRejection(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorName = error.name?.toLowerCase() || '';
  const errorString = String(error).toLowerCase();
  
  // Check for common user rejection patterns
  const rejectionPatterns = [
    'user rejected',
    'user denied',
    'user cancelled',
    'user canceled',
    'rejected the request',
    'denied transaction',
    'user declined',
    'transaction was rejected',
    'user rejected the request',
    'user denied transaction signature',
  ];
  
  return rejectionPatterns.some(pattern => 
    errorMessage.includes(pattern) || 
    errorName.includes(pattern) || 
    errorString.includes(pattern)
  );
}

/**
 * Get a user-friendly error message
 * Returns a simple message for user rejections, otherwise returns the original error message
 */
export function getErrorMessage(error: any): string {
  if (isUserRejection(error)) {
    return 'Transaction cancelled by user';
  }
  
  // Return the error message if available, otherwise a generic message
  return error?.message || error?.toString() || 'An error occurred';
}

