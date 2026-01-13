import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { User } from '@/lib/types';

export async function GET() {
  try {
    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const rows = await databaseHelpers.getAllUsers();

    const users: any[] = (rows || []).map((row: any) => ({
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      name: row.name,
      email: row.email,
      isActive: row.is_active,
      requiresPasswordChange: row.requires_password_change,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

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

    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const created = await databaseHelpers.createUser({
      ...user,
      id: user.id || randomUUID(),
    });

    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      data: {
        id: created.id,
        username: created.username,
        password: created.password,
        role: created.role,
        name: created.name,
        email: created.email,
        isActive: created.is_active,
        requiresPasswordChange: created.requires_password_change,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
      }
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

    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const updated = await databaseHelpers.updateUser(id, updates);
    
    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully',
      data: {
        id: updated.id,
        username: updated.username,
        password: updated.password,
        role: updated.role,
        name: updated.name,
        email: updated.email,
        isActive: updated.is_active,
        requiresPasswordChange: updated.requires_password_change,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      }
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

    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const deleted = await databaseHelpers.deleteUser(id);

    if (!deleted) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user from database:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}