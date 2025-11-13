package com.cryptopulse.app.network

import com.cryptopulse.app.network.model.SessionExchangeResponse
import com.cryptopulse.app.network.model.LogoutResponse
import com.cryptopulse.app.network.model.RefreshTokenRequest
import com.cryptopulse.app.network.model.RefreshTokenResponse
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {

    @POST("auth/supabase-login")
    suspend fun supabaseLogin(
        @Body body: com.cryptopulse.app.network.model.SupabaseLoginRequest
    ): SessionExchangeResponse

    @POST("auth/refresh-token")
    suspend fun refreshToken(
        @Body body: RefreshTokenRequest
    ): RefreshTokenResponse

    @POST("auth/logout")
    suspend fun logout(
        @Header("Authorization") authorization: String
    ): LogoutResponse
}

