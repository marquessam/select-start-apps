import type { NextApiRequest, NextApiResponse } from 'next';
import { getMongoDb } from '@/utils/mongodb';
import { Document, Filter } from 'mongodb';

interface YearlyEntry {
  username: string;
  profileImage: string;
  profileUrl: string;
  points: number;
  achievements: number;
  bonusPoints: BonusPoint[];
}

interface BonusPoint {
  reason: string;
  points: number;
  date: string;
}

interface UserStatsData {
  yearlyPoints: { [key: string]: number };
  bonusPoints?: BonusPoint[];
  achievements?: number;
}

interface UserStats extends Document {
  _id: string;
  users: {
    [key: string]: UserStatsData;
  };
}

interface ValidUsers extends Document {
  _id: 'validUsers';
  users: string[];
}

interface LeaderboardResponse {
  leaderboard: YearlyEntry[];
  additionalParticipants: string[];
  lastUpdated: string;
}

interface ErrorResponse {
  error: string;
  details?: string;
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
    // Check cache
    const now = Date.now();
    if (cachedData && lastUpdateTime && (now - lastUpdateTime < CACHE_DURATION)) {
      console.log('Returning cached yearly leaderboard data');
      return res.status(200).json(cachedData);
    }

    console.log('Fetching fresh yearly leaderboard data');
    const db = await getMongoDb();

    // Get user stats with proper typing
    const stats = await db.collection<UserStats>('userstats')
      .findOne({ _id: 'stats' } as Filter<UserStats>);

    if (!stats?.users) {
      throw new Error('No user stats found');
    }

    // Get valid users list with proper typing
    const validUsersDoc = await db.collection<ValidUsers>('users')
      .findOne({ _id: 'validUsers' } as Filter<ValidUsers>);
    const validUsers = validUsersDoc?.users || [];

    const currentYear = new Date().getFullYear().toString();

    // Transform data into leaderboard format
    const leaderboard = validUsers
      .map(username => {
        const userStatsData = stats.users[username.toLowerCase()] || {
          yearlyPoints: {},
          bonusPoints: [],
          achievements: 0
        };

        return {
          username,
          profileImage: `https://retroachievements.org/UserPic/${username}.png`,
          profileUrl: `https://retroachievements.org/user/${username}`,
          points: userStatsData.yearlyPoints[currentYear] || 0,
          achievements: userStatsData.achievements || 0,
          bonusPoints: (userStatsData.bonusPoints || [])
            .filter(bp => bp.date.startsWith(currentYear))
        };
      })
      .filter(user => user.points > 0 || user.bonusPoints.length > 0)
      .sort((a, b) => b.points - a.points);

    const response: LeaderboardResponse = {
      leaderboard: leaderboard.slice(0, 10),
      additionalParticipants: leaderboard.slice(10).map(u => u.username),
      lastUpdated: new Date().toISOString()
    };

    // Update cache
    cachedData = response;
    lastUpdateTime = now;

    console.log('Successfully fetched and processed yearly leaderboard data');
    return res.status(200).json(response);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch yearly leaderboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
