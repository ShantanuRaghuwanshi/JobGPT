// Debug script to test profile API
// Run with: node debug-profile.js

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

// Replace with your actual token
const AUTH_TOKEN = 'your_jwt_token_here';

const testProfileData = {
    name: 'John Doe',
    age: 28,
    location: 'San Francisco',
    skills: ['JavaScript', 'React', 'Node.js'],
    experienceLevel: 'mid',
    preferences: {
        locations: ['San Francisco', 'Remote'],
        experienceLevels: ['mid', 'senior'],
        keywords: ['frontend', 'react'],
        salaryRange: {
            min: 80000,
            max: 120000
        },
        remoteWork: true
    }
};

async function testProfileAPI() {
    try {
        console.log('Testing Profile API...\n');

        // Test 1: Get current profile
        console.log('1. Getting current profile...');
        try {
            const getResponse = await axios.get(`${BASE_URL}/profile`, {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Profile exists:', getResponse.data);
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('ℹ️  No profile found (expected for new users)');
            } else {
                console.log('❌ Error getting profile:', error.response?.data || error.message);
            }
        }

        // Test 2: Create/Update profile
        console.log('\n2. Creating/Updating profile...');
        try {
            const putResponse = await axios.put(`${BASE_URL}/profile`, testProfileData, {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Profile created/updated:', putResponse.data);
        } catch (error) {
            console.log('❌ Error creating/updating profile:');
            console.log('Status:', error.response?.status);
            console.log('Data:', JSON.stringify(error.response?.data, null, 2));

            if (error.response?.data?.error?.details) {
                console.log('\nValidation errors:');
                error.response.data.error.details.forEach(detail => {
                    console.log(`- ${detail.field}: ${detail.message}`);
                    if (detail.value !== undefined) {
                        console.log(`  Value: ${JSON.stringify(detail.value)}`);
                    }
                });
            }
        }

        // Test 3: Get profile again to confirm
        console.log('\n3. Getting profile after update...');
        try {
            const getResponse2 = await axios.get(`${BASE_URL}/profile`, {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Updated profile:', getResponse2.data);
        } catch (error) {
            console.log('❌ Error getting updated profile:', error.response?.data || error.message);
        }

    } catch (error) {
        console.error('Unexpected error:', error.message);
    }
}

// Instructions
console.log('Profile API Debug Script');
console.log('========================');
console.log('1. Make sure your backend is running on http://localhost:5001');
console.log('2. Replace AUTH_TOKEN with your actual JWT token');
console.log('3. Run: node debug-profile.js\n');

if (AUTH_TOKEN === 'your_jwt_token_here') {
    console.log('❌ Please update the AUTH_TOKEN variable with your actual JWT token');
    process.exit(1);
}

testProfileAPI();