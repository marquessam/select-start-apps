import type { NextApiRequest, NextApiResponse } from 'next';
import { getMongoDb } from '@/utils/mongodb';
import { WithId, Document } from 'mongodb';

interface NominationDoc extends Document {
  _id: string;
  nominations?: {
    [key: string]: Array<{
      game: string;
      platform: string;
      discordUsername: string;
      discordId: string;
    }>;
  };
}

interface StatusDoc extends Document {
  _id: string;
  isOpen: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const db = await getMongoDb();
    
    // Get current period (YYYY-MM format)
    const period = new Date().toISOString().slice(0, 7);
    
    // Fetch nominations document
    const nominationsDoc = await db
      .collection<NominationDoc>('nominations')
      .findOne({ _id: 'nominations' });
    
    // Get nomination status
    const statusDoc = await db
      .collection<StatusDoc>('nominations')
      .findOne({ _id: 'status' });
    
    const currentNominations = nominationsDoc?.nominations?.[period] || [];
    const isOpen = statusDoc?.isOpen || false;

    res.status(200).json({
      nominations: currentNominations,
      isOpen: isOpen,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Nominations API Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
