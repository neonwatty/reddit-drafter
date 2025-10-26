import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Database, Image } from 'lucide-react'
import { checkStorageQuota, db } from '@/lib/storage/db'

export default function StorageStats() {
  const [quota, setQuota] = useState<{
    usage: number
    total: number
    percentage: number
  } | null>(null)
  const [mediaStats, setMediaStats] = useState<{
    count: number
    size: number
  } | null>(null)

  useEffect(() => {
    loadStorageStats()
  }, [])

  const loadStorageStats = async () => {
    try {
      await checkStorageQuota()
      const estimate = await navigator.storage.estimate()

      setQuota({
        usage: estimate.usage || 0,
        total: estimate.quota || 0,
        percentage: ((estimate.usage || 0) / (estimate.quota || 1)) * 100,
      })

      // Get media stats
      const media = await db.media.toArray()
      const totalMediaSize = media.reduce((sum, m) => sum + m.size, 0)
      setMediaStats({
        count: media.length,
        size: totalMediaSize,
      })
    } catch (error) {
      console.error('[StorageStats] Failed to load storage stats:', error)
    }
  }

  if (!quota) return null

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const isWarning = quota.percentage > 80

  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <Database className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Storage Usage</h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {formatBytes(quota.usage)} / {formatBytes(quota.total)}
          </span>
          <span
            className={`font-medium ${
              isWarning ? 'text-destructive' : 'text-muted-foreground'
            }`}
          >
            {quota.percentage.toFixed(1)}%
          </span>
        </div>

        <Progress
          value={quota.percentage}
          className={isWarning ? 'bg-destructive/20' : ''}
        />

        {isWarning && (
          <p className="text-xs text-destructive">
            Storage is running low. Consider deleting old drafts.
          </p>
        )}

        {mediaStats && mediaStats.count > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Image className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Media: {mediaStats.count} {mediaStats.count === 1 ? 'file' : 'files'}
                </span>
              </div>
              <span className="text-muted-foreground">
                {formatBytes(mediaStats.size)}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
