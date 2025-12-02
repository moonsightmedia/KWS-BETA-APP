import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'loading' | 'success' | 'error';
  message: string;
}

export const DatabaseTest = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const testResults: TestResult[] = [];

    // Test 1: Supabase Client Konfiguration
    testResults.push({
      name: 'Supabase Client',
      status: 'loading',
      message: 'Prüfe Client-Konfiguration...'
    });
    setResults([...testResults]);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      testResults[0] = {
        name: 'Supabase Client',
        status: 'error',
        message: `Umgebungsvariablen fehlen: VITE_SUPABASE_URL=${!!supabaseUrl ? '✅' : '❌'}, VITE_SUPABASE_PUBLISHABLE_KEY=${!!supabaseKey ? '✅' : '❌'}`
      };
    } else {
      testResults[0] = {
        name: 'Supabase Client',
        status: 'success',
        message: `URL: ${supabaseUrl.substring(0, 30)}..., Key: ${supabaseKey.substring(0, 20)}...`
      };
    }
    setResults([...testResults]);

    // Test 2: Sektoren abfragen
    testResults.push({
      name: 'Sektoren lesen',
      status: 'loading',
      message: 'Lade Sektoren...'
    });
    setResults([...testResults]);

    try {
      const { data: sectors, error: sectorsError } = await supabase
        .from('sectors')
        .select('*')
        .limit(5);

      if (sectorsError) {
        testResults[1] = {
          name: 'Sektoren lesen',
          status: 'error',
          message: `Fehler: ${sectorsError.message}`
        };
      } else {
        testResults[1] = {
          name: 'Sektoren lesen',
          status: 'success',
          message: `${sectors?.length || 0} Sektoren gefunden`
        };
      }
    } catch (error) {
      testResults[1] = {
        name: 'Sektoren lesen',
        status: 'error',
        message: `Exception: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      };
    }
    setResults([...testResults]);

    // Test 3: Boulder abfragen
    testResults.push({
      name: 'Boulder lesen',
      status: 'loading',
      message: 'Lade Boulder...'
    });
    setResults([...testResults]);

    try {
      const { data: boulders, error: bouldersError } = await supabase
        .from('boulders')
        .select('*')
        .limit(10);

      if (bouldersError) {
        testResults[2] = {
          name: 'Boulder lesen',
          status: 'error',
          message: `Fehler: ${bouldersError.message}`
        };
      } else {
        testResults[2] = {
          name: 'Boulder lesen',
          status: 'success',
          message: `${boulders?.length || 0} Boulder gefunden`
        };
      }
    } catch (error) {
      testResults[2] = {
        name: 'Boulder lesen',
        status: 'error',
        message: `Exception: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      };
    }
    setResults([...testResults]);

    // Test 4: Auth Session
    testResults.push({
      name: 'Auth Session',
      status: 'loading',
      message: 'Prüfe Auth...'
    });
    setResults([...testResults]);

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (authError) {
        testResults[3] = {
          name: 'Auth Session',
          status: 'error',
          message: `Fehler: ${authError.message}`
        };
      } else {
        testResults[3] = {
          name: 'Auth Session',
          status: 'success',
          message: session ? `Angemeldet als: ${session.user.email}` : 'Nicht angemeldet (OK)'
        };
      }
    } catch (error) {
      testResults[3] = {
        name: 'Auth Session',
        status: 'error',
        message: `Exception: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      };
    }
    setResults([...testResults]);

    setIsRunning(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const allSuccessful = results.every(r => r.status === 'success');
  const hasErrors = results.some(r => r.status === 'error');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datenbank-Verbindungstest</CardTitle>
        <CardDescription>
          Prüft die Verbindung zur Supabase-Datenbank
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {results.length === 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Starte Tests...</span>
          </div>
        )}

        {results.map((result, index) => (
          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
            {getStatusIcon(result.status)}
            <div className="flex-1">
              <p className="font-medium text-sm">{result.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{result.message}</p>
            </div>
          </div>
        ))}

        {results.length > 0 && (
          <>
            {allSuccessful && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Alle Tests erfolgreich!</AlertTitle>
                <AlertDescription>
                  Die Datenbankverbindung funktioniert korrekt.
                </AlertDescription>
              </Alert>
            )}

            {hasErrors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fehler gefunden</AlertTitle>
                <AlertDescription>
                  Einige Tests sind fehlgeschlagen. Bitte prüfe die Konfiguration.
                </AlertDescription>
              </Alert>
            )}

            <button
              onClick={runTests}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? 'Tests laufen...' : 'Tests erneut ausführen'}
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

