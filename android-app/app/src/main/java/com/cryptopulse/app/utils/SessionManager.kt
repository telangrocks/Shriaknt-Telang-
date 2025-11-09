package com.cryptopulse.app.utils

import android.content.Context
import com.cryptopulse.app.repository.AuthRepository

class SessionManager(context: Context) {

    private val authRepository = AuthRepository(context.applicationContext)

    fun isLoggedIn(): Boolean = authRepository.isLoggedIn()

    fun accessToken(): String = authRepository.getAccessToken()

    fun refreshToken(): String = authRepository.getRefreshToken()

    suspend fun refreshSession(): Boolean {
        val response = authRepository.refreshToken()
        return response.success && !response.token.isNullOrBlank()
    }

    suspend fun logout(): Boolean = authRepository.logout()
}

