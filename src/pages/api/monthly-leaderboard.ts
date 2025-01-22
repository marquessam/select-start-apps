import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

// Cache setup matches your bot's configuration
let cachedData = null;
let lastUpdateTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check cache
    const now = Date.now();
    if (cachedData && lastUpdateTime && (now - lastUpdateTime < CACHE_DURATION)) {
      return res.status(200).json(cachedData);
    }

    // Connect to MongoDB
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db(process.env.DB_NAME || 'selectstart');

    try {
      // Get current challenge
      const currentChallenge = await db.collection('challenges')
        .findOne({ _id: 'current' });

      // Get user stats for the current month
      const stats = await db.collection('userstats')
        .findOne({ _id: 'stats' });

      // Get valid users list
      const validUsersDoc = await db.collection('users')
        .findOne({ _id: 'validUsers' });
      const validUsers = validUsersDoc?.users || [];

      // Transform data into leaderboard format
      const leaderboard = validUsers
        .map(username => {
          const userStats = stats?.users?.[username.toLowerCase()] || {};
          const monthlyStats = userStats.monthlyStats?.[new Date().toISOString().slice(0, 7)] || {};

          return {
            username,
            profileImage: `https://retroachievements.org/UserPic/${username}.png`,
            profileUrl: `https://retroachievements.org/user/${username}`,
            completedAchievements: monthlyStats.completedAchievements || 0,
            totalAchievements: monthlyStats.totalAchievements || 0,
            completionPercentage: monthlyStats.completionPercentage || 0,
            hasBeatenGame: monthlyStats.hasBeatenGame || false
          };
        })
        .filter(user => user.completedAchievements > 0 || user.completionPercentage > 0)
        .sort((a, b) => {
          const percentageDiff = b.completionPercentage - a.completionPercentage;
          if (percentageDiff !== 0) return percentageDiff;
          return b.completedAchievements - a.completedAchievements;
        });

      const response = {
        gameInfo: {
          Title: currentChallenge?.gameName || "Current Challenge",
          ImageIcon: currentChallenge?.gameIcon || "/Images/093950.png"
        },
        leaderboard: leaderboard.slice(0, 10),
        additionalParticipants: leaderboard.slice(10).map(u => u.username),
        lastUpdated: new Date().toISOString()
      };

      // Update cache
      cachedData = response;
      lastUpdateTime = now;

      return res.status(200).json(response);
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch leaderboard data',
      details: error.message
    });
  }
}
