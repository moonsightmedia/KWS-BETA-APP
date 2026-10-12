import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const repo=path.resolve(__dirname,'..');const fixture=path.join(repo,'test/fixtures/community-safety-hooks.ts');
export default defineConfig({root:repo,plugins:[react()],server:{host:'127.0.0.1',port:4181,strictPort:true},resolve:{alias:[...['hooks/useAuth','lib/communitySafety','lib/displayProfiles','hooks/useNotificationPreferences','lib/notificationRequest','utils/pushNotifications'].map(name=>({find:`@/${name}`,replacement:fixture})),{find:'@/components/DashboardPageLayout',replacement:path.join(repo,'test/fixtures/community-safety-layout.tsx')},{find:'@capacitor/core',replacement:fixture},{find:'@',replacement:path.join(repo,'src')}],dedupe:['react','react-dom']},optimizeDeps:{entries:['test/fixtures/community-safety.html']}});
