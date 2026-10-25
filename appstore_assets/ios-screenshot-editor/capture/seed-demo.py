"""Seed only the dedicated, disposable marketing simulator; never production data."""
import datetime as dt
import json
import pathlib
import sqlite3
import sys

root = pathlib.Path(sys.argv[1]).resolve()
assert 'C9CE1305-25C9-4895-829E-16301E717588' in str(root), 'Refusing any other simulator'
db = sqlite3.connect(root / 'Documents/SQLite/dosetracker.db')
assert db.execute('PRAGMA user_version').fetchone()[0] == 8
assert db.execute('SELECT COUNT(*) FROM medicines').fetchone()[0] == 0, 'Fresh simulator required'
today = dt.date.today()
start = today - dt.timedelta(days=13)
now = int(dt.datetime.now().timestamp()*1000)
q = 1000000
profiles = [('demo-juniper', 'Juniper Vale', 'You', '#08B8BE'), ('demo-rowan', 'Rowan Vale', 'Partner', '#8B77C8'), ('demo-sage', 'Sage Vale', 'Parent', '#E4A36B')]
for pid, name, rel, color in profiles:
    db.execute('INSERT INTO profiles (id,name,relationship,color,created_at_ms) VALUES (?,?,?,?,?)', (pid,name,rel,color,now))
db.execute("UPDATE profiles SET status='Archived' WHERE id='profile-default'")
db.execute("UPDATE settings SET active_profile_id='demo-juniper',profiles_imported=1")
# Entirely invented product names, not clinical prescriptions or actual people.
meds = [('demo-luma','Luma Tablets','Tablet','20 mg','tablet','Morning routine','After breakfast',24,'#08B8BE',480),('demo-nori','Nori Capsules','Capsule','10 mg','capsule','Daily routine','With lunch',6,'#8B77C8',780),('demo-mira','Mira Tablets','Tablet','5 mg','tablet','Evening routine','After your evening meal',18,'#E4A36B',1260)]
for mid,name,form,strength,unit,purpose,instructions,stock,color,minute in meds:
    db.execute('INSERT INTO medicines (id,name,dosage_form,strength_text,dose_unit,purpose,instructions,notes,color,stock_remaining_q,low_stock_threshold_q,created_at_ms,profile_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',(mid,name,form,strength,unit,purpose,instructions,'Fictional screenshot example',color,stock*q,7*q,now-14*86400000,'demo-juniper'))
    db.execute('INSERT INTO schedules (id,medicine_id,time_local_minute,recurring_pattern,dose_amount_q,created_at_ms,reminder_enabled,history_next_date) VALUES (?,?,?,?,?,?,?,?)',(mid+'-daily',mid,minute,json.dumps({'kind':'daily','startDate':str(start)}),q,now-14*86400000,0,str(today)))
    for offset in range(14):
        day=start+dt.timedelta(days=offset)
        if day==today and minute>=1260: continue
        at=dt.datetime.combine(day,dt.time(minute//60,minute%60))
        ms=int(at.timestamp()*1000)
        skipped=offset==4 and minute==780
        status='Skipped' if skipped else 'Taken'
        db.execute('INSERT INTO history (id,schedule_id,date,scheduled_at_ms,actual_taken_at_ms,status,created_at_ms,stock_deducted_q,dose_snapshot) VALUES (?,?,?,?,?,?,?,?,?)',(f'{mid}-{day}',mid+'-daily',str(day),ms,None if skipped else ms+180000,status,ms+180000,0,None))
db.execute("DELETE FROM profiles WHERE id='profile-default'")
db.commit()
db.close()
manifest=root/'Library/Application Support/com.vericodestudio.dosetracker/RCTAsyncLocalStorage_V1/manifest.json'
state=json.loads(manifest.read_text()) if manifest.exists() else {}
state['@dosetracker/onboarding/v1']=json.dumps({'version':1,'completed':True,'notificationChoice':'skipped','profile':None})
state['@dosetracker/settings/v1']=json.dumps({'theme':'light','remindersEnabled':False,'snoozeMinutes':10,'notificationPrivacy':'show','reminderSound':'default','vibrationEnabled':True,'reminderRinging':False})
manifest.parent.mkdir(parents=True,exist_ok=True)
manifest.write_text(json.dumps(state))
print('Seeded fictional data in marketing simulator only.')
