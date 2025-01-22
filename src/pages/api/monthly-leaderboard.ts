import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory cache
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
    // Wait before retrying, with exponential backoff
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

    if (!process.env.RA_API_KEY || !process.env.RA_USERNAME) {
      throw new Error('Missing RetroAchievements API configuration');
    }

    // Fetch users from spreadsheet
    const SPREADSHEET_URL = process.env.USERS_SPREADSHEET_URL;
    const csvResponse = await fetchWithRetry(SPREADSHEET_URL);
    const csvText = await csvResponse.text();
    const users = csvText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .slice(1); // Skip header row

    // Get game info and user progress
    const gameId = '319'; // Your current game ID
    const gameInfoParams = new URLSearchParams({
      z: process.env.RA_USERNAME,
      y: process.env.RA_API_KEY,
      g: gameId,
      u: users[0]
    });

    const gameInfoResponse = await fetchWithRetry(
      `https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php?${gameInfoParams}`
    );
    const gameInfoData = await gameInfoResponse.json();

    // Process each user's progress
    const userPromises = users.map(async (username) => {
      try {
        const params = new URLSearchParams({
          z: process.env.RA_USERNAME,
          y: process.env.RA_API_KEY,
          g: gameId,
          u: username
        });

        const response = await fetchWithRetry(
          `https://retroachievements.org/API/API_GetGameInfoAndUserProgress.php?${params}`
        );
        const data = await response.json();

        const achievements = data.Achievements || {};
        const numAchievements = Object.keys(achievements).length;
        const completed = Object.values(achievements)
          .filter(ach => {
            const dateEarned = parseInt(ach.DateEarned);
            return !isNaN(dateEarned) && dateEarned > 0;
          })
          .length;

        return {
          username,
          profileImage: `https://retroachievements.org/UserPic/${username}.png`,
          profileUrl: `https://retroachievements.org/user/${username}`,
          completedAchievements: completed,
          totalAchievements: numAchievements,
          completionPercentage: numAchievements > 0 
            ? parseFloat(((completed / numAchievements) * 100).toFixed(2))
            : 0
        };
      } catch (error) {
        console.error(`Error processing user ${username}:`, error);
        return null;
      }
    });

    const results = (await Promise.all(userPromises)).filter(Boolean);

    // Sort users by completion percentage
    const sortedUsers = results.sort((a, b) => {
      if (b.completionPercentage !== a.completionPercentage) {
        return b.completionPercentage - a.completionPercentage;
      }
      return b.completedAchievements - a.completedAchievements;
    });

    const response = {
      gameInfo: {
        Title: gameInfoData.Title || "Current Challenge",
        ImageIcon: gameInfoData.ImageIcon || "/Images/093950.png"
      },
      leaderboard: sortedUsers.slice(0, 10),
      additionalParticipants: sortedUsers.slice(10).map(u => u.username),
      lastUpdated: new Date().toISOString()
    };

    // Update cache
    cachedData = response;
    lastUpdateTime = now;

    return res.status(200).json(response);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch leaderboard data',
      details: error.message
    });
  }
}
