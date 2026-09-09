const axios = require('axios');

const authClient = axios.create({
  baseURL: `${process.env.AUTH_SERVICE_URL}/api/v1/internal`,
  timeout: 3000,
  headers: {
    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY
  }
});

// ============================================
// Fetch a single user's public info
// ============================================
async function getUserById(userId) {
  try {
    const { data } = await authClient.get(`/users/${userId}`);
    return data; // { id, firstName, lastName, fullName, email, mobile, avatar, premium, status, roles }
  } catch (err) {
    console.error(`Failed to fetch user ${userId} from auth-service:`, err.message);
    return null;
  }
}

// ============================================
// Fetch multiple users' public info in one call
// ============================================
async function getUsersByIds(userIds) {
  try {
    const uniqueIds = [...new Set(userIds)].filter(Boolean);
    if (uniqueIds.length === 0) return {};

    const { data } = await authClient.post('/users/batch', { userIds: uniqueIds });

    const map = {};
    data.forEach(u => { map[u.id] = u; });
    return map;
  } catch (err) {
    console.error('Failed to batch fetch users from auth-service:', err.message);
    return {};
  }
}

module.exports = { getUserById, getUsersByIds };