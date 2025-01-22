import type { NextApiRequest, NextApiResponse } from 'next';
import { getMongoDb } from '@/utils/mongodb';
import { Document, Filter } from 'mongodb';

interface MonthlyStats {
  completedAchievements: number;
  totalAchievements: number;
  completionPercentage: number;
  hasBeatenGame: boolean;
}

interface LeaderboardEntry {
  username: string;
  profileImage: string;
  profileUrl: string;
  completedAchievements: number;
  totalAchievements: number;
  completionPercentage: number;
  hasBeatenGame: boolean;
}

interface GameInfo {
  Title: string;
  ImageIcon: string;
}

interface LeaderboardResponse {
  gameInfo: GameInfo;
  leaderboard: LeaderboardEntry[];
  additionalParticipants: string[];
  lastUpdated: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

interface UserStats extends Document {
  _id: 'stats';
  users: {
    [key: string]: {
      monthlyStats?: {
        [key: string]: MonthlyStats;
      };
    };
  };
}

interface Challenge extends Document {
  _id: 'current';
  gameName?: string;
  gameIcon?: string;
}

interface ValidUsers extends Document {
  _id: 'validUsers';
  users: string[];
}

let cachedData: LeaderboardResponse | null = null;
let lastUpdateTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaderboardResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const now = Date.now();
    if (cachedData && lastUpdateTime && (now - lastUpdateTime < CACHE_DURATION)) {
      console.log('Returning cached leaderboard data');
      return res.status(200).json(cachedData);
    }

    console.log('Fetching fresh leaderboard data');
    const db = await getMongoDb();

    const currentChallenge = await db.collection<Challenge>('challenges')
      .findOne({ _id: 'current' } as Filter<Challenge>);

    const stats = await db.collection<UserStats>('userstats')
      .findOne({ _id: 'stats' } as Filter<UserStats>);

    const validUsersDoc = await db.collection<ValidUsers>('users')
      .findOne({ _id: 'validUsers' } as Filter<ValidUsers>);
    const validUsers = validUsersDoc?.users || [];

    console.log(`Processing ${validUsers.length} users`);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const leaderboard = validUsers
      .map(username => {
        const userStats = stats?.users?.[username.toLowerCase()] || { monthlyStats: {} };
        const monthStats = (userStats.monthlyStats?.[currentMonth] || {}) as MonthlyStats;

        return {
          username,
          profileImage: `https://retroachievements.org/UserPic/${username}.png`,
          profileUrl: `https://retroachievements.org/user/${username}`,
          completedAchievements: monthStats.completedAchievements || 0,
          totalAchievements: monthStats.totalAchievements || 0,
          completionPercentage: monthStats.completionPercentage || 0,
          hasBeatenGame: monthStats.hasBeatenGame || false
        };
      })
      .filter(user => user.completedAchievements > 0 || user.completionPercentage > 0)
      .sort((a, b) => {
        const percentageDiff = b.completionPercentage - a.completionPercentage;
        if (percentageDiff !== 0) return percentageDiff;
        return b.completedAchievements - a.completedAchievements;
      });

    const response: LeaderboardResponse = {
      gameInfo: {
        Title: currentChallenge?.gameName || "Current Challenge",
        ImageIcon: currentChallenge?.gameIcon || "/Images/093950.png"
      },
      leaderboard: leaderboard.slice(0, 10),
      additionalParticipants: leaderboard.slice(10).map(u => u.username),
      lastUpdated: new Date().toISOString()
    };

    cachedData = response;
    lastUpdateTime = now;

    console.log('Successfully fetched and processed leaderboard data');
    return res.status(200).json(response);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch leaderboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
