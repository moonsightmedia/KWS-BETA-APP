import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from 'date-fns';
import { de } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

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
}

export const BoulderOperationLogs = () => {
  const [operationFilter, setOperationFilter] = useState<string>('all');

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['boulder-operation-logs', operationFilter],
    queryFn: async () => {
      let query = supabase
        .from('boulder_operation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (operationFilter !== 'all') {
        query = query.eq('operation_type', operationFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user emails separately
      const userIds = [...new Set((data || []).map((log: any) => log.user_id).filter(Boolean))];
      const userEmailsMap: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', userIds);

        profiles?.forEach((profile: any) => {
          userEmailsMap[profile.id] = profile.email;
        });
      }

      // Transform logs with user emails
      return (data || []).map((log: any) => ({
        ...log,
        user_email: log.user_id ? userEmailsMap[log.user_id] || null : null,
      })) as BoulderOperationLog[];
    },
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
    <Card className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
          <CardTitle className="text-xl font-heading font-bold text-[#13112B]">Boulder-Operationen Logs</CardTitle>
          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl border-[#E7F7E9]">
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : logs && logs.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#E7F7E9]">
                    <TableHead className="text-[#13112B] font-medium">Zeitpunkt</TableHead>
                    <TableHead className="text-[#13112B] font-medium">Operation</TableHead>
                    <TableHead className="text-[#13112B] font-medium">Boulder Name</TableHead>
                    <TableHead className="text-[#13112B] font-medium">Benutzer</TableHead>
                    <TableHead className="text-[#13112B] font-medium">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} className="border-b border-[#E7F7E9]">
                      <TableCell className="text-sm text-[#13112B]/60">
                        {formatDate(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={`rounded-xl ${
                            log.operation_type === 'create' ? 'bg-[#36B531] text-white' :
                            log.operation_type === 'update' ? 'bg-[#E7F7E9] text-[#13112B]' :
                            'bg-[#E74C3C] text-white'
                          }`}
                        >
                          {getOperationLabel(log.operation_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-[#13112B]">
                        {log.boulder_name || (log.boulder_id ? `ID: ${log.boulder_id.substring(0, 8)}...` : '-')}
                      </TableCell>
                      <TableCell className="text-sm text-[#13112B]/60">
                        {log.user_email || 'Unbekannt'}
                      </TableCell>
                      <TableCell className="text-xs text-[#13112B]/60 max-w-xs truncate">
                        {log.operation_type === 'update' && log.changes ? (
                          <span title={JSON.stringify(log.changes, null, 2)}>
                            {Object.keys(log.changes).length} Feld(er) geändert
                          </span>
                        ) : log.operation_type === 'delete' ? (
                          'Boulder gelöscht'
                        ) : (
                          'Boulder erstellt'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {logs.map((log) => (
                <Card 
                  key={log.id}
                  className="bg-white border border-[#E7F7E9] rounded-2xl shadow-sm"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base text-[#13112B] mb-1">
                          {log.boulder_name || (log.boulder_id ? `ID: ${log.boulder_id.substring(0, 8)}...` : 'Unbekannter Boulder')}
                        </h3>
                        <div className="text-xs text-[#13112B]/60">
                          {formatDate(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                        </div>
                      </div>
                      <Badge 
                        className={`rounded-xl flex-shrink-0 ${
                          log.operation_type === 'create' ? 'bg-[#36B531] text-white' :
                          log.operation_type === 'update' ? 'bg-[#E7F7E9] text-[#13112B]' :
                          'bg-[#E74C3C] text-white'
                        }`}
                      >
                        {getOperationLabel(log.operation_type)}
                      </Badge>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-[#E7F7E9]">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#13112B]/60">Benutzer:</span>
                        <span className="text-[#13112B] font-medium">{log.user_email || 'Unbekannt'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#13112B]/60">Details:</span>
                        <span className="text-[#13112B] text-xs">
                          {log.operation_type === 'update' && log.changes ? (
                            <span title={JSON.stringify(log.changes, null, 2)}>
                              {Object.keys(log.changes).length} Feld(er) geändert
                            </span>
                          ) : log.operation_type === 'delete' ? (
                            'Boulder gelöscht'
                          ) : (
                            'Boulder erstellt'
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-[#13112B]/60">
            Keine Logs gefunden.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

