#!/usr/bin/env python3
"""Copy storage policy/bucket configuration only, never live storage objects."""
import importlib.util
import json
import os
from pathlib import Path

ROOT=Path('/opt/kws/store-review')
spec=importlib.util.spec_from_file_location('review_seed',str(ROOT/'seed.py'))
seed=importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)
sql=seed.sql


def identifier(value):
    return '"'+value.replace('"','""')+'"'


def literal(value):
    return "'"+value.replace("'","''")+"'"


def main():
    assert os.geteuid()==0 and json.loads((ROOT/'PREPARED.json').read_text())['network_isolated']
    os.umask(0o077)
    policies=json.loads(sql("SELECT coalesce(json_agg(row_to_json(p)), '[]') FROM pg_policies p WHERE schemaname='storage' AND tablename IN ('objects','buckets');",'supabase-db'))
    bucket_names=['beta-videos','sector-images','hall-maps','profile-avatars','feedback-screenshots']
    buckets=json.loads(sql("SELECT coalesce(json_agg(json_build_object('id',id,'name',name,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)),'[]') FROM storage.buckets WHERE id IN ("+','.join(literal(n) for n in bucket_names)+");",'supabase-db'))
    statements=['BEGIN;']
    for p in policies:
        table='storage.'+identifier(p['tablename'])
        name=identifier(p['policyname'])
        roles=','.join('PUBLIC' if r=='public' else identifier(r) for r in p['roles'])
        statement='CREATE POLICY '+name+' ON '+table+' AS '+p['permissive']+' FOR '+p['cmd']+' TO '+roles
        if p['qual']:statement+=' USING ('+p['qual']+')'
        if p['with_check']:statement+=' WITH CHECK ('+p['with_check']+')'
        statements.extend(['DROP POLICY IF EXISTS '+name+' ON '+table+';',statement+';'])
    for b in buckets:
        mimes='NULL' if b['allowed_mime_types'] is None else 'ARRAY['+','.join(literal(m) for m in b['allowed_mime_types'])+']::text[]'
        statements.append('INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES ('+
            ','.join([literal(b['id']),literal(b['name']),'true' if b['public'] else 'false',str(b['file_size_limit']) if b['file_size_limit'] is not None else 'NULL',mimes])+') ON CONFLICT(id) DO NOTHING;')
    statements.append('COMMIT;')
    sql('\n'.join(statements))
    count=int(sql('SELECT count(*) FROM storage.objects;'))
    assert count==0, 'No existing or production files expected'
    proof={'policy_configuration_copied':len(policies),'bucket_configuration_copied':len(buckets),'production_objects_copied':0,'private_only':True}
    (ROOT/'STORAGE-PREPARED.json').write_text(json.dumps(proof)+'\n')
    print(json.dumps(proof))


if __name__=='__main__':main()
