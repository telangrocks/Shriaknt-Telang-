package com.cryptopulse.app.viewmodel

import android.app.Application
import android.app.Activity
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.google.firebase.FirebaseException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.google.firebase.messaging.FirebaseMessaging
import com.cryptopulse.app.repository.AuthRepository
import kotlinx.coroutines.launch
import org.json.JSONObject
import retrofit2.HttpException
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

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
    private val firebaseAuth: FirebaseAuth = FirebaseAuth.getInstance()
    private var verificationId: String? = null
    private var resendToken: PhoneAuthProvider.ForceResendingToken? = null
    private var currentPhone: String? = null

    fun requestOTP(activity: Activity, rawPhone: String) {
        val phone = rawPhone.trim()
        if (!isPhoneValid(phone)) {
            _error.value = INVALID_PHONE_MESSAGE
            return
        }

        if (currentPhone != phone) {
            verificationId = null
            resendToken = null
        }
        currentPhone = phone

        lastAction = PendingAction.RequestOtp(phone)
        _isLoading.value = true
        _error.value = null

        val optionsBuilder = PhoneAuthOptions.newBuilder(firebaseAuth)
            .setPhoneNumber(phone)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(phoneAuthCallbacks)

        resendToken?.let { token ->
            optionsBuilder.setForceResendingToken(token)
        }

        PhoneAuthProvider.verifyPhoneNumber(optionsBuilder.build())
    }

    fun verifyOTP(rawOtp: String) {
        val otp = rawOtp.trim()
        if (!isOtpValid(otp)) {
            _error.value = INVALID_OTP_MESSAGE
            return
        }

        val storedVerificationId = verificationId
        if (storedVerificationId.isNullOrBlank()) {
            _error.value = GENERIC_VERIFY_ERROR
            return
        }

        lastAction = PendingAction.VerifyOtp(currentPhone.orEmpty(), otp)
        _isLoading.value = true
        val credential = PhoneAuthProvider.getCredential(storedVerificationId, otp)
        signInWithCredential(credential)
    }

    fun retryLastAction(activity: Activity) {
        when (val action = lastAction) {
            is PendingAction.RequestOtp -> requestOTP(activity, action.phone)
            is PendingAction.VerifyOtp -> verifyOTP(action.otp)
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

    private val phoneAuthCallbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
        override fun onVerificationCompleted(credential: PhoneAuthCredential) {
            signInWithCredential(credential)
        }

        override fun onVerificationFailed(e: FirebaseException) {
            _isLoading.postValue(false)
            handleError(e.localizedMessage ?: GENERIC_OTP_ERROR)
        }

        override fun onCodeSent(verificationId: String, token: PhoneAuthProvider.ForceResendingToken) {
            this@AuthViewModel.verificationId = verificationId
            this@AuthViewModel.resendToken = token
            _isLoading.postValue(false)
            _otpSent.postValue(true)
            _otpMessage.postValue("OTP sent successfully. Please enter the 6-digit code.")
            _error.postValue(null)
        }
    }

    private fun signInWithCredential(credential: PhoneAuthCredential) {
        _isLoading.postValue(true)
        firebaseAuth.signInWithCredential(credential)
            .addOnCompleteListener { authTask ->
                if (!authTask.isSuccessful) {
                    _isLoading.postValue(false)
                    handleError(authTask.exception?.localizedMessage ?: GENERIC_VERIFY_ERROR)
                    return@addOnCompleteListener
                }

                val user = authTask.result?.user
                user?.getIdToken(true)
                    ?.addOnCompleteListener { tokenTask ->
                        if (!tokenTask.isSuccessful || tokenTask.result?.token.isNullOrBlank()) {
                            _isLoading.postValue(false)
                            handleError(tokenTask.exception?.localizedMessage ?: GENERIC_VERIFY_ERROR)
                            return@addOnCompleteListener
                        }

                        val token = tokenTask.result?.token ?: return@addOnCompleteListener
                        viewModelScope.launch {
                            try {
                                val response = repository.loginWithFirebase(token)
                                if (response.success && !response.token.isNullOrBlank()) {
                                    FirebaseMessaging.getInstance().token
                                        .addOnSuccessListener { firebaseToken ->
                                            viewModelScope.launch {
                                                repository.registerDeviceToken(firebaseToken)
                                            }
                                        }
                                    _loginSuccess.postValue(true)
                                    _error.postValue(null)
                                } else {
                                    handleError(response.message ?: response.error ?: GENERIC_VERIFY_ERROR)
                                }
                            } catch (ex: Exception) {
                                handleError(resolveError(ex))
                            } finally {
                                _isLoading.postValue(false)
                            }
                        }
                    }
                    ?: run {
                        _isLoading.postValue(false)
                        handleError(GENERIC_VERIFY_ERROR)
                    }
            }
    }
}
