import { useState, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

const BATCH_GAP_MINUTES = 30;

interface BoulderOperationLog {
  id: string;
  boulder_id: string | null;
  operation_type: 'create' | 'update' | 'delete';
  user_id: string | null;
  boulder_name: string | null;
  boulder_data: any;
  changes: any;
  created_at: string;
  user_email?: string;
  user_display_name?: string | null;
}

interface LogBatch {
  key: string;
  user_id: string | null;
  user_display_name: string;
  operation_type: 'create' | 'update' | 'delete';
  logs: BoulderOperationLog[];
  createdAtMin: Date;
  createdAtMax: Date;
}

export const BoulderOperationLogs = () => {
  const { user, session, loading: authLoading } = useAuth();
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<BoulderOperationLog | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const queriesEnabled = !authLoading && !!user && !!session;

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['boulder-operation-logs', operationFilter],
    enabled: queriesEnabled,
    queryFn: async () => {
      try {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          throw new Error('Supabase URL or API key not found');
        }

        // Get the access token from the session for RLS
        const accessToken = session?.access_token;
        if (!accessToken) {
          throw new Error('No access token available');
        }

        // Build query URL with filters (limit 300 so more operations are visible)
        let queryUrl = `${SUPABASE_URL}/rest/v1/boulder_operation_logs?select=*&order=created_at.desc&limit=300`;
        
        if (operationFilter !== 'all') {
          queryUrl += `&operation_type=eq.${operationFilter}`;
        }

        const response = await window.fetch(queryUrl, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to load logs: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        // Get user profiles (email, first_name, full_name) for display names
        const userIds = [...new Set((data || []).map((log: any) => log.user_id).filter(Boolean))];
        const userEmailsMap: Record<string, string> = {};
        const userDisplayNameMap: Record<string, string> = {};

        if (userIds.length > 0) {
          const profilesUrl = `${SUPABASE_URL}/rest/v1/profiles?select=id,email,first_name,full_name&id=in.(${userIds.map((id: string) => `"${id}"`).join(',')})`;
          const profilesResponse = await window.fetch(profilesUrl, {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });

          if (profilesResponse.ok) {
            const profiles = await profilesResponse.json();
            profiles?.forEach((profile: any) => {
              userEmailsMap[profile.id] = profile.email;
              const first = profile.first_name || (profile.full_name ? String(profile.full_name).split(' ')[0] : null);
              userDisplayNameMap[profile.id] = first || profile.email || 'Unbekannt';
            });
          }
        }

        // Transform logs with user email and display name
        return (data || []).map((log: any) => ({
          ...log,
          user_email: log.user_id ? userEmailsMap[log.user_id] || null : null,
          user_display_name: log.user_id ? userDisplayNameMap[log.user_id] || null : null,
        })) as BoulderOperationLog[];
      } catch (err: any) {
        console.error('[BoulderOperationLogs] Exception in queryFn:', err);
        throw err;
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  const getOperationBadgeVariant = (type: string) => {
    switch (type) {
      case 'create':
        return 'default';
      case 'update':
        return 'secondary';
      case 'delete':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getOperationLabel = (type: string) => {
    switch (type) {
      case 'create':
        return 'Erstellt';
      case 'update':
        return 'Bearbeitet';
      case 'delete':
        return 'Gelöscht';
      default:
        return type;
    }
  };

  // Group logs "am Stück": same user + operation_type, split by time gap > BATCH_GAP_MINUTES
  const batches = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    const sorted = [...logs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const gapMs = BATCH_GAP_MINUTES * 60 * 1000;
    const byGroup = new Map<string, BoulderOperationLog[]>();
    for (const log of sorted) {
      const uid = log.user_id ?? 'unknown';
      const key = `${uid}|${log.operation_type}`;
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(log);
    }
    const result: LogBatch[] = [];
    for (const [, groupLogs] of byGroup) {
      let batch: BoulderOperationLog[] = [];
      let batchStart: Date | null = null;
      let prevAt = 0;
      for (const log of groupLogs) {
        const at = new Date(log.created_at).getTime();
        if (batch.length === 0 || at - prevAt > gapMs) {
          if (batch.length > 0 && batchStart !== null) {
            const createdAtMin = new Date(batch[0].created_at);
            const createdAtMax = new Date(batch[batch.length - 1].created_at);
            const firstLog = batch[0];
            result.push({
              key: `${firstLog.user_id ?? 'unknown'}|${firstLog.operation_type}|${createdAtMin.getTime()}`,
              user_id: firstLog.user_id,
              user_display_name: firstLog.user_display_name ?? firstLog.user_email ?? 'Unbekannt',
              operation_type: firstLog.operation_type,
              logs: [...batch],
              createdAtMin,
              createdAtMax,
            });
          }
          batch = [log];
          batchStart = new Date(log.created_at);
        } else {
          batch.push(log);
        }
        prevAt = at;
      }
      if (batch.length > 0 && batchStart !== null) {
        const firstLog = batch[0];
        result.push({
          key: `${firstLog.user_id ?? 'unknown'}|${firstLog.operation_type}|${batchStart.getTime()}`,
          user_id: firstLog.user_id,
          user_display_name: firstLog.user_display_name ?? firstLog.user_email ?? 'Unbekannt',
          operation_type: firstLog.operation_type,
          logs: [...batch],
          createdAtMin: new Date(batch[0].created_at),
          createdAtMax: new Date(batch[batch.length - 1].created_at),
        });
      }
    }
    result.sort((a, b) => b.createdAtMax.getTime() - a.createdAtMax.getTime());
    return result;
  }, [logs]);

  const formatBatchTimeRange = (min: Date, max: Date) => {
    const sameDay = min.toDateString() === max.toDateString();
    if (sameDay && min.getTime() === max.getTime()) {
      return formatDate(min, 'dd.MM.yyyy HH:mm', { locale: de });
    }
    if (sameDay) {
      return `${formatDate(min, 'dd.MM.yyyy HH:mm', { locale: de })} – ${formatDate(max, 'HH:mm', { locale: de })}`;
    }
    return `${formatDate(min, 'dd.MM.yyyy HH:mm', { locale: de })} – ${formatDate(max, 'dd.MM.yyyy HH:mm', { locale: de })}`;
  };

  if (error) {
    return (
      <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
        <CardContent className="p-8 text-center text-[#E74C3C]">
          Fehler beim Laden der Logs: {error.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="pb-4 px-4 sm:px-6">
        <div className="flex flex-col gap-4">
          <CardTitle className="text-xl font-heading font-bold text-[#13112B]">Boulder-Operationen Logs</CardTitle>
          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="w-full sm:w-48 h-12 rounded-xl border-[#E7F7E9] touch-manipulation">
              <SelectValue>
                {operationFilter === 'all' ? 'Alle Operationen' : getOperationLabel(operationFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#E7F7E9]">
              <SelectItem value="all">Alle Operationen</SelectItem>
              <SelectItem value="create">Erstellt</SelectItem>
              <SelectItem value="update">Bearbeitet</SelectItem>
              <SelectItem value="delete">Gelöscht</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-[#13112B]/50 mt-2">Gruppiert „am Stück“ (max. 30 Min Abstand). Klick auf eine Zeile zeigt die Einzeloperationen; Klick auf eine Operation öffnet die Details.</p>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : batches.length > 0 ? (
          <>
            {/* Desktop: Batch table with expandable rows */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow className="border-b border-[#E7F7E9]">
                    <TableHead className="text-[#13112B] font-medium">Person</TableHead>
                    <TableHead className="text-[#13112B] font-medium">Operation</TableHead>
                    <TableHead className="text-[#13112B] font-medium">Anzahl</TableHead>
                    <TableHead className="text-[#13112B] font-medium">Zeitraum</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => {
                    const isExpanded = expandedGroupKey === batch.key;
                    const count = batch.logs.length;
                    const label = getOperationLabel(batch.operation_type).toLowerCase();
                    const summary = count === 1
                      ? `${batch.user_display_name} hat 1 Boulder ${label}`
                      : `${batch.user_display_name} hat ${count} Boulder ${label}`;
                    return (
                      <Fragment key={batch.key}>
                        <TableRow
                          className={cn(
                            "border-b border-[#E7F7E9] cursor-pointer hover:bg-[#F9FAF9] transition-colors",
                            isExpanded && "bg-[#E7F7E9]/50"
                          )}
                          onClick={() => setExpandedGroupKey(isExpanded ? null : batch.key)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setExpandedGroupKey(isExpanded ? null : batch.key);
                            }
                          }}
                        >
                          <TableCell className="font-medium text-[#13112B]">{batch.user_display_name}</TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                'rounded-xl',
                                batch.operation_type === 'create' && 'bg-[#36B531] text-white',
                                batch.operation_type === 'update' && 'bg-[#E7F7E9] text-[#13112B]',
                                batch.operation_type === 'delete' && 'bg-[#E74C3C] text-white'
                              )}
                            >
                              {getOperationLabel(batch.operation_type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[#13112B]">{count}</TableCell>
                          <TableCell className="text-sm text-[#13112B]/70">
                            {formatBatchTimeRange(batch.createdAtMin, batch.createdAtMax)}
                          </TableCell>
                          <TableCell>
                            <ChevronDown className={cn("h-4 w-4 text-[#13112B]/60 transition-transform", isExpanded && "rotate-180")} />
                          </TableCell>
                        </TableRow>
                        {isExpanded && [...batch.logs]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((log) => (
                          <TableRow
                            key={log.id}
                            className="border-b border-[#E7F7E9] bg-[#F9FAF9]/80 hover:bg-[#E7F7E9]/50 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                              setDialogOpen(true);
                            }}
                          >
                            <TableCell colSpan={2} className="text-sm text-[#13112B] pl-8">
                              {log.boulder_name || (log.boulder_id ? `ID: ${log.boulder_id.substring(0, 8)}...` : '–')}
                            </TableCell>
                            <TableCell className="text-sm text-[#13112B]/60">
                              {formatDate(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                            </TableCell>
                            <TableCell colSpan={2} className="text-xs text-[#13112B]/50">
                              Details öffnen
                            </TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: Batch cards with expand */}
            <div className="md:hidden space-y-3 pb-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
              {batches.map((batch) => {
                const isExpanded = expandedGroupKey === batch.key;
                const count = batch.logs.length;
                const label = getOperationLabel(batch.operation_type).toLowerCase();
                const summary = count === 1
                  ? `hat 1 Boulder ${label}`
                  : `hat ${count} Boulder ${label}`;
                return (
                  <Card key={batch.key} className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <button
                        type="button"
                        className="w-full p-4 text-left flex items-center justify-between gap-3 active:scale-[0.99] transition-transform touch-manipulation"
                        onClick={() => setExpandedGroupKey(isExpanded ? null : batch.key)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#13112B]">
                            {batch.user_display_name} {summary}
                          </p>
                          <p className="text-xs text-[#13112B]/60 mt-1">
                            {formatBatchTimeRange(batch.createdAtMin, batch.createdAtMax)}
                          </p>
                        </div>
                        <Badge
                          className={cn(
                            'rounded-xl flex-shrink-0',
                            batch.operation_type === 'create' && 'bg-[#36B531] text-white',
                            batch.operation_type === 'update' && 'bg-[#E7F7E9] text-[#13112B]',
                            batch.operation_type === 'delete' && 'bg-[#E74C3C] text-white'
                          )}
                        >
                          {getOperationLabel(batch.operation_type)}
                        </Badge>
                        <ChevronDown className={cn("h-5 w-5 text-[#13112B]/60 flex-shrink-0 transition-transform", isExpanded && "rotate-180")} />
                      </button>
                      {isExpanded && (
                        <div className="border-t border-[#E7F7E9] divide-y divide-[#E7F7E9]">
                          {[...batch.logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((log) => (
                            <button
                              key={log.id}
                              type="button"
                              className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-[#E7F7E9]/50 active:bg-[#E7F7E9] touch-manipulation"
                              onClick={() => {
                                setSelectedLog(log);
                                setDialogOpen(true);
                              }}
                            >
                              <span className="font-medium text-sm text-[#13112B] truncate">
                                {log.boulder_name || (log.boulder_id ? `ID: ${log.boulder_id.substring(0, 8)}...` : '–')}
                              </span>
                              <span className="text-xs text-[#13112B]/60 flex-shrink-0">
                                {formatDate(new Date(log.created_at), 'dd.MM. HH:mm', { locale: de })}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-[#13112B]/60">
            Keine Logs gefunden.
          </div>
        )}
      </CardContent>

      {/* Log Detail Dialog: modern, responsive, scrollable */}
      {selectedLog && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[560px] h-[90vh] max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-auto p-0 gap-0 overflow-hidden rounded-2xl border border-[#E7F7E9] shadow-lg flex flex-col">
            <DialogHeader className="shrink-0 px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-[#13112B] tracking-tight">
                Log-Details
              </DialogTitle>
              <DialogDescription className="text-sm text-[#13112B]/70">
                {selectedLog.boulder_name || 'Unbekannter Boulder'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="overflow-y-auto overflow-x-hidden flex-1 px-5 sm:px-6 -webkit-overflow-scrolling-touch">
                <div className="space-y-5 pr-3 pb-10 sm:pb-12">
                {/* Key info: responsive grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="rounded-xl bg-[#13112B]/[0.04] p-3 sm:p-4">
                    <p className="text-xs font-medium text-[#13112B]/55 uppercase tracking-wider mb-1">Zeitpunkt</p>
                    <p className="text-sm font-medium text-[#13112B]">
                      {formatDate(new Date(selectedLog.created_at), 'dd.MM.yyyy, HH:mm:ss', { locale: de })}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#13112B]/[0.04] p-3 sm:p-4">
                    <p className="text-xs font-medium text-[#13112B]/55 uppercase tracking-wider mb-1">Operation</p>
                    <Badge
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        selectedLog.operation_type === 'create' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                        selectedLog.operation_type === 'update' && 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
                        selectedLog.operation_type === 'delete' && 'bg-red-500/15 text-red-700 dark:text-red-400'
                      )}
                    >
                      {getOperationLabel(selectedLog.operation_type)}
                    </Badge>
                  </div>
                  <div className="rounded-xl bg-[#13112B]/[0.04] p-3 sm:p-4 sm:col-span-2">
                    <p className="text-xs font-medium text-[#13112B]/55 uppercase tracking-wider mb-1">Boulder</p>
                    <p className="text-sm font-medium text-[#13112B]">
                      {selectedLog.boulder_name || 'Unbekannt'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#13112B]/[0.04] p-3 sm:p-4 sm:col-span-2">
                    <p className="text-xs font-medium text-[#13112B]/55 uppercase tracking-wider mb-1">Benutzer</p>
                    <p className="text-sm font-medium text-[#13112B] truncate" title={selectedLog.user_email || ''}>
                      {selectedLog.user_email || 'Unbekannt'}
                    </p>
                  </div>
                </div>

                {/* Geänderte Felder: visual diff instead of raw JSON */}
                {selectedLog.operation_type === 'update' && selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                  <div className="rounded-xl border border-[#E7F7E9] bg-[#F9FAF9]/80 overflow-hidden">
                    <p className="text-xs font-semibold text-[#13112B]/70 uppercase tracking-wider px-4 py-3 border-b border-[#E7F7E9]">
                      Geänderte Felder
                    </p>
                    <div className="divide-y divide-[#E7F7E9]">
                      {Object.entries(selectedLog.changes).map(([field, value]: [string, any]) => (
                        <div key={field} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <span className="text-xs font-medium text-[#13112B]/60 shrink-0 capitalize">
                            {field.replace(/_/g, ' ')}:
                          </span>
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                            {value != null && typeof value === 'object' && 'old' in value && 'new' in value ? (
                              <>
                                <span className="text-[#13112B]/70 line-through">{String(value.old ?? '–')}</span>
                                <span className="text-[#13112B]/50">→</span>
                                <span className="font-medium text-[#13112B]">{String(value.new ?? '–')}</span>
                              </>
                            ) : (
                              <span className="font-medium text-[#13112B]">{JSON.stringify(value)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boulder Daten: key fields + collapsible raw JSON */}
                {selectedLog.boulder_data && (
                  <div className="rounded-xl border border-[#E7F7E9] bg-[#F9FAF9]/80 overflow-hidden">
                    <p className="text-xs font-semibold text-[#13112B]/70 uppercase tracking-wider px-4 py-3 border-b border-[#E7F7E9]">
                      Boulder-Daten
                    </p>
                    <div className="px-4 py-3 space-y-2">
                      {['name', 'difficulty', 'color', 'status', 'note', 'sector_id', 'created_at', 'updated_at'].map((key) => {
                        const v = selectedLog.boulder_data[key];
                        if (v === undefined) return null;
                        const label = key.replace(/_/g, ' ');
                        const display = v === null || v === '' ? '–' : key === 'created_at' || key === 'updated_at'
                          ? formatDate(new Date(v), 'dd.MM.yyyy HH:mm', { locale: de })
                          : String(v);
                        return (
                          <div key={key} className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm">
                            <span className="text-[#13112B]/55 shrink-0 capitalize">{label}:</span>
                            <span className="font-medium text-[#13112B] break-all">{display}</span>
                          </div>
                        );
                      })}
                    </div>
                    <Collapsible>
                      <CollapsibleTrigger className="group flex w-full items-center justify-center gap-1 py-2.5 text-xs font-medium text-[#13112B]/60 hover:text-[#13112B]/80 hover:bg-[#E7F7E9]/50 transition-colors data-[state=open]:bg-[#E7F7E9]/50">
                        Rohdaten (JSON)
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ScrollArea className="max-h-48 rounded-b-xl border-t border-[#E7F7E9]">
                          <pre className="p-4 text-xs text-[#13112B]/80 overflow-x-auto font-mono whitespace-pre-wrap break-words">
                            {JSON.stringify(selectedLog.boulder_data, null, 2)}
                          </pre>
                        </ScrollArea>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

