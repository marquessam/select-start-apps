import React, { useState, useEffect } from 'react';

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

interface LeaderboardData {
  gameInfo: GameInfo;
  leaderboard: LeaderboardEntry[];
  additionalParticipants: string[];
  lastUpdated: string;
}

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState('monthly');
  const [monthlyData, setMonthlyData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/monthly-leaderboard');
      if (!response.ok) throw new Error('Failed to fetch data');
      const data = await response.json();
      setMonthlyData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!monthlyData) return null;

  return (
    <div>
      <h1>January Leaderboards</h1>
      
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

      <div>
        <img src={`https://retroachievements.org${monthlyData.gameInfo.ImageIcon}`} 
             alt={monthlyData.gameInfo.Title}
             style={{ width: '100px', height: '100px' }} />
        <h2>{monthlyData.gameInfo.Title}</h2>
      </div>

      <div>
        This challenge runs from January 1st, 2025 to January 31st, 2025 as part of the gaming community
        Select Start. All players must have hardcore mode turned on for RetroAchievements. Any
        discrepancies, ties, or edge case situations will be judged case by case and settled upon in the
        multiplayer game of each combatant's choosing.
      </div>

      <div>
        {monthlyData.leaderboard.map((entry, index) => (
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
              <div>{entry.completedAchievements}/{entry.totalAchievements}</div>
              <div>{entry.completionPercentage}%</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        Last updated: {new Date(monthlyData.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default Leaderboard;
