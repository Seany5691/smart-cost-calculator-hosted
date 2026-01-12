import { NextRequest, NextResponse } from 'next/server';
import { Item } from '@/lib/types';

export async function GET() {
  try {
    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const items = await databaseHelpers.getHardwareItems();
    return NextResponse.json(items);
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

    // Save to database
    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const savedItems = await databaseHelpers.updateHardwareItems(validatedItems);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Hardware config updated successfully',
      data: savedItems
    });
  } catch (error) {
    console.error('Error writing hardware config to database:', error);
    return NextResponse.json({ error: 'Failed to update hardware config' }, { status: 500 });
  }
} 