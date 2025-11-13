package com.cryptopulse.app.network

import com.cryptopulse.app.network.model.SupabaseSignUpRequest
import com.cryptopulse.app.network.model.SupabaseTokenRequest
import com.cryptopulse.app.network.model.SupabaseTokenResponse
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.Headers
import retrofit2.http.POST
import retrofit2.http.Query

interface SupabaseAuthService {

    @POST("auth/v1/signup")
    suspend fun signUp(
        @Header("apikey") apiKey: String,
        @Header("Authorization") authorization: String,
        @Body body: SupabaseSignUpRequest
    ): SupabaseTokenResponse

    @POST("auth/v1/token")
    suspend fun signInWithPassword(
        @Header("apikey") apiKey: String,
        @Header("Authorization") authorization: String,
        @Query("grant_type") grantType: String = "password",
        @Body body: SupabaseTokenRequest
    ): SupabaseTokenResponse
}


