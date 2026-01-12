import { NextRequest, NextResponse } from 'next/server';
import { databaseHelpers } from '@/lib/databaseAdapter';
import { User } from '@/lib/types';

export async function GET() {
  try {
    const users = await databaseHelpers.getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error reading users from database:', error);
    return NextResponse.json({ error: 'Failed to read users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user: User = await request.json();
    
    // Validate the data
    if (!user.username || !user.password || !user.name || !user.email) {
      const missingFields = [];
      if (!user.username) missingFields.push('username');
      if (!user.password) missingFields.push('password');
      if (!user.name) missingFields.push('name');
      if (!user.email) missingFields.push('email');
      
      return NextResponse.json({ 
        error: `Missing required user fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }

    // Save to database
    const createdUser = await databaseHelpers.createUser(user);
    
    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      data: createdUser
    });
  } catch (error) {
    console.error('Error creating user in database:', error);
    return NextResponse.json({ 
      error: 'Failed to create user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, updates }: { id: string; updates: Partial<User> } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Update in database
    const updatedUser = await databaseHelpers.updateUser(id, updates);
    
    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user in database:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete from database (soft delete)
    await databaseHelpers.deleteUser(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user from database:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 