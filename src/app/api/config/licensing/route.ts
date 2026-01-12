import { NextRequest, NextResponse } from 'next/server';
import { Item } from '@/lib/types';

export async function GET() {
  try {
    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const items = await databaseHelpers.getLicensingItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error reading licensing config from database:', error);
    return NextResponse.json({ error: 'Failed to read licensing config' }, { status: 500 });
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
      isActive: true
    }));

    // Save to database
    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const savedItems = await databaseHelpers.updateLicensingItems(validatedItems);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Licensing config updated successfully',
      data: savedItems
    });
  } catch (error) {
    console.error('Error writing licensing config to database:', error);
    return NextResponse.json({ error: 'Failed to update licensing config' }, { status: 500 });
  }
}