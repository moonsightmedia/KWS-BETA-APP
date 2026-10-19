-- This file contains invented fixtures only. Applied solely to the guarded review DB.
INSERT INTO public.colors(id,name,hex,sort_order) VALUES
 ('a0000000-0000-4000-8000-000000000001','Grün','#36B531',1),
 ('a0000000-0000-4000-8000-000000000002','Blau','#2D63B5',2),
 ('a0000000-0000-4000-8000-000000000003','Rot','#C84A40',3)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sector_areas(id,name,slug,sort_order) VALUES
 ('a1000000-0000-4000-8000-000000000001','Demowand','demo-wall',1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sectors(id,name,area_id,subarea_code,sort_order) VALUES
 ('a2000000-0000-4000-8000-000000000001','Demowand A','a1000000-0000-4000-8000-000000000001','A',1),
 ('a2000000-0000-4000-8000-000000000002','Demowand B','a1000000-0000-4000-8000-000000000001','B',2)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.boulders(id,name,sector_id,difficulty,color,note,volume_only) VALUES
 ('a3000000-0000-4000-8000-000000000001','Demo Balance','a2000000-0000-4000-8000-000000000001',3,'Grün','Erfundener Boulder für die Prüfumgebung.',false),
 ('a3000000-0000-4000-8000-000000000002','Demo Kante','a2000000-0000-4000-8000-000000000001',5,'Blau','Erfundener Boulder für die Prüfumgebung.',false),
 ('a3000000-0000-4000-8000-000000000003','Demo Volumen','a2000000-0000-4000-8000-000000000002',4,'Rot','Erfundener Boulder für die Prüfumgebung.',true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.boulder_ticks(user_id,boulder_id,status,is_project,is_favorite,attempt_count)
SELECT '{{customer}}','a3000000-0000-4000-8000-000000000002','attempted',true,true,2
WHERE NOT EXISTS(SELECT 1 FROM public.boulder_ticks WHERE user_id='{{customer}}');
INSERT INTO public.boulder_tracking_sessions(user_id,boulder_id,session_date,result,attempt_count)
SELECT '{{customer}}','a3000000-0000-4000-8000-000000000001',CURRENT_DATE,'top',2
WHERE NOT EXISTS(SELECT 1 FROM public.boulder_tracking_sessions WHERE user_id='{{customer}}');
INSERT INTO public.boulder_comments(user_id,boulder_id,comment,moderation_status)
SELECT '{{other}}','a3000000-0000-4000-8000-000000000001','Erfundener Kommentar für die Moderationsprüfung.','pending'
WHERE NOT EXISTS(SELECT 1 FROM public.boulder_comments WHERE user_id='{{other}}');
INSERT INTO public.feedback(type,title,description,user_id)
SELECT 'feature','Demo-Rückmeldung','Erfundene Rückmeldung für den Verwaltungsbereich.','{{customer}}'
WHERE NOT EXISTS(SELECT 1 FROM public.feedback);
INSERT INTO public.notification_preferences(user_id)
VALUES ('{{customer}}'),('{{setter}}'),('{{admin}}'),('{{other}}') ON CONFLICT DO NOTHING;
INSERT INTO public.notifications(user_id,type,title,message,action_url)
SELECT '{{customer}}','admin_announcement','Willkommen in der Demo','Diese Mitteilung gehört nur zur Prüfumgebung.','/boulders'
WHERE NOT EXISTS(SELECT 1 FROM public.notifications);
INSERT INTO public.sector_schedule(sector_id,scheduled_at,note,created_by)
SELECT 'a2000000-0000-4000-8000-000000000002', now()+interval '7 days','Erfundener Schraubtermin.','{{setter}}'
WHERE NOT EXISTS(SELECT 1 FROM public.sector_schedule);
INSERT INTO public.monitoring_config(singleton) VALUES(true) ON CONFLICT DO NOTHING;
INSERT INTO public.monitoring_live_revision(singleton) VALUES(true) ON CONFLICT DO NOTHING;
