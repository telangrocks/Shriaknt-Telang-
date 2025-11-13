package com.cryptopulse.app.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.cryptopulse.app.repository.AuthRepository
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = AuthRepository(application)

    private val _loginSuccess = MutableLiveData<Boolean>()
    val loginSuccess: LiveData<Boolean> = _loginSuccess

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun authenticate(email: String, password: String, createAccount: Boolean) {
        val trimmedEmail = email.trim()
        val trimmedPassword = password.trim()

        if (!isEmailValid(trimmedEmail)) {
            _error.value = INVALID_EMAIL_MESSAGE
            return
        }

        if (trimmedPassword.length < PASSWORD_MIN_LENGTH) {
            _error.value = PASSWORD_TOO_SHORT_MESSAGE
            return
        }

        _isLoading.value = true
        _error.value = null

        viewModelScope.launch {
            try {
                val response = repository.authenticateWithEmail(
                    email = trimmedEmail,
                    password = trimmedPassword,
                    createAccount = createAccount
                )

                if (response.success) {
                    _loginSuccess.postValue(true)
                    _error.postValue(response.message)
                } else {
                    _error.postValue(response.message ?: response.error ?: GENERIC_AUTH_ERROR)
                }
            } catch (exception: Exception) {
                _error.postValue(resolveError(exception))
            } finally {
                _isLoading.postValue(false)
            }
        }
    }

    fun consumeError() {
        _error.value = null
    }

    fun clearSuccess() {
        _loginSuccess.value = false
    }


    private fun isEmailValid(email: String): Boolean {
        return email.matches(EMAIL_REGEX)
    }

    private fun resolveError(exception: Throwable): String {
        return when (exception) {
            is HttpException -> parseHttpException(exception)
            is UnknownHostException -> HOST_UNREACHABLE_MESSAGE
            is SocketTimeoutException -> REQUEST_TIMEOUT_MESSAGE
            is ConnectException -> CONNECTION_FAILED_MESSAGE
            is IOException -> NETWORK_ERROR_MESSAGE
            else -> exception.message ?: GENERIC_UNEXPECTED_ERROR
        }
    }

    private fun parseHttpException(exception: HttpException): String {
        val body = exception.response()?.errorBody()
            ?: return GENERIC_HTTP_ERROR_PREFIX + exception.code()
        return body.charStream().use { reader ->
            runCatching {
                val text = reader.readText()
                if (text.isNotEmpty()) {
                    val json = JSONObject(text)
                    json.optString("message", json.optString("error", GENERIC_HTTP_ERROR_PREFIX + exception.code()))
                } else {
                    GENERIC_HTTP_ERROR_PREFIX + exception.code()
                }
            }.getOrElse {
                GENERIC_HTTP_ERROR_PREFIX + exception.code()
            }
        }
    }

    companion object {
        private val EMAIL_REGEX = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")
        private const val PASSWORD_MIN_LENGTH = 8

        private const val INVALID_EMAIL_MESSAGE = "Please enter a valid email address."
        private const val PASSWORD_TOO_SHORT_MESSAGE = "Password must be at least 8 characters long."
        private const val GENERIC_AUTH_ERROR = "Authentication failed. Please try again."
        private const val GENERIC_UNEXPECTED_ERROR = "Unexpected error occurred."
        private const val GENERIC_HTTP_ERROR_PREFIX = "Request failed with status "
        private const val NETWORK_ERROR_MESSAGE = "Network error. Please check your connection."
        private const val HOST_UNREACHABLE_MESSAGE = "Cannot reach Cryptopulse servers. Check your internet connection or API configuration."
        private const val REQUEST_TIMEOUT_MESSAGE = "The server took too long to respond. Please try again."
        private const val CONNECTION_FAILED_MESSAGE = "Unable to establish a connection. Please retry."
    }
}

