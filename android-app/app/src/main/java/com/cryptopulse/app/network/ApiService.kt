package com.cryptopulse.app.network

import com.cryptopulse.app.network.model.FirebaseLoginRequest
import com.cryptopulse.app.network.model.LogoutResponse
import com.cryptopulse.app.network.model.RefreshTokenRequest
import com.cryptopulse.app.network.model.RefreshTokenResponse
import com.cryptopulse.app.network.model.RequestOtpRequest
import com.cryptopulse.app.network.model.RequestOtpResponse
import com.cryptopulse.app.network.model.VerifyOtpRequest
import com.cryptopulse.app.network.model.VerifyOtpResponse
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface ApiService {

    @POST("auth/request-otp")
    suspend fun requestOtp(
        @Body body: RequestOtpRequest
    ): RequestOtpResponse

    @POST("auth/verify-otp")
    suspend fun verifyOtp(
        @Body body: VerifyOtpRequest
    ): VerifyOtpResponse

    @POST("auth/firebase-login")
    suspend fun firebaseLogin(
        @Body body: FirebaseLoginRequest
    ): VerifyOtpResponse

    @POST("auth/refresh-token")
    suspend fun refreshToken(
        @Body body: RefreshTokenRequest
    ): RefreshTokenResponse

    @POST("auth/logout")
    suspend fun logout(
        @Header("Authorization") authorization: String
    ): LogoutResponse
}

