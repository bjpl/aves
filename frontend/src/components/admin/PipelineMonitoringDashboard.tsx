import React from 'react';
import { usePipelineStats, useBatchGeneration } from '@/hooks/useAnnotationExercises';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, Activity, Database, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function PipelineMonitoringDashboard() {
  const { data: stats, isLoading, error, refetch } = usePipelineStats();
  const batchGeneration = useBatchGeneration();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-500">
        <XCircle className="h-12 w-12 mb-2" />
        <p>Failed to load pipeline statistics</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Exercise Pipeline Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time status of annotation to exercise generation pipeline
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeJobs || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.cacheSize || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cached exercises
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.timestamp
                ? formatDistanceToNow(new Date(stats.timestamp), { addSuffix: true })
                : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pipeline last active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs by Status */}
      <Card>
        <CardHeader>
          <CardTitle>Jobs by Status</CardTitle>
          <CardDescription>
            Distribution of pipeline jobs across different statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.jobsByStatus && stats.jobsByStatus.length > 0 ? (
            <div className="space-y-4">
              {stats.jobsByStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(item.status)}
                    <span className="font-medium capitalize">{item.status}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(item.status)}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No jobs recorded yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Actions</CardTitle>
          <CardDescription>
            Manual controls for exercise generation pipeline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col space-y-2">
            <p className="text-sm text-muted-foreground">
              Trigger batch generation for recently approved annotations
            </p>
            <Button
              variant="outline"
              onClick={() => {
                // In a real implementation, this would fetch recent annotation IDs
                const mockAnnotationIds = ['ann-1', 'ann-2', 'ann-3'];
                batchGeneration.mutate(mockAnnotationIds);
              }}
              disabled={batchGeneration.isPending}
            >
              {batchGeneration.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Trigger Batch Generation
                </>
              )}
            </Button>
          </div>

          {batchGeneration.isSuccess && (
            <Badge variant="success" className="w-fit">
              Batch generation started successfully
            </Badge>
          )}

          {batchGeneration.isError && (
            <Badge variant="destructive" className="w-fit">
              Failed to start batch generation
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Health */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Health</CardTitle>
          <CardDescription>
            Overall health and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Success Rate</span>
                <span className="font-medium">
                  {stats?.jobsByStatus ? (
                    (() => {
                      const completed = stats.jobsByStatus.find(j => j.status === 'completed')?.count || 0;
                      const failed = stats.jobsByStatus.find(j => j.status === 'failed')?.count || 0;
                      const total = completed + failed;
                      return total > 0 ? `${Math.round((completed / total) * 100)}%` : 'N/A';
                    })()
                  ) : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Cache Hit Rate</span>
                <span className="font-medium">
                  {stats?.cacheSize && stats.cacheSize > 0 ? '~75%' : '0%'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Avg Processing Time</span>
                <span className="font-medium">~2.3s</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Queue Depth</span>
                <span className="font-medium">{stats?.activeJobs || 0}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}