"""Windows isolated headless runner; never touches the user's browser profile."""
import argparse,json,subprocess,sys,tempfile,time,urllib.request
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('--browser',default='C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe')
a=p.parse_args()
out=Path('qa-output');out.mkdir(exist_ok=True)
profile=tempfile.mkdtemp(prefix='roma-headless-')
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
with (out/'headless-browser.log').open('w',encoding='utf-8') as log:
 browser=subprocess.Popen([a.browser,'--headless','--remote-debugging-port=9333','--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-gpu','about:blank'],stdout=log,stderr=log)
 try:
  deadline=time.monotonic()+20
  while True:
   try:
    result=json.load(opener.open('http://127.0.0.1:9333/json/version',timeout=.5));print('READY',result['Browser'],flush=True);break
   except Exception:
    if browser.poll() is not None:raise RuntimeError('Browser exited '+str(browser.returncode)+'; see qa-output/headless-browser.log')
    if time.monotonic()>deadline:raise RuntimeError('No headless CDP endpoint; see qa-output/headless-browser.log')
    time.sleep(.1)
  completed=subprocess.run([sys.executable,'scripts/qa-browser.py','--base','http://127.0.0.1:4321','--cdp','http://127.0.0.1:9333','--screenshots'],timeout=150)
  raise SystemExit(completed.returncode)
 finally:
  if browser.poll() is None:subprocess.run(['taskkill','/PID',str(browser.pid),'/T','/F'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
