import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const userId = searchParams.get('userId') || undefined;

    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const result = await databaseHelpers.getActivityLogsPaginated(userId, page, pageSize);

    return NextResponse.json({
      data: result.data || [],
      hasMore: !!result.hasMore,
      totalCount: result.totalCount || 0,
      page: result.page || page,
      pageSize: result.pageSize || pageSize,
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      {
        data: [],
        hasMore: false,
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch activity logs',
      },
      { status: 500 }
    );
  }
}
