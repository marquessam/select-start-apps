import type { NextApiRequest, NextApiResponse } from 'next';
import { getMongoDb } from '@/utils/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Force cache bypass
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    const db = await getMongoDb();

    // Get challenge info - exactly matching what the bot stores
    const currentChallenge = await db.collection('challenges')
      .findOne({ _id: 'current' });

    if (!currentChallenge) {
      return res.status(404).json({ error: 'No active challenge found' });
    }

    // Get user stats - exactly matching what the bot stores
    const stats = await db.collection('userstats')
      .findOne({ _id: 'stats' });
    
    if (!stats?.users) {
      return res.status(404).json({ error: 'No user stats found' });
    }

    // Get current date and generate current month key
    const date = new Date();
    const year = date.getFullYear().toString();
    const monthIndex = date.getMonth(); // 0-11
    const currentMonthKey = `${year}-${monthIndex}`; // Match the bot's format
    
    console.log('Current month key:', currentMonthKey);
    console.log('Total achievements:', currentChallenge.totalAchievements);

    // Transform data into leaderboard format
    const leaderboard = Object.entries(stats.users)
      .map(([username, userData]) => {
        const userStats = userData as any;
        const achievementsThisMonth = 
          userStats.monthlyAchievements?.[year]?.[currentMonthKey] || 0;

        // Get completion percentage
        const totalPossibleAchievements = currentChallenge.totalAchievements || 0;
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
          hasBeatenGame: !!userStats.completedGames?.[currentMonthKey]
        };
      })
      .filter(user => user.completedAchievements > 0)
      .sort((a, b) => {
        const percentageDiff = b.completionPercentage - a.completionPercentage;
        if (percentageDiff !== 0) return percentageDiff;
        return b.completedAchievements - a.completedAchievements;
      });

    const response = {
      gameInfo: {
        Title: currentChallenge.gameName || "Current Challenge",
        ImageIcon: currentChallenge.gameIcon || "/Images/093950.png"
      },
      leaderboard: leaderboard,
      additionalParticipants: [],
      lastUpdated: new Date().toISOString()
    };

    console.log(`Successfully returned ${leaderboard.length} leaderboard entries`);
    return res.status(200).json(response);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch leaderboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
