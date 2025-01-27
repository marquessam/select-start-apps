import React, { useState, useEffect } from 'react';

interface LeaderboardEntry {
  username: string;
  profileImage: string;
  profileUrl: string;
  completedAchievements?: number;
  totalAchievements?: number;
  completionPercentage?: number;
  hasBeatenGame?: boolean;
  points?: number;
  rank?: number;
}

interface GameInfo {
  Title: string;
  ImageIcon: string;
}

interface LeaderboardData {
  gameInfo?: GameInfo;
  leaderboard: LeaderboardEntry[];
  additionalParticipants: string[];
  lastUpdated: string;
}

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

const processLeaderboard = (entries: LeaderboardEntry[]): LeaderboardEntry[] => {
    // First sort the entries
    const sortedEntries = [...entries].sort((a, b) => {
        if (activeTab === 'monthly') {
            const percentDiff = (b.completionPercentage || 0) - (a.completionPercentage || 0);
            if (percentDiff !== 0) return percentDiff;
            return (b.completedAchievements || 0) - (a.completedAchievements || 0);
        }
        return (b.points || 0) - (a.points || 0);
    });

    // Initialize tracking variables
    let currentRank = 1;
    let previousPoints: number | null = null;
    let skippedRanks = 0;

    // Calculate ranks with proper tie handling
    return sortedEntries.map((entry, index) => {
        const currentPoints = entry.points || 0;
        
        // First entry always gets rank 1
        if (index === 0) {
            previousPoints = currentPoints;
            return { ...entry, rank: 1 };
        }

        // If points are different from previous entry
        if (currentPoints !== previousPoints) {
            currentRank = index + 1;
            skippedRanks = 0;
        } else {
            // For tied scores, keep same rank but track how many we've skipped
            skippedRanks++;
        }

        previousPoints = currentPoints;
        return { ...entry, rank: currentRank };
    });
};
  
  const fetchData = async () => {
    try {
      const [monthlyResponse, yearlyResponse] = await Promise.all([
        fetch('/api/monthly-leaderboard'),
        fetch('/api/yearly-leaderboard')
      ]);
      
      if (!monthlyResponse.ok || !yearlyResponse.ok) throw new Error('Failed to fetch data');
      
      const monthlyData = await monthlyResponse.json();
      const yearlyData = await yearlyResponse.json();
      
      monthlyData.leaderboard = processLeaderboard(monthlyData.leaderboard);
      yearlyData.leaderboard = processLeaderboard(yearlyData.leaderboard);
      
      setMonthlyData(monthlyData);
      setYearlyData(yearlyData);
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
              src={`https://retroachievements.org${monthlyData.gameInfo.ImageIcon}`} 
              alt={monthlyData.gameInfo.Title}
              onError={e => {
                e.currentTarget.src = 'https://retroachievements.org/Images/017657.png';
              }}
            />
            <h2 className="game-title">{monthlyData.gameInfo.Title}</h2>
          </div>

          <div className="challenge-list">
            &gt; This challenge runs from January 1st, 2025 to January 31st, 2025.<br />
            &gt; Hardcore mode must be enabled<br />
            &gt; All achievements are eligible<br />
            &gt; Progress tracked via retroachievements<br />
            &gt; No hacks/save states/cheats allowed<br />
            &gt; Any discrepancies, ties, or edge case situations will be judged case by case and settled upon in the multiplayer game of each combatant's choosing.

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
                    <div>{entry.completedAchievements}/{entry.totalAchievements}</div>
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
