package com.cryptopulse.app.network

import com.cryptopulse.app.network.model.FirebaseLoginRequest
import com.cryptopulse.app.network.model.GenericResponse
import com.cryptopulse.app.network.model.LogoutResponse
import com.cryptopulse.app.network.model.RefreshTokenRequest
import com.cryptopulse.app.network.model.RefreshTokenResponse
import com.cryptopulse.app.network.model.RegisterDeviceTokenRequest
import com.cryptopulse.app.network.model.VerifyOtpResponse
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {

    @POST("auth/firebase-login")
    suspend fun firebaseLogin(
        @Body body: FirebaseLoginRequest
    ): VerifyOtpResponse

    @POST("user/device-tokens")
    suspend fun registerDeviceToken(
        @Header("Authorization") authorization: String,
        @Body body: RegisterDeviceTokenRequest
    ): GenericResponse

    @POST("auth/refresh-token")
    suspend fun refreshToken(
        @Body body: RefreshTokenRequest
    ): RefreshTokenResponse

    @POST("auth/logout")
    suspend fun logout(
        @Header("Authorization") authorization: String
    ): LogoutResponse
}

