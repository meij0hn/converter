import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(`history:${clientIP}`, RATE_LIMITS.history);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000).toString(),
          }
        }
      );
    }

    // Check authentication
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const { data, error: fetchError } = await supabase
      .from('conversion_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) {
      logger.error('Failed to fetch conversion history:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch conversion history', details: fetchError }, { status: 500 })
    }

    // Transform data to match frontend interface
    const transformedData = data?.map(item => ({
      id: item.id,
      fileName: item.file_name,
      fileSize: item.file_size,
      rowCount: item.row_count,
      columnCount: item.column_count,
      status: item.status,
      errorMessage: item.error_message,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    })) || []

    return NextResponse.json(transformedData)
  } catch (error) {
    logger.error('Failed to fetch conversion history:', error)
    return NextResponse.json({ error: 'Failed to fetch conversion history', details: error }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(`history:${clientIP}`, RATE_LIMITS.history);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000).toString(),
          }
        }
      );
    }

    // Check authentication
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const { error: deleteError } = await supabase
      .from('conversion_history')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      logger.error('Failed to clear conversion history:', deleteError)
      return NextResponse.json({ error: 'Failed to clear conversion history' }, { status: 500 })
    }

    return NextResponse.json({ message: 'History cleared successfully' })
  } catch (error) {
    logger.error('Failed to clear conversion history:', error)
    return NextResponse.json({ error: 'Failed to clear conversion history' }, { status: 500 })
  }
}