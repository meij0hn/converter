import { logger } from './logger';

// Token management utilities
export const TokenManager = {
  // Save authentication data
  saveAuthData: (accessToken: string, refreshToken: string, user: any) => {
    try {
      if (typeof window !== 'undefined') {
        logger.log('Saving auth data to localStorage')
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        localStorage.setItem('user_data', JSON.stringify(user))
      }
    } catch (error) {
      logger.error('Error saving auth data:', error)
    }
  },

  // Get access token
  getAccessToken: (): string | null => {
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token')
        logger.log('Getting access token:', token ? 'found' : 'not found')
        return token
      }
    } catch (error) {
      logger.error('Error getting access token:', error)
    }
    return null
  },

  // Get refresh token
  getRefreshToken: (): string | null => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('refresh_token')
      }
    } catch (error) {
      logger.error('Error getting refresh token:', error)
    }
    return null
  },

  // Get user data
  getUserData: (): any | null => {
    try {
      if (typeof window !== 'undefined') {
        const userData = localStorage.getItem('user_data')
        if (userData) {
          const parsed = JSON.parse(userData)
          logger.log('Getting user data:', parsed)
          return parsed
        }
      }
    } catch (error) {
      logger.error('Error getting user data:', error)
    }
    return null
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = TokenManager.getAccessToken()
    const user = TokenManager.getUserData()
    return !!(token && user)
  },

  // Clear all auth data
  clearAuthData: () => {
    try {
      if (typeof window !== 'undefined') {
        logger.log('Clearing auth data from localStorage')
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_data')
      }
    } catch (error) {
      logger.error('Error clearing auth data:', error)
    }
  },

  // Get Authorization header
  getAuthHeader: (): { Authorization: string } | Record<string, never> => {
    const token = TokenManager.getAccessToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
}