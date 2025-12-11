
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
        logger.error('CRON_SECRET environment variable not configured')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { data, error } = await supabase
            .from('conversion_history')
            .select('id')
            .limit(1)

        if (error) {
            throw error
        }

        return NextResponse.json({
            message: 'Keep-alive success',
            timestamp: new Date().toISOString(),
            data
        })
    } catch (error) {
        logger.error('Keep-alive error:', error)
        return NextResponse.json(
            { error: 'Keep-alive failed' },
            { status: 500 }
        )
    }
}
