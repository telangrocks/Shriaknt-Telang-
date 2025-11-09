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

    private val _otpSent = MutableLiveData<Boolean>()
    val otpSent: LiveData<Boolean> = _otpSent

    private val _otpMessage = MutableLiveData<String?>()
    val otpMessage: LiveData<String?> = _otpMessage

    private val _loginSuccess = MutableLiveData<Boolean>()
    val loginSuccess: LiveData<Boolean> = _loginSuccess

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private var lastAction: PendingAction = PendingAction.None

    fun requestOTP(rawPhone: String) {
        val phone = rawPhone.trim()
        if (!isPhoneValid(phone)) {
            _error.value = INVALID_PHONE_MESSAGE
            return
        }

        lastAction = PendingAction.RequestOtp(phone)
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = repository.requestOtp(phone)
                if (response.success) {
                    _otpSent.value = true
                    _otpMessage.value = response.message
                    _error.value = null
                } else {
                    handleError(response.message ?: response.error ?: GENERIC_OTP_ERROR)
                }
            } catch (ex: Exception) {
                handleError(resolveError(ex))
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun verifyOTP(rawPhone: String, rawOtp: String) {
        val phone = rawPhone.trim()
        val otp = rawOtp.trim()

        if (!isPhoneValid(phone)) {
            _error.value = INVALID_PHONE_MESSAGE
            return
        }

        if (!isOtpValid(otp)) {
            _error.value = INVALID_OTP_MESSAGE
            return
        }

        lastAction = PendingAction.VerifyOtp(phone, otp)
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = repository.verifyOtp(phone, otp)
                if (response.success && !response.token.isNullOrBlank()) {
                    _loginSuccess.value = true
                    _error.value = null
                } else {
                    handleError(response.message ?: response.error ?: GENERIC_VERIFY_ERROR)
                }
            } catch (ex: Exception) {
                handleError(resolveError(ex))
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun retryLastAction() {
        when (val action = lastAction) {
            is PendingAction.RequestOtp -> requestOTP(action.phone)
            is PendingAction.VerifyOtp -> verifyOTP(action.phone, action.otp)
            PendingAction.None -> {
                // Nothing to retry
            }
        }
    }

    fun consumeError() {
        _error.value = null
    }

    fun consumeOtpMessage() {
        _otpMessage.value = null
    }

    fun consumeOtpSent() {
        _otpSent.value = false
    }

    private fun handleError(message: String) {
        _error.value = message
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
        val body = exception.response()?.errorBody() ?: return GENERIC_HTTP_ERROR_PREFIX + exception.code()
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

    private fun isPhoneValid(phone: String): Boolean {
        return phone.matches(PHONE_REGEX)
    }

    private fun isOtpValid(otp: String): Boolean {
        return otp.length == 6 && otp.all { it.isDigit() }
    }

    private sealed class PendingAction {
        data class RequestOtp(val phone: String) : PendingAction()
        data class VerifyOtp(val phone: String, val otp: String) : PendingAction()
        object None : PendingAction()
    }

    companion object {
        private val PHONE_REGEX = Regex("^\\+?[1-9]\\d{6,14}\$")
        private const val INVALID_PHONE_MESSAGE = "Please enter a valid phone number."
        private const val INVALID_OTP_MESSAGE = "Please enter the 6-digit OTP."
        private const val GENERIC_OTP_ERROR = "Failed to send OTP. Please try again."
        private const val GENERIC_VERIFY_ERROR = "Verification failed. Please try again."
        private const val GENERIC_UNEXPECTED_ERROR = "Unexpected error occurred."
        private const val GENERIC_HTTP_ERROR_PREFIX = "Request failed with status "
        private const val NETWORK_ERROR_MESSAGE = "Network error. Please check your connection."
        private const val HOST_UNREACHABLE_MESSAGE = "Cannot reach Cryptopulse servers. Check your internet connection or API configuration."
        private const val REQUEST_TIMEOUT_MESSAGE = "The server took too long to respond. Please try again."
        private const val CONNECTION_FAILED_MESSAGE = "Unable to establish a connection. Please retry."
    }
}
