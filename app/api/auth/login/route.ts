import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for login request
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.flatten().fieldErrors,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    // Attempt login
    const authResponse = await login(username, password);

    return NextResponse.json(authResponse, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);

    // Check if it's an authentication error
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_ERROR',
            message: 'Invalid username or password',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred during login',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
