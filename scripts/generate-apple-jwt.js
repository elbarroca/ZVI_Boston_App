#!/usr/bin/env node

/**
 * Apple Sign In JWT Token Generator
 *
 * This script generates a JWT token that serves as the client secret for Apple Sign In
 * authentication with Supabase. The token is valid for 6 months.
 *
 * Usage:
 * node scripts/generate-apple-jwt.js [privateKeyPath] [teamId] [keyId] [serviceId]
 *
 * Environment Variables (recommended):
 * APPLE_TEAM_ID - Your 10-character Apple Developer Team ID
 * APPLE_KEY_ID - Your 10-character private key ID
 * APPLE_SERVICE_ID - Your Apple Service ID (e.g., com.zentro.studenthousing.auth)
 * APPLE_PRIVATE_KEY_PATH - Path to your AuthKey_*.p8 file
 */

const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Configuration - Update these values or use environment variables
const config = {
  teamId: process.env.APPLE_TEAM_ID || process.argv[3],
  keyId: process.env.APPLE_KEY_ID || process.argv[4],
  serviceId: process.env.APPLE_SERVICE_ID || process.argv[5] || 'com.zentro.studenthousing.auth',
  privateKeyPath: process.env.APPLE_PRIVATE_KEY_PATH || process.argv[2] || './AuthKey_*.p8'
};

function findPrivateKeyFile(searchPath) {
  // If it's a direct file path, use it
  if (fs.existsSync(searchPath) && searchPath.endsWith('.p8')) {
    return searchPath;
  }

  // If it contains a wildcard, find the matching file
  if (searchPath.includes('*')) {
    const dir = path.dirname(searchPath);
    const pattern = path.basename(searchPath).replace('*', '');

    try {
      const files = fs.readdirSync(dir);
      const keyFile = files.find(file => file.endsWith('.p8') && file.includes(pattern));
      if (keyFile) {
        return path.join(dir, keyFile);
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
      return null;
    }
  }

  // Try common locations
  const commonLocations = [
    searchPath,
    './AuthKey_*.p8',
    './keys/AuthKey_*.p8',
    './config/AuthKey_*.p8',
    './assets/AuthKey_*.p8'
  ];

  for (const location of commonLocations) {
    if (location.includes('*')) {
      const dir = path.dirname(location);
      const pattern = path.basename(location).replace('*', '');

      try {
        const files = fs.readdirSync(dir);
        const keyFile = files.find(file => file.endsWith('.p8') && file.includes(pattern));
        if (keyFile) {
          return path.join(dir, keyFile);
        }
      } catch (error) {
        // Continue to next location
      }
    } else if (fs.existsSync(location)) {
      return location;
    }
  }

  return null;
}

function generateAppleJWT() {
  // Validate required configuration
  if (!config.teamId) {
    console.error('❌ Error: Apple Team ID is required.');
    console.error('Set APPLE_TEAM_ID environment variable or pass as third argument.');
    process.exit(1);
  }

  if (!config.keyId) {
    console.error('❌ Error: Apple Key ID is required.');
    console.error('Set APPLE_KEY_ID environment variable or pass as fourth argument.');
    process.exit(1);
  }

  if (!config.serviceId) {
    console.error('❌ Error: Apple Service ID is required.');
    console.error('Set APPLE_SERVICE_ID environment variable or pass as fifth argument.');
    process.exit(1);
  }

  // Find the private key file
  const keyFilePath = findPrivateKeyFile(config.privateKeyPath);
  if (!keyFilePath) {
    console.error('❌ Error: Could not find Apple private key file (.p8).');
    console.error('Searched locations:');
    console.error('  -', config.privateKeyPath);
    console.error('  - ./AuthKey_*.p8');
    console.error('  - ./keys/AuthKey_*.p8');
    console.error('  - ./config/AuthKey_*.p8');
    console.error('  - ./assets/AuthKey_*.p8');
    console.error('\nSet APPLE_PRIVATE_KEY_PATH environment variable or pass as first argument.');
    process.exit(1);
  }

  console.log('🔑 Found private key file:', keyFilePath);

  try {
    // Read the private key
    const privateKey = fs.readFileSync(keyFilePath, 'utf8');

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: config.teamId,           // Team ID
      iat: now,                     // Issued at time
      exp: now + (6 * 30 * 24 * 60 * 60), // 6 months from now
      aud: 'https://appleid.apple.com', // Apple audience
      sub: config.serviceId         // Service ID (Client ID)
    };

    // Create JWT header
    const header = {
      alg: 'ES256',
      kid: config.keyId
    };

    // Generate and sign the JWT
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      header: header
    });

    console.log('✅ Apple Sign In JWT Token Generated Successfully!');
    console.log('=' .repeat(60));
    console.log('📋 Copy this token to your Supabase Apple Sign In configuration:');
    console.log('=' .repeat(60));
    console.log(token);
    console.log('=' .repeat(60));
    console.log('📅 Token expires on:', new Date(payload.exp * 1000).toLocaleDateString());
    console.log('⚠️  Remember to regenerate this token before it expires!');
    console.log('🔄 Set a calendar reminder for 5 months from now.');

    return token;

  } catch (error) {
    console.error('❌ Error generating JWT token:', error.message);
    if (error.message.includes('PEM')) {
      console.error('💡 This might be an issue with the private key format.');
      console.error('   Make sure you\'re using the .p8 file downloaded from Apple Developer Portal.');
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  console.log('🍎 Apple Sign In JWT Token Generator');
  console.log('=====================================\n');

  generateAppleJWT();
}

module.exports = { generateAppleJWT, config };
