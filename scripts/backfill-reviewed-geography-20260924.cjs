// One-time reviewed data correction, not a runtime place-name dictionary.
// Read-only by default. Snapshot + timestamp guards preserve concurrent edits.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const rows = JSON.parse(fs.readFileSync('/private/tmp/egg-geography-review-20260924.json','utf8')).rows;
if (rows.length !== 24) throw Error('Expected the reviewed 24-row snapshot');
// prefix: country, kind, locality, evidence URL, short source quotation.
const reviewed = {
 e71c7097: ['AL','place','Himara','https://akt.gov.al/en/cities/chimera/','Himara is located in southern Albania'],
 f25080f1: ['GE','place','Kutaisi','https://georgia.travel/family-attractions/kutaisi-botanical-garden','Kutaisi Botanical Garden'],
 fb85b1a2: ['IS','place','Ölfus','https://ingolfsskali.is/wp-content/uploads/2024/08/Ingolfsskali-Viking-Restaurant-2025-Info.pdf','Ingólfsskálí Viking Restaurant - Efstaland - 816, Ölfus'],
 '8f51cc54': ['IT','context'],
 '9554ddcc': ['JP','context'],
 '5f1962c8': ['CZ','place','Luková','https://www.lukova-kostel.cz/','Luková – kostel svatého Jiří'],
 '4860f54f': ['GB','place','Llanvihangel Crucorney','https://www.skirridinn.com/','Llanvihangel Crucorney, Abergavenny, NP7 8DH'],
 '928eb5a7': ['FR','place','Narbonne','https://www.lesgrandsbuffets.com/en/press-inquiries','11100 Narbonne'],
 de476216: ['GB','place','London','https://arcadearena.co.uk/london/plan-your-visit/','26 Lambeth High Street, London, SE1 7SJ'],
 e1c32185: ['GB','place','London','https://www.chocolatebarcafe.com/pages/london','Tower Bridge Collective, 1 Horselydown Ln, London SE1 2LJ'],
 ff8a8b10: ['ES','place','Málaga','https://eltinteromalaga.com/contacto/','Avenida Salvador Allende Nº 340, 29017, Málaga'],
 '3dac8c7c': ['FR','place','Paris','https://www.toureiffel.paris/en/explore/top','Paris lies at your feet'],
 '5c991665': ['IT','context'],
 d5633476: ['FR','context','','https://jobs.louisvuitton.com/en/la-maison','in the Jura region of France'],
 '3ee62aab': ['FR','context','','https://jobs.louisvuitton.com/en/la-maison','in the Jura region of France'],
 '054b23aa': ['BR','context'],
 d5cfa38a: ['US','context','','https://www.guinnessworldrecords.com/world-records/first-escalator','Old Iron Pier, Coney Island, New York, USA'],
};
const nonGeographic = new Set(['d494a104','41f72e74','6b7c8bd0','adab524d']);
const unresolved = {
 '89a23d7b':'review_required:Monteliebre website is in Tijuana; original post identity must be matched before correcting the Spain summary',
 c8f1a79c:'review_required:original shop name/address not established',
 '616b658d':'review_required:hotel identity/address not established',
};
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
const sqlValue = value => value === null ? 'null' : Array.isArray(value) ? `ARRAY[${value.map(literal).join(',')}]::text[]` : typeof value === 'number' ? value : literal(value);
const statements = rows.map(row => {
 const prefix=row.id.slice(0,8), item=reviewed[prefix];
 let patch;
 if(item) {
   // Country context labels classify the existing topic subject only; they do not
   // certify the news story or a physical location. Keep that basis explicit.
   const evidence=item[4] || row.title;
   const proof=item[3] ? [{url:item[3],quote:evidence,basis:'official_or_reference_entity_match'}]
     : [{url:row.source_url,quote:evidence,basis:'reviewed_existing_topic_subject_not_location'}];
   patch={countries:[item[0]],regions:[],localities:item[2]?[item[2]]:[],geography_kind:item[1],geography_status:'resolved',geography_version:2,geography_evidence:evidence,geography_sources:JSON.stringify(proof),geography_error:null};
 } else if(nonGeographic.has(prefix)) {
   patch={countries:[],regions:[],localities:[],geography_kind:'none',geography_status:'not_applicable',geography_version:2,geography_evidence:row.title,geography_error:null};
 } else if(unresolved[prefix]) patch={geography_kind:'unknown',geography_status:'unknown',geography_version:2,geography_error:unresolved[prefix]};
 else throw Error('Unreviewed row '+row.id);
 patch.geography_retry_at=null;
 const set=Object.entries(patch).map(([key,value])=>`${key}=${sqlValue(value)}${key==='geography_sources'?'::jsonb':''}`).join(',');
 return `update public.egg_topic_ideas set ${set},updated_at=now() where id=${literal(row.id)}::uuid and updated_at=${literal(row.updated_at)}::timestamptz and geography_status=${literal(row.geography_status)} and cardinality(countries)=0 returning id;`;
});
if(process.argv.includes('--apply')) console.log(execFileSync('npx',['supabase','db','query','--linked','begin;\n'+statements.join('\n')+'\ncommit;','--output','json'],{encoding:'utf8',maxBuffer:1024*1024}));
console.log(JSON.stringify({reviewed:24,add_country:Object.keys(reviewed).length,not_applicable:nonGeographic.size,unconfirmed:Object.keys(unresolved).length,applied:process.argv.includes('--apply')}));
