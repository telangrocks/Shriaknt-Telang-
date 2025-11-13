package com.cryptopulse.app.network.model

import com.google.gson.annotations.SerializedName

data class SupabaseSignUpRequest(
    val email: String,
    val password: String
)

data class SupabaseTokenRequest(
    val email: String,
    val password: String
)

data class SupabaseTokenResponse(
    @SerializedName("access_token")
    val accessToken: String?,
    @SerializedName("refresh_token")
    val refreshToken: String?,
    @SerializedName("expires_in")
    val expiresIn: Int?,
    @SerializedName("token_type")
    val tokenType: String?,
    val user: SupabaseUser?
)

data class SupabaseUser(
    val id: String,
    val email: String?
)

data class SupabaseErrorResponse(
    val error: String?,
    val error_description: String?
)

data class SupabaseLoginRequest(
    val accessToken: String
)

data class SessionExchangeResponse(
    val success: Boolean,
    val message: String? = null,
    val token: String? = null,
    val refreshToken: String? = null,
    val user: AuthenticatedUser? = null,
    val error: String? = null
)

data class AuthenticatedUser(
    val id: String,
    val email: String?,
    @SerializedName("isNewUser")
    val isNewUser: Boolean
)

data class GenericResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
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

