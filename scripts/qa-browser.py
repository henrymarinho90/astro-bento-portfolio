"""Read-only browser QA against the built ROMA preview.
Requires Python websocket-client and a Chromium CDP endpoint (default :9222).
Run: python scripts/qa-browser.py --base http://127.0.0.1:4321
Creates only local evidence in qa-output; uses a disposable browser context.
"""
import argparse, base64, json, time, urllib.request
from pathlib import Path
import websocket

parser=argparse.ArgumentParser()
parser.add_argument('--base',default='http://127.0.0.1:4321')
parser.add_argument('--cdp',default='http://127.0.0.1:9222')
parser.add_argument('--screenshots',action='store_true',help='Optional: captures need an unminimized browser window')
args=parser.parse_args()
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
info=json.load(opener.open(args.cdp+'/json/version',timeout=5))
ws=websocket.create_connection(info['webSocketDebuggerUrl'],timeout=15,suppress_origin=True)
sequence=0; session=None; errors=[]; checks=[]
out=Path('qa-output'); (out/'screenshots').mkdir(parents=True,exist_ok=True)
def call(method,params=None,scoped=True):
 global sequence
 sequence+=1; ident=sequence
 command={'id':ident,'method':method,'params':params or {}}
 if scoped and session: command['sessionId']=session
 ws.send(json.dumps(command))
 while True:
  response=json.loads(ws.recv())
  if response.get('method')=='Runtime.exceptionThrown': errors.append(response['params']['exceptionDetails'])
  if response.get('id')==ident:
   if 'error' in response: raise RuntimeError(response['error'])
   return response.get('result',{})
def evaluate(expression):
 result=call('Runtime.evaluate',{'expression':expression,'returnByValue':True})
 if result.get('exceptionDetails'): raise RuntimeError(result['exceptionDetails'])
 return result.get('result',{}).get('value')
def wait_for(expression,seconds=10):
 deadline=time.monotonic()+seconds
 while time.monotonic()<deadline:
  try:
   value=evaluate(expression)
   if value:return value
  except RuntimeError:pass
  time.sleep(.05)
 raise AssertionError('Browser readiness timed out: '+expression)
def navigate(path):
 call('Page.navigate',{'url':args.base+path})
 wait_for('location.pathname === '+json.dumps(path)+' && document.readyState !== "loading" && !!document.querySelector("h1") && [...document.querySelectorAll("link[rel=stylesheet]")].filter(e=>new URL(e.href).origin===location.origin).every(e=>!!e.sheet)')
 # Existing cross-origin article dashboards can delay window.load indefinitely.
 # Wait for the page's own DOM/styles/fonts, not third-party iframe completion.
 wait_for('!document.fonts || document.fonts.status === "loaded"',seconds=20)
def viewport(width):
 call('Emulation.setDeviceMetricsOverride',{'width':width,'height':900,'deviceScaleFactor':1,'mobile':False})
 # CDP acknowledges emulation before layout settles. RAF can stop entirely
 # when the user's browser window is minimized; use stable real layout probes.
 previous=None; deadline=time.monotonic()+5
 while time.monotonic()<deadline:
  current=evaluate('({width:innerWidth,client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,mobile:matchMedia("(max-width:1023px)").matches})')
  if current and current['width']==width and current==previous: return
  previous=current;time.sleep(.05)
 raise AssertionError('Viewport failed to settle: '+str(width))
def check(label,value):
 checks.append({'check':label,'passed':bool(value)})
 if not value: print('FAIL',label,flush=True)
def measure():return evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll("h1").length,lang:document.documentElement.lang,noindex:document.querySelector("meta[name=robots]")?.content,missingImages:[...document.images].filter(x=>x.complete && !x.naturalWidth).map(x=>x.src)})')
def screenshot(name):
 size=evaluate('({width:innerWidth,height:Math.min(document.documentElement.scrollHeight,6000)})')
 image=call('Page.captureScreenshot',{'format':'png','captureBeyondViewport':True,'clip':{'x':0,'y':0,'width':size['width'],'height':size['height'],'scale':1}})
 (out/'screenshots'/name).write_bytes(base64.b64decode(image['data']))
context=call('Target.createBrowserContext',scoped=False)['browserContextId']
try:
 target=call('Target.createTarget',{'url':'about:blank','browserContextId':context,'background':False},scoped=False)['targetId']
 session=call('Target.attachToTarget',{'targetId':target,'flatten':True},scoped=False)['sessionId']
 call('Page.enable');call('Runtime.enable')
 pages=sorted('/'+str(p.parent.relative_to('dist/client')).replace('\\','/')+'/' for p in Path('dist/client').rglob('index.html') if p.parent.name!='travel')
 for path in pages:
  navigate(path)
  print('Checking',path,flush=True)
  for width in [320,390,768,1024,1280,1920]:
   viewport(width);m=measure()
   check(path+' @'+str(width)+' no horizontal overflow',m['scroll']<=m['width']+1)
   check(path+' @'+str(width)+' one h1',m['h1']==1)
  check(path+' preview is noindex',m['noindex']=='noindex,nofollow')
 print('Rendered',len(pages),'pages at six viewport widths',flush=True)
 navigate('/es/');viewport(390)
 check('no profile photographs',evaluate('document.querySelectorAll("[data-professional] img").length===0'))
 check('no active LinkedIn iframe',evaluate('![...document.querySelectorAll("iframe")].some(x=>/linkedin/i.test(x.src))'))
 evaluate('document.querySelector(".menu-toggle").click()')
 check('mobile opens and locks background',evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")==="true" && document.querySelector("main").inert && document.body.style.overflow==="hidden"'))
 call('Input.dispatchKeyEvent',{'type':'keyDown','key':'Escape','code':'Escape','windowsVirtualKeyCode':27})
 call('Input.dispatchKeyEvent',{'type':'keyUp','key':'Escape','code':'Escape','windowsVirtualKeyCode':27})
 check('Escape closes and returns focus',evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")==="false" && !document.querySelector("main").inert && document.activeElement.matches(".menu-toggle") && document.body.style.overflow!=="hidden"'))
 evaluate('document.querySelector(".menu-toggle").click();const navLink=document.querySelector(".site-navigation a");navLink.addEventListener("click",e=>e.preventDefault(),{once:true});navLink.click()')
 check('navigation closes menu',evaluate('!document.querySelector("main").inert && document.querySelector(".menu-toggle").getAttribute("aria-expanded")==="false"'))
 evaluate('document.querySelector(".menu-toggle").click()');viewport(1280)
 wait_for('document.querySelector(".menu-toggle").getAttribute("aria-expanded")==="false"')
 check('desktop resize releases scroll',evaluate('!document.querySelector("main").inert && document.body.style.overflow!=="hidden"'))
 evaluate('document.querySelector("[data-locale=en]").click()')
 wait_for('location.pathname==="/en/" && document.documentElement.lang==="en"')
 check('manual switch writes preference',evaluate('document.cookie.includes("roma_locale=en")'))
 call('Page.navigate',{'url':args.base+'/'})
 wait_for('location.pathname==="/en/" && document.readyState!=="loading"')
 check('root respects manual preference',evaluate('document.documentElement.lang==="en"'))
 navigate('/es/');check('explicit Spanish URL beats English cookie',evaluate('document.documentElement.lang==="es"'))
 viewport(1440)
 if args.screenshots:screenshot('home-es-desktop.png')
 viewport(390)
 if args.screenshots:screenshot('home-es-mobile.png')
 navigate('/en/blog/');viewport(1440)
 if args.screenshots:screenshot('blog-en-desktop.png')
 navigate('/es/blog/ecommerce-returns-profitability-analytics/');viewport(390)
 if args.screenshots:screenshot('article-es-mobile.png')
 check('article preserves legacy canonical',evaluate('document.querySelector("link[rel=canonical]").href==="https://portfolio.romahomestore.com/project/ecommerce-returns-profitability-analytics/"'))
 check('original article content exists',evaluate('document.querySelector(".prose-content").textContent.trim().length>1500'))
 original=evaluate('document.querySelector(".prose-content").innerHTML')
 fixtures={'long-word':'<p>'+('unbroken'*90)+'</p>','wide-image':'<img src="/roma/assets/social/og-image.png" width="1600" height="900" alt="QA fixture">','wide-table':'<table><tr>'+''.join('<td>Very long column heading</td>' for _ in range(18))+'</tr></table>','code':'<pre><code>'+('abcdef'*100)+'</code></pre>','iframe':'<iframe src="about:blank" width="1200" height="900" title="QA fixture"></iframe>'}
 for label,html in fixtures.items():
  evaluate('document.querySelector(".prose-content").innerHTML='+json.dumps(html))
  m=measure();check('controlled '+label+' fixture stays contained',m['scroll']<=m['width']+1)
 evaluate('document.querySelector(".prose-content").innerHTML='+json.dumps(original))
 check('no uncaught frontend JavaScript errors',not errors)
 report={'base':args.base,'pages':len(pages),'widths':[320,390,768,1024,1280,1920],'checks':checks,'jsErrors':errors,'passed':all(c['passed'] for c in checks),'note':'Only local DOM fixtures; no CMS or production writes. External dashboards are not validated.'}
 (out/'browser-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'passed':report['passed'],'checks':len(checks),'failures':[c for c in checks if not c['passed']],'screenshots':str(out/'screenshots')},ensure_ascii=False),flush=True)
 if not report['passed']:raise SystemExit(1)
finally:
 call('Target.disposeBrowserContext',{'browserContextId':context},scoped=False);ws.close()
