import { NextRequest, NextResponse } from 'next/server';
import { Item } from '@/lib/types';

export async function GET() {
  try {
    // Try to get from database first, then fallback to localStorage
    try {
      const { databaseHelpers } = await import('@/lib/databaseAdapter');
      const items = await databaseHelpers.getHardwareItems();
      return NextResponse.json(items);
    } catch (dbError) {
      console.warn('Database not available, falling back to localStorage:', dbError);
      
      // Fallback to localStorage data
      const defaultHardware: Item[] = [
        {
          id: 'hw-001',
          name: 'Standard Handset',
          cost: 150,
          managerCost: 120,
          userCost: 150,
          quantity: 0,
          isExtension: true,
          displayOrder: 1,
          showOnProposal: true
        },
        {
          id: 'hw-002',
          name: 'Premium Handset',
          cost: 250,
          managerCost: 200,
          userCost: 250,
          quantity: 0,
          isExtension: true,
          displayOrder: 2,
          showOnProposal: true
        },
        {
          id: 'hw-003',
          name: 'Basic Desk Phone',
          cost: 80,
          managerCost: 64,
          userCost: 80,
          quantity: 0,
          isExtension: true,
          displayOrder: 3,
          showOnProposal: true
        }
      ];
      
      return NextResponse.json(defaultHardware);
    }
  } catch (error) {
    console.error('Error reading hardware config:', error);
    return NextResponse.json({ error: 'Failed to read hardware config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const items: Item[] = await request.json();
    
    // Validate the data
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Ensure all items have required fields
    const validatedItems = items.map(item => ({
      ...item,
      quantity: 0, // Reset quantities when saving
      locked: item.locked || false,
      isExtension: item.isExtension || false,
      isActive: true
    }));

    // Try to save to database, fallback to localStorage
    try {
      const { databaseHelpers } = await import('@/lib/databaseAdapter');
      const savedItems = await databaseHelpers.updateHardwareItems(validatedItems);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Hardware config updated successfully',
        data: savedItems
      });
    } catch (dbError) {
      console.warn('Database not available, hardware not saved:', dbError);
      
      return NextResponse.json({ 
        success: false, 
        message: 'Database not available - hardware not saved',
        data: validatedItems
      });
    }
  } catch (error) {
    console.error('Error writing hardware config to database:', error);
    return NextResponse.json({ error: 'Failed to update hardware config' }, { status: 500 });
  }
} 