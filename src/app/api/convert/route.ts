import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(`convert:${clientIP}`, RATE_LIMITS.convert);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfterMs: rateLimitResult.retryAfterMs
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000).toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          }
        }
      );
    }

    // Check authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file type
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' }, { status: 400 })
    }

    // Read file buffer
    const buffer = await file.arrayBuffer()

    // Parse Excel file
    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' })
    } catch (error) {
      return NextResponse.json({ error: 'Failed to parse Excel file. Please ensure it\'s a valid Excel file.' }, { status: 400 })
    }

    // Get the first worksheet
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: 'Excel file contains no worksheets' }, { status: 400 })
    }

    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    let jsonData: any[]
    try {
      jsonData = XLSX.utils.sheet_to_json(worksheet)
    } catch (error) {
      return NextResponse.json({ error: 'Failed to convert worksheet to JSON' }, { status: 400 })
    }

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'Worksheet is empty' }, { status: 400 })
    }

    // Get row and column counts
    const rowCount = jsonData.length
    const columnCount = Object.keys(jsonData[0] || {}).length

    // Save to Supabase with user association
    try {
      const { data, error } = await supabase
        .from('conversion_history')
        .insert({
          file_name: file.name,
          file_size: file.size,
          row_count: rowCount,
          column_count: columnCount,
          status: 'success',
          json_data: JSON.stringify(jsonData),
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        logger.error('Supabase error:', error)
        // Try to create user in auth.users if needed
        if (error.code === '23503') {
          // Foreign key violation - user not in auth.users
          logger.log('User not found in auth.users, skipping database save')
        } else {
          throw error
        }
      } else {
        logger.log('✅ Successfully saved to conversion_history:', data)
      }
    } catch (dbError) {
      logger.error('Failed to save to database:', dbError)
      // Continue even if database save fails
    }

    return NextResponse.json({
      data: jsonData,
      rowCount,
      columnCount,
      fileName: file.name
    })

  } catch (error) {
    logger.error('Conversion error:', error)

    // Try to save error to Supabase if we have file info
    try {
      const formData = await request.formData()
      const file = formData.get('file') as File

      if (file) {
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)

        if (user) {
          await supabase
            .from('conversion_history')
            .insert({
              file_name: file.name,
              file_size: file.size,
              row_count: 0,
              column_count: 0,
              status: 'error',
              error_message: error instanceof Error ? error.message : 'Unknown error occurred',
              user_id: user.id
            })
            .select()
            .single()
        }
      }
    } catch (dbError) {
      logger.error('Failed to save error to database:', dbError)
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An unknown error occurred during conversion'
    }, { status: 500 })
  }
}