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

  // Single resize handler function
  const sendHeight = () => {
    const height = document.documentElement.scrollHeight;
    window.parent.postMessage({
      type: 'resize',
      height
    }, '*');
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
      
      setMonthlyData(monthlyData);
      setYearlyData(yearlyData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Data fetching effect
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Resize effect
  useEffect(() => {
    // Initial resize with delay to ensure content is rendered
    const timeoutId = setTimeout(sendHeight, 100);

    // Window resize listener
    window.addEventListener('resize', sendHeight);

    return () => {
      window.removeEventListener('resize', sendHeight);
      clearTimeout(timeoutId);
    };
  }, [monthlyData, yearlyData, activeTab]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!monthlyData || !yearlyData) return null;

  const currentData = activeTab === 'monthly' ? monthlyData : yearlyData;

  return (
    <div className="bg-[#17254A] min-h-screen">
      <div className="tab-container">
        <div className={`tab ${activeTab === 'monthly' ? 'active' : ''}`}
             onClick={() => setActiveTab('monthly')}>
          Monthly Challenge
        </div>
        <div className={`tab ${activeTab === 'yearly' ? 'active' : ''}`}
             onClick={() => setActiveTab('yearly')}>
          Yearly Rankings
        </div>
      </div>

      {activeTab === 'monthly' && monthlyData.gameInfo && (
        <>
          <div className="game-header">
            <img src={`https://retroachievements.org${monthlyData.gameInfo.ImageIcon}`} 
                 alt={monthlyData.gameInfo.Title}
                 onError={(e) => {
                   e.currentTarget.src = 'https://retroachievements.org/Images/017657.png';
                 }} />
            <h2 className="game-title">{monthlyData.gameInfo.Title}</h2>
          </div>

          <div className="challenge-list mt-4">
            &gt; This challenge runs from January 1st, 2025 to January 31st, 2025.<br />
            &gt; Hardcore mode must be enabled<br />
            &gt; All achievements are eligible<br />
            &gt; Progress tracked via retroachievements<br />
            &gt; No hacks/save states/cheats allowed<br />
            &gt; Any discrepancies, ties, or edge case situations will be judged case by case and settled upon in the multiplayer game of each combatant's choosing.
          </div>
        </>
      )}

      <div>
        {currentData.leaderboard.map((entry, index) => (
          <div key={entry.username} className="leaderboard-entry">
            <div className={`rank ${
              index === 0 ? 'medal-gold' : 
              index === 1 ? 'medal-silver' : 
              index === 2 ? 'medal-bronze' : ''
            }`}>
              #{index + 1}
            </div>
            {index < 3 && <div>{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</div>}
            <img src={entry.profileImage}
                 alt={entry.username}
                 className="profile-image"
                 onError={(e) => {
                   e.currentTarget.src = 'https://retroachievements.org/UserPic/_user.png';
                 }} />
            <div>
              <a href={entry.profileUrl} 
                 target="_blank"
                 rel="noopener noreferrer"
                 className="username">
                {entry.username}
              </a>
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
        ))}
      </div>

      <div className="mt-4 text-gray-400 text-sm text-center">
        Last updated: {new Date(currentData.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default Leaderboard;
