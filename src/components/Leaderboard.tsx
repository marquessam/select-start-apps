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
  achievements?: Array<{
    ID: string;
    GameID: string;
    DateEarned: string;
  }>;
  shadowProgress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

interface GameInfo {
  Title: string;
  ImageIcon: string;
  ShadowGameId?: string;
}

interface LeaderboardData {
  gameInfo?: GameInfo;
  leaderboard: LeaderboardEntry[];
  additionalParticipants: string[];
  lastUpdated: string;
}

const processMonthlyRanks = (entries: LeaderboardEntry[]): LeaderboardEntry[] => {
    // Calculate shadow game progress for those with 100% completion
    const processedEntries = entries.map(entry => {
        const monthlyPercentage = entry.completionPercentage || 0;
        let combinedPercentage = monthlyPercentage;
        let shadowProgress = undefined;

        // Only calculate shadow progress if monthly is 100% and we have achievements data
        if (monthlyPercentage === 100 && entry.achievements) {
            const shadowAchievements = entry.achievements.filter(
                a => a.GameID === entry.achievements[0]?.GameID // Using first achievement's GameID for shadow game
            );
            
            if (shadowAchievements.length > 0) {
                const completedShadow = shadowAchievements.filter(
                    a => parseInt(a.DateEarned) > 0
                ).length;
                const totalShadow = shadowAchievements.length;
                const shadowPercentage = (completedShadow / totalShadow) * 100;

                shadowProgress = {
                    completed: completedShadow,
                    total: totalShadow,
                    percentage: shadowPercentage
                };

                // Add shadow percentage to monthly percentage for ranking
                combinedPercentage = monthlyPercentage + shadowPercentage;
            }
        }

        return {
            ...entry,
            shadowProgress,
            combinedPercentage
        };
    });

    // Sort by combined percentage and achievements
    const sortedEntries = [...processedEntries].sort((a, b) => {
        const combinedDiff = (b.combinedPercentage || 0) - (a.combinedPercentage || 0);
        if (combinedDiff !== 0) return combinedDiff;
        return (b.completedAchievements || 0) - (a.completedAchievements || 0);
    });

    // Assign ranks with tie handling
    let currentRank = 1;
    let previousScore = null;

    return sortedEntries.map((entry, index) => {
        const currentScore = `${entry.combinedPercentage}-${entry.completedAchievements}`;

        if (previousScore !== currentScore) {
            currentRank = index + 1;
            previousScore = currentScore;
        }

        return { ...entry, rank: currentRank };
    });
};

const processYearlyRanks = (entries: LeaderboardEntry[]): LeaderboardEntry[] => {
    const sortedEntries = [...entries].sort((a, b) => 
        (b.points || 0) - (a.points || 0)
    );

    let currentRank = 1;
    let previousPoints = null;

    return sortedEntries.map((entry, index) => {
        if (previousPoints !== entry.points) {
            currentRank = index + 1;
            previousPoints = entry.points;
        }
        return { ...entry, rank: currentRank };
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

            monthlyData.leaderboard = processMonthlyRanks(monthlyData.leaderboard);
            yearlyData.leaderboard = processYearlyRanks(yearlyData.leaderboard);

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
                                        {entry.shadowProgress && (
                                            <div className="text-sm text-blue-300">
                                                Shadow Game: {entry.shadowProgress.completed}/{entry.shadowProgress.total} ({entry.shadowProgress.percentage.toFixed(2)}%)
                                            </div>
                                        )}
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
