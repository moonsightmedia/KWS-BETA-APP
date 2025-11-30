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
      <Card>
        <CardContent className="p-8 text-center text-destructive">
          Fehler beim Laden der Logs: {error.message}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Boulder-Operationen Logs</CardTitle>
          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="w-40">
              <SelectValue>
                {operationFilter === 'all' ? 'Alle Operationen' : getOperationLabel(operationFilter)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
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
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeitpunkt</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Boulder Name</TableHead>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {formatDate(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getOperationBadgeVariant(log.operation_type)}>
                        {getOperationLabel(log.operation_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.boulder_name || (log.boulder_id ? `ID: ${log.boulder_id.substring(0, 8)}...` : '-')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.user_email || 'Unbekannt'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
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
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Keine Logs gefunden.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

