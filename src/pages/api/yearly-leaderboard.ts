import type { NextApiRequest, NextApiResponse } from 'next';

let cachedData = null;
let lastUpdateTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchWithRetry(url: string, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      if (i === retries - 1) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
  }
  throw new Error(`Failed after ${retries} retries`);
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

    // Fetch yearly points data from your database URL
    const YEARLY_DATA_URL = process.env.YEARLY_POINTS_URL;
    const response = await fetchWithRetry(YEARLY_DATA_URL);
    const data = await response.json();

    // Transform the data into the leaderboard format
    const leaderboard = data.points.map(user => ({
      username: user.username,
      profileImage: `https://retroachievements.org/UserPic/${user.username}.png`,
      profileUrl: `https://retroachievements.org/user/${user.username}`,
      points: user.points || 0,
      bonusPoints: user.bonusPoints || []
    })).sort((a, b) => b.points - a.points);

    const response = {
      leaderboard: leaderboard.slice(0, 10),
      additionalParticipants: leaderboard.slice(10).map(u => u.username),
      lastUpdated: new Date().toISOString()
    };

    // Update cache
    cachedData = response;
    lastUpdateTime = now;

    return res.status(200).json(response);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch yearly leaderboard data',
      details: error.message
    });
  }
}
