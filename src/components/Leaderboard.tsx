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

   useEffect(() => {
    function sendHeight() {
      const content = document.getElementById('leaderboard-container');
      if (content) {
        const height = content.getBoundingClientRect().height;
        window.parent.postMessage({
          type: 'resize',
          height: height
        }, '*');
      }
    }

    if (monthlyData || yearlyData) {
      setTimeout(sendHeight, 100);
    }
  }, [monthlyData, yearlyData, activeTab]);
  
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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

   if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!monthlyData || !yearlyData) return null;

  const currentData = activeTab === 'monthly' ? monthlyData : yearlyData;

  return (
    <div id="leaderboard-container" style={{ background: '#17254A', height: 'fit-content' }}>
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

      <div className="p-2 md:p-4">
        {currentData.leaderboard.map((entry, index) => (
          <div key={entry.username} className="leaderboard-entry">
            <div className={`rank ${
              index === 0 ? 'medal-gold' : 
              index === 1 ? 'medal-silver' : 
              index === 2 ? 'medal-bronze' : ''
            }`}>
              #{index + 1}
            </div>
            <img src={entry.profileImage}
                 alt={entry.username}
                 className="profile-image"
                 onError={(e) => {
                   e.currentTarget.src = 'https://retroachievements.org/UserPic/_user.png';
                 }} />
            <div className="flex-grow">
              <a href={entry.profileUrl} 
                 target="_blank"
                 rel="noopener noreferrer"
                 className="username">
                {entry.username}
              </a>
              <div className="flex items-center gap-2">
                {activeTab === 'monthly' ? (
                  <>
                    <span>{entry.completedAchievements}/{entry.totalAchievements}</span>
                    <span>{entry.completionPercentage}%</span>
                  </>
                ) : (
                  <span>{entry.points} points</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-sm text-center text-gray-400 mt-4 pt-4 border-t border-[#2a3a6a]">
        Last updated: {new Date(currentData.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default Leaderboard;
