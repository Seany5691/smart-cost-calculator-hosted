import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/lib/types';

export async function GET() {
  try {
    // Fall back to localStorage since database is not available
    const usersData = localStorage.getItem('users-storage');
    if (!usersData) {
      return NextResponse.json([]);
    }
    const users = JSON.parse(usersData);
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error reading users from localStorage:', error);
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

    // Save to localStorage
    const users = JSON.parse(localStorage.getItem('users-storage') || '[]');
    const updatedUsers = [...users, { ...user, id: user.id || Date.now().toString() }];
    localStorage.setItem('users-storage', JSON.stringify(updatedUsers));
    
    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      data: { ...user, id: user.id || Date.now().toString() }
    });
  } catch (error) {
    console.error('Error creating user in localStorage:', error);
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

    // Update in localStorage
    const users = JSON.parse(localStorage.getItem('users-storage') || '[]');
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    users[userIndex] = { ...users[userIndex], ...updates };
    localStorage.setItem('users-storage', JSON.stringify(users));
    
    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully',
      data: users[userIndex]
    });
  } catch (error) {
    console.error('Error updating user in localStorage:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete from localStorage (soft delete)
    const users = JSON.parse(localStorage.getItem('users-storage') || '[]');
    const filteredUsers = users.filter(u => u.id !== id);
    localStorage.setItem('users-storage', JSON.stringify(filteredUsers));
    
    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user from localStorage:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 