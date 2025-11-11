const admin = require('firebase-admin')
const logger = require('../utils/logger')

let firebaseApp = null

const fs = require('fs')
const path = require('path')

function parseServiceAccount() {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  if (filePath) {
    const resolvedPath = path.resolve(filePath)
    const fileExists = fs.existsSync(resolvedPath)
    if (!fileExists) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_PATH was provided but file "${resolvedPath}" does not exist`
      )
    }
    try {
      const fileContent = fs.readFileSync(resolvedPath, 'utf8')
      return JSON.parse(fileContent)
    } catch (error) {
      throw new Error(
        `Failed to read or parse Firebase service account file at "${resolvedPath}": ${error.message}`
      )
    }
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT

  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT environment variable is not set (and no FIREBASE_SERVICE_ACCOUNT_PATH provided)'
    )
  }

  const tryJsonParse = (value) => {
    try {
      return JSON.parse(value)
    } catch (error) {
      return null
    }
  }

  const base64Decoded = tryJsonParse(
    Buffer.from(raw, 'base64').toString('utf-8')
  )
  if (base64Decoded) {
    return base64Decoded
  }

  const directJson = tryJsonParse(raw)
  if (directJson) {
    return directJson
  }

  throw new Error(
    'FIREBASE_SERVICE_ACCOUNT is not valid JSON or base64 encoded JSON'
  )
}

function initialiseFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp
  }

  const serviceAccount = parseServiceAccount()

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })

  logger.info('Firebase Admin SDK initialised')
  return firebaseApp
}

const getFirebaseAuth = () => {
  const app = initialiseFirebaseAdmin()
  return admin.auth(app)
}

const getFirebaseMessaging = () => {
  const app = initialiseFirebaseAdmin()
  return admin.messaging(app)
}

module.exports = { getFirebaseAuth, getFirebaseMessaging }

