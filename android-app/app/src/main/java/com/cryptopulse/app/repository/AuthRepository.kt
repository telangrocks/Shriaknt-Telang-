package com.cryptopulse.app.repository

import android.content.Context
import com.cryptopulse.app.network.ApiClient
import com.cryptopulse.app.network.model.RefreshTokenRequest
import com.cryptopulse.app.network.model.RefreshTokenResponse
import com.cryptopulse.app.network.model.RequestOtpRequest
import com.cryptopulse.app.network.model.RequestOtpResponse
import com.cryptopulse.app.network.model.VerifyOtpRequest
import com.cryptopulse.app.network.model.VerifyOtpResponse
import com.cryptopulse.app.utils.PreferenceManager
import kotlinx.coroutines.delay
import retrofit2.HttpException
import java.io.IOException

class AuthRepository(context: Context) {

    private val api = ApiClient.apiService
    private val preferences = PreferenceManager(context.applicationContext)

    suspend fun requestOtp(phone: String): RequestOtpResponse {
        return executeWithRetry { api.requestOtp(RequestOtpRequest(phone = phone)) }
    }

    suspend fun verifyOtp(phone: String, otp: String): VerifyOtpResponse {
        val response = executeWithRetry {
            api.verifyOtp(
                VerifyOtpRequest(
                    phone = phone,
                    otp = otp
                )
            )
        }

        if (response.success && !response.token.isNullOrBlank()) {
            preferences.putString(KEY_ACCESS_TOKEN, response.token)
            preferences.putString(KEY_REFRESH_TOKEN, response.refreshToken.orEmpty())
            preferences.putString(KEY_USER_ID, response.user?.id.orEmpty())
            preferences.putString(KEY_USER_PHONE, response.user?.phone ?: phone)
            preferences.putBoolean(KEY_IS_LOGGED_IN, true)
            preferences.putBoolean(KEY_IS_NEW_USER, response.user?.isNewUser ?: false)
        }

        return response
    }

    suspend fun refreshToken(forceRefreshToken: String? = null): RefreshTokenResponse {
        val refreshToken = forceRefreshToken ?: getRefreshToken()
        if (refreshToken.isBlank()) {
            return RefreshTokenResponse(
                success = false,
                error = "Missing refresh token"
            )
        }

        val response = executeWithRetry {
            api.refreshToken(RefreshTokenRequest(refreshToken))
        }

        if (response.success && !response.token.isNullOrBlank()) {
            preferences.putString(KEY_ACCESS_TOKEN, response.token)
            preferences.putString(KEY_REFRESH_TOKEN, response.refreshToken.orEmpty())
            preferences.putBoolean(KEY_IS_LOGGED_IN, true)
        }

        return response
    }

    suspend fun logout(): Boolean {
        val token = getAccessToken()
        return try {
            if (token.isNotBlank()) {
                executeWithRetry {
                    api.logout("Bearer $token")
                }
            }
            true
        } catch (_: Exception) {
            false
        } finally {
            clearSession()
        }
    }

    fun clearSession() {
        preferences.remove(KEY_ACCESS_TOKEN)
        preferences.remove(KEY_REFRESH_TOKEN)
        preferences.remove(KEY_USER_ID)
        preferences.remove(KEY_USER_PHONE)
        preferences.putBoolean(KEY_IS_LOGGED_IN, false)
        preferences.putBoolean(KEY_IS_NEW_USER, false)
    }

    fun getAccessToken(): String = preferences.getString(KEY_ACCESS_TOKEN)

    fun getRefreshToken(): String = preferences.getString(KEY_REFRESH_TOKEN)

    fun isLoggedIn(): Boolean = preferences.getBoolean(KEY_IS_LOGGED_IN)

    private suspend fun <T> executeWithRetry(
        maxAttempts: Int = 3,
        initialDelayMillis: Long = 400,
        block: suspend () -> T
    ): T {
        var currentDelay = initialDelayMillis
        repeat(maxAttempts - 1) { attempt ->
            try {
                return block()
            } catch (error: Exception) {
                val shouldRetry = when (error) {
                    is IOException -> true
                    is HttpException -> error.code() >= 500
                    else -> false
                }

                if (!shouldRetry) {
                    throw error
                }

                delay(currentDelay)
                currentDelay *= 2
                if (attempt == maxAttempts - 2) {
                    throw error
                }
            }
        }
        return block()
    }

    companion object {
        private const val KEY_ACCESS_TOKEN = "auth_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_PHONE = "user_phone"
        private const val KEY_IS_LOGGED_IN = "is_logged_in"
        private const val KEY_IS_NEW_USER = "is_new_user"
    }
}

