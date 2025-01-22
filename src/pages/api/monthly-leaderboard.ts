import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

// In-memory cache
let cachedData = null;
let lastUpdateTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env');
}

async function getLeaderboardData() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db();

  try {
    // Get current challenge
    const currentChallenge = await db.collection('challenges')
      .findOne({ status: 'active' });

    // Get all user progress
    const usersProgress = await db.collection('userProgress')
      .find({
        // Assuming you store monthly progress with a month identifier
        month: new Date().toISOString().slice(0, 7) // Format: YYYY-MM
      })
      .toArray();

    // Get valid users list
    const validUsers = await db.collection('users')
      .find({ status: 'active' })
      .toArray();

    // Transform data into leaderboard format
    const leaderboard = validUsers
      .map(user => {
        const progress = usersProgress.find(p => 
          p.username.toLowerCase() === user.username.toLowerCase()
        ) || {};

        return {
          username: user.username,
          profileImage: `https://retroachievements.org/UserPic/${user.username}.png`,
          profileUrl: `https://retroachievements.org/user/${user.username}`,
          completedAchievements: progress.completedAchievements || 0,
          totalAchievements: progress.totalAchievements || 0,
          completionPercentage: progress.completionPercentage || 0
        };
      })
      .filter(user => user.completedAchievements > 0 || user.completionPercentage > 0)
      .sort((a, b) => {
        if (b.completionPercentage !== a.completionPercentage) {
          return b.completionPercentage - a.completionPercentage;
        }
        return b.completedAchievements - a.completedAchievements;
      });

    return {
      gameInfo: {
        Title: currentChallenge?.gameName || "Current Challenge",
        ImageIcon: currentChallenge?.gameIcon || "/Images/093950.png"
      },
      leaderboard: leaderboard.slice(0, 10),
      additionalParticipants: leaderboard.slice(10).map(u => u.username),
      lastUpdated: new Date().toISOString()
    };
  } finally {
    await client.close();
  }
}

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

    const data = await getLeaderboardData();

    // Update cache
    cachedData = data;
    lastUpdateTime = now;

    return res.status(200).json(data);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch leaderboard data',
      details: error.message
    });
  }
}
