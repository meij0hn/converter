import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      logger.error('Failed to fetch history item:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch history item' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'History item not found' }, { status: 404 })
    }

    // Transform data to match expected format
    const transformedData = {
      id: data.id,
      fileName: data.file_name,
      fileSize: data.file_size,
      rowCount: data.row_count,
      columnCount: data.column_count,
      status: data.status,
      errorMessage: data.error_message,
      jsonData: data.json_data,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    logger.error('Failed to fetch history item:', error)
    return NextResponse.json({ error: 'Failed to fetch history item' }, { status: 500 })
  }
}