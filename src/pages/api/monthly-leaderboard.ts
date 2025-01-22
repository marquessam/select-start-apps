import type { NextApiRequest, NextApiResponse } from 'next';
import { getMongoDb } from '@/utils/mongodb';
import { Document, Filter } from 'mongodb';

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

interface UserMonthlyStats {
  monthlyAchievements: {
    [year: string]: {
      [month: string]: number;
    };
  };
  completedGames: Record<string, boolean>;
}

interface UserStats extends Document {
  _id: 'stats';
  users: {
    [username: string]: UserMonthlyStats;
  };
}

interface Challenge extends Document {
  _id: 'current';
  gameName?: string;
  gameIcon?: string;
  totalAchievements?: number;
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

    // Get challenge info
    const currentChallenge = await db.collection<Challenge>('challenges')
      .findOne({ _id: 'current' } as Filter<Challenge>);

    // Get user stats
    const stats = await db.collection<UserStats>('userstats')
      .findOne({ _id: 'stats' } as Filter<UserStats>);

    if (!stats?.users) {
      throw new Error('No user stats found');
    }

    // Get the current month in the format used in your data (YYYY-M)
    const date = new Date();
    const year = date.getFullYear().toString();
    const monthIndex = date.getMonth(); // 0-11
    const currentMonthKey = `${year}-${monthIndex}`; // Matches your "2025-0" format

    // Transform data into leaderboard format
    const leaderboard = Object.entries(stats.users)
      .map(([username, userData]) => {
        const achievementsThisMonth = 
          userData.monthlyAchievements?.[year]?.[currentMonthKey] || 0;

        // Calculate percentage based on total achievements from challenge
        const totalPossibleAchievements = currentChallenge?.totalAchievements || 77; // Fallback to 77 if not specified
        const completionPercentage = totalPossibleAchievements > 0
          ? (achievementsThisMonth / totalPossibleAchievements) * 100
          : 0;

        return {
          username,
          profileImage: `https://retroachievements.org/UserPic/${username}.png`,
          profileUrl: `https://retroachievements.org/user/${username}`,
          completedAchievements: achievementsThisMonth,
          totalAchievements: totalPossibleAchievements,
          completionPercentage: parseFloat(completionPercentage.toFixed(2)),
          hasBeatenGame: !!userData.completedGames?.[currentMonthKey]
        };
      })
      .filter(user => user.completedAchievements > 0)
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

    // Update cache
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
