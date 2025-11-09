package com.cryptopulse.app.network.model

import com.google.gson.annotations.SerializedName

data class RequestOtpRequest(
    val phone: String
)

data class RequestOtpResponse(
    val success: Boolean,
    val message: String? = null,
    val expiresIn: Int? = null,
    val error: String? = null
)

data class VerifyOtpRequest(
    val phone: String,
    val otp: String
)

data class VerifyOtpResponse(
    val success: Boolean,
    val message: String? = null,
    val token: String? = null,
    val refreshToken: String? = null,
    val user: VerifiedUser? = null,
    val error: String? = null
)

data class VerifiedUser(
    val id: String,
    val phone: String,
    @SerializedName("isNewUser")
    val isNewUser: Boolean
)

data class RefreshTokenRequest(
    val refreshToken: String
)

data class RefreshTokenResponse(
    val success: Boolean,
    val token: String? = null,
    val refreshToken: String? = null,
    val message: String? = null,
    val error: String? = null
)

data class LogoutResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
)

