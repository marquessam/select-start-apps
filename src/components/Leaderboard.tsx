import React, { useState, useEffect } from 'react';

interface LeaderboardEntry {
  username: string;
  completedAchievements?: number;
  totalAchievements?: number;
  completionPercentage?: string;
  hasBeatenGame?: boolean;
  award?: string; // 'MASTERY', 'BEATEN', or 'PARTICIPATION'
  points?: number;
  rank?: number;
}

interface GameInfo {
  title: string;
  id: string; // game ID
  imageIcon?: string;
}

interface LeaderboardData {
  gameInfo?: GameInfo;
  leaderboard: LeaderboardEntry[];
  lastUpdated: string;
}

const processMonthlyRanks = (entries: LeaderboardEntry[]): LeaderboardEntry[] => {
    // Sort monthly entries
    const sortedEntries = [...entries].sort((a, b) => {
        // Convert string percentages to numbers for comparison
        const aPercentage = parseFloat(a.completionPercentage || '0');
        const bPercentage = parseFloat(b.completionPercentage || '0');
        
        const percentDiff = bPercentage - aPercentage;
        if (percentDiff !== 0) return percentDiff;
        return (b.completedAchievements || 0) - (a.completedAchievements || 0);
    });

    let currentRank = 1;
    let previousPercentage: number | null = null;
    let previousAchievements: number | null = null;
    
    return sortedEntries.map((entry, index) => {
        const currentPercentage = parseFloat(entry.completionPercentage || '0');
        const currentAchievements = entry.completedAchievements || 0;
        
        if (index === 0) {
            previousPercentage = currentPercentage;
            previousAchievements = currentAchievements;
            return { ...entry, rank: 1 };
        }
        
        if (currentPercentage !== previousPercentage || 
            currentAchievements !== previousAchievements) {
            currentRank = index + 1;
        }
        
        previousPercentage = currentPercentage;
        previousAchievements = currentAchievements;
        return { ...entry, rank: currentRank };
    });
};

const processYearlyRanks = (entries: LeaderboardEntry[]): LeaderboardEntry[] => {
    // Sort yearly entries
    const sortedEntries = [...entries].sort((a, b) => 
        (b.points || 0) - (a.points || 0)
    );

    return sortedEntries.map((entry, index) => {
        if (index === 0) return { ...entry, rank: 1 };
        
        const prevEntry = sortedEntries[index - 1];
        const currentPoints = entry.points || 0;
        const prevPoints = prevEntry.points || 0;
        
        return {
            ...entry,
            rank: currentPoints === prevPoints ? prevEntry.rank : index + 1
        };
    });
};

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('monthly');
  const [monthlyData, setMonthlyData] = useState<LeaderboardData | null>(null);
  const [yearlyData, setYearlyData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const sendHeight = () => {
      const content = document.getElementById('leaderboard-container');
      if (content) {
        window.parent.postMessage({
          type: 'resize',
          height: content.getBoundingClientRect().height
        }, '*');
      }
    };

    if (monthlyData || yearlyData) {
      sendHeight();
    }
  }, [monthlyData, yearlyData, activeTab]);

  useEffect(() => {
    if (monthlyData && yearlyData && !loading && attempts < 3) {
      const timer = setTimeout(() => {
        setActiveTab('yearly');
        setTimeout(() => {
          setActiveTab('monthly');
          setAttempts(prev => prev + 1);
        }, 100);
      }, 500 * attempts);

      return () => clearTimeout(timer);
    }
  }, [monthlyData, yearlyData, loading, attempts]);

  const fetchData = async () => {
    try {
      const [monthlyResponse, yearlyResponse] = await Promise.all([
        fetch('/api/monthly-leaderboard'),
        fetch('/api/yearly-leaderboard')
      ]);
      
      if (!monthlyResponse.ok || !yearlyResponse.ok) throw new Error('Failed to fetch data');
      
      const monthlyData = await monthlyResponse.json();
      const yearlyData = await yearlyResponse.json();

      // Format monthly data to match the expected interface
      const formattedMonthlyData: LeaderboardData = {
        gameInfo: {
          title: monthlyData.gameInfo?.title || "Monthly Challenge",
          id: monthlyData.gameInfo?.id || "",
          imageIcon: monthlyData.gameInfo?.imageIcon || ""
        },
        leaderboard: monthlyData.leaderboard.map((entry: any) => ({
          username: entry.username,
          completedAchievements: entry.completedAchievements || 0,
          totalAchievements: entry.totalAchievements || 0,
          completionPercentage: typeof entry.completionPercentage === 'number' 
            ? entry.completionPercentage.toFixed(2) 
            : entry.completionPercentage || '0.00',
          hasBeatenGame: entry.hasBeatenGame || false,
          award: entry.award || '',
          profileImage: entry.profileImage || `https://retroachievements.org/UserPic/${entry.username}.png`,
          profileUrl: entry.profileUrl || `https://retroachievements.org/user/${entry.username}`
        })),
        lastUpdated: monthlyData.lastUpdated || new Date().toISOString()
      };
      
      // Format yearly data
      const formattedYearlyData: LeaderboardData = {
        leaderboard: yearlyData.leaderboard.map((entry: any) => ({
          username: entry.username,
          points: entry.totalPoints || 0,
          profileImage: entry.profileImage || `https://retroachievements.org/UserPic/${entry.username}.png`,
          profileUrl: entry.profileUrl || `https://retroachievements.org/user/${entry.username}`
        })),
        lastUpdated: yearlyData.lastUpdated || new Date().toISOString()
      };
      
      // Process each leaderboard separately
      formattedMonthlyData.leaderboard = processMonthlyRanks(formattedMonthlyData.leaderboard);
      formattedYearlyData.leaderboard = processYearlyRanks(formattedYearlyData.leaderboard);
      
      setMonthlyData(formattedMonthlyData);
      setYearlyData(formattedYearlyData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-4 bg-[#17254A]">Loading...</div>;
  if (error) return <div className="p-4 bg-[#17254A]">Error: {error}</div>;
  if (!monthlyData || !yearlyData) return null;

  const currentData = activeTab === 'monthly' ? monthlyData : yearlyData;

  // Helper function to properly handle image URLs
  const getImageUrl = (imageIcon: string | undefined) => {
    if (!imageIcon) return 'https://retroachievements.org/Images/017657.png';
    
    // If it's a full URL (starts with http or https), use it directly
    if (imageIcon.startsWith('http')) {
      return imageIcon;
    }
    
    // Otherwise, prepend the RetroAchievements base URL
    return `https://retroachievements.org${imageIcon}`;
  };

  // Helper to get appropriate icon for award status
  const getAwardIcon = (entry: LeaderboardEntry) => {
    if (activeTab !== 'monthly') return null;

    if (entry.award === 'MASTERY') return '✨';
    if (entry.award === 'BEATEN') return '⭐';
    if (entry.award === 'PARTICIPATION') return '🏁';
    
    // If no explicit award but has high completion
    if (parseFloat(entry.completionPercentage || '0') === 100) return '✨';
    if (entry.hasBeatenGame) return '⭐';
    
    return null;
  };

  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const currentYear = currentDate.getFullYear();

  return (
    <div id="leaderboard-container" className="bg-[#17254A] flex flex-col min-h-min max-h-fit">
      <div className="tab-container m-0">
        <div
          className={`tab ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          Monthly Challenge
        </div>
        <div
          className={`tab ${activeTab === 'yearly' ? 'active' : ''}`}
          onClick={() => setActiveTab('yearly')}
        >
          Yearly Rankings
        </div>
      </div>

      {activeTab === 'monthly' && monthlyData.gameInfo && (
        <>
          <div className="game-header">
            <img
              src={getImageUrl(monthlyData.gameInfo.imageIcon)}
              alt={monthlyData.gameInfo.title}
              onError={e => {
                e.currentTarget.src = 'https://retroachievements.org/Images/017657.png';
              }}
            />
            <h2 className="game-title">{monthlyData.gameInfo.title}</h2>
          </div>

          <div className="challenge-list">
            &gt; This challenge runs from {currentMonth} 1st, {currentYear} to {currentMonth} {new Date(currentYear, currentDate.getMonth() + 1, 0).getDate()}th, {currentYear}.<br />
            &gt; Earn achievements using RetroAchievements<br />
            &gt; Beat the game by earning progression/win achievements<br />
            &gt; Mastery by earning all achievements<br />
            &gt; No hacks/save states/cheats allowed<br />
          </div>
        </>
      )}

      <div className="p-4">
        {currentData.leaderboard.map((entry) => (
          <div key={entry.username} className="leaderboard-entry">
            <div
              className={`rank ${
                entry.rank === 1 ? 'medal-gold' : 
                entry.rank === 2 ? 'medal-silver' : 
                entry.rank === 3 ? 'medal-bronze' : ''
              }`}
            >
              #{entry.rank}
            </div>
            <img
              src={entry.profileImage}
              alt={entry.username}
              className="profile-image"
              onError={e => {
                e.currentTarget.src = 'https://retroachievements.org/UserPic/_user.png';
              }}
            />
            <div className="flex-grow">
              <a
                href={entry.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="username"
              >
                {entry.username}
              </a>
              <div className="flex flex-col gap-0.5">
                {activeTab === 'monthly' ? (
                  <>
                    <div className="flex items-center">
                      <span>{entry.completedAchievements}/{entry.totalAchievements}</span>
                      {getAwardIcon(entry) && (
                        <span className="ml-2">{getAwardIcon(entry)}</span>
                      )}
                    </div>
                    <div>{entry.completionPercentage}%</div>
                  </>
                ) : (
                  <div>{entry.points} points</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-sm text-[#8892b0] text-center p-4 border-t border-[#2a3a6a] mt-2">
        Last updated: {new Date(currentData.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default Leaderboard;
