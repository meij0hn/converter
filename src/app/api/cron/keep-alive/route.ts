
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
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
        console.error('Keep-alive error:', error)
        return NextResponse.json(
            { error: 'Keep-alive failed' },
            { status: 500 }
        )
    }
}
