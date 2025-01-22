import type { NextApiRequest, NextApiResponse } from 'next';
import { getMongoDb } from '@/utils/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const db = await getMongoDb();
    
    // Test each collection we need
    const testResults = {
      challenges: await db.collection('challenges').countDocuments(),
      users: await db.collection('users').countDocuments(),
      userStats: await db.collection('userstats').countDocuments(),
    };

    return res.status(200).json({
      status: 'connected',
      collections: testResults,
      time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to connect to database',
      details: error.message
    });
  }
}
